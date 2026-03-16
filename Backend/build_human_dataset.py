import os
import re
import csv
import json
import sys
import glob
import hashlib
from typing import Iterator, Optional

max_int = sys.maxsize
while True:
    try:
        csv.field_size_limit(max_int)
        break
    except OverflowError:
        max_int = max_int // 10

# =========================
# CONFIG
# =========================
INPUT_PATHS = [
    "detector_data/raw_human/*.csv",
    "detector_data/raw_human/*.jsonl",
    "detector_data/raw_human/*.txt",
]

OUTPUT_FILE = "detector_data/human_output.jsonl"
LABEL = 0

# Match your trainer
MIN_CHARS = 80
MAX_CHARS = 2500

# Preferred chunk size for detector samples
TARGET_MIN_CHARS = 80
TARGET_MAX_CHARS = 850

# 0 = unlimited
MAX_OUTPUT_ROWS = 0

TEXT_FIELD_CANDIDATES = [
    "text", "Text", "content", "body", "article", "Article",
    "sentence", "Sentence", "passage", "Passage",
    "paragraph", "Paragraph", "review", "message", "description",
    "story", "Story", "document", "Document"
]

BAD_ENDINGS = (
    "Dr.", "Mr.", "Mrs.", "Ms.", "Prof.", "St.", "vs.", "etc."
)

BAD_PATTERNS = [
    r"https?://",
    r"www\.",
    r"\b(?:References|External links|See also)\b",
    r"^\W*$",
    r"^[\d\W_]+$",
    r"\b(?:Published:|Updated:|Reporter|Daily Mail Reporter|Mail On Sunday Reporter)\b",
    r"\b(?:EST|GMT)\b",
    r"\|\s*\.",
    r"\bclick here\b",
    r"\bshare this article\b",
    r"\badvertisement\b",
    r"\bphoto(?:graphed)? by\b",
]

# =========================
# CLEANING HELPERS
# =========================

def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()

def remove_markup(text: str) -> str:
    text = re.sub(r"<ref[^>]*>.*?</ref>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]*\]", " ", text)
    text = re.sub(r"\{\{[^}]*\}\}", " ", text)
    text = re.sub(r"&nbsp;", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"&amp;", "&", text, flags=re.IGNORECASE)
    return text

def clean_text(text: str) -> str:
    text = str(text)
    text = remove_markup(text)
    text = text.replace("\u00a0", " ")
    text = text.replace("\\n", " ")
    text = text.replace("\n", " ")
    text = normalize_whitespace(text)
    return text

def sentence_split(text: str):
    # Split on whitespace that follows sentence-ending punctuation,
    # optionally followed by a closing quote.
    return re.split(r'(?<=[.!?])(?:["”’\']\s+|\s+)(?=[A-Z0-9"\'])', text)

def has_heavy_repetition(text: str) -> bool:
    sents = [normalize_whitespace(s).lower() for s in sentence_split(text) if s.strip()]
    sents = [s for s in sents if len(s) >= 20]
    if len(sents) < 2:
        return False
    unique_ratio = len(set(sents)) / len(sents)
    return unique_ratio < 0.75

def looks_like_caption(text: str) -> bool:
    # Caption / layout debris often has many short clauses or strange " . " separators
    if text.count(" .") >= 3:
        return True
    if re.search(r"\bpictured\b", text, flags=re.IGNORECASE):
        return True
    if re.search(r"\bshown\b", text, flags=re.IGNORECASE):
        return True
    if re.search(r"\bstands\b.*\babove\b", text, flags=re.IGNORECASE) and len(text) < 300:
        return True
    return False

def looks_truncated(text: str) -> bool:
    if not text:
        return True
    if text.endswith(BAD_ENDINGS):
        return True
    if text[-1] not in '.!?"”’\'':
        return True
    if re.search(r'\b(?:said|told|according to|reported|because|while|when)\s*$', text, flags=re.IGNORECASE):
        return True
    return False

def looks_like_bad_text(text: str) -> bool:
    if not text:
        return True

    if len(text) < MIN_CHARS:
        return True

    if len(text) > MAX_CHARS:
        return True

    alpha = sum(c.isalpha() for c in text)
    if alpha < max(30, len(text) * 0.45):
        return True

    for p in BAD_PATTERNS:
        if re.search(p, text, flags=re.IGNORECASE):
            return True

    if looks_like_caption(text):
        return True

    if looks_truncated(text):
        return True

    if has_heavy_repetition(text):
        return True

    # Too quote-heavy can be messy for training
    quote_chars = text.count('"') + text.count("“") + text.count("”") + text.count("'")
    if quote_chars > max(12, len(text) * 0.08):
        return True

    # Avoid overly short 1-2 sentence fragments that are likely captions or snippets
    sent_count = len([s for s in sentence_split(text) if s.strip()])
    if sent_count < 2 and len(text) < 120:
        return True

    return False

def pack_sentences_into_passages(text: str) -> Iterator[str]:
    """
    Turn raw text into cleaner detector-friendly passages.
    Only keeps complete sentences and groups them into natural chunks.
    """
    sents = [normalize_whitespace(s) for s in sentence_split(text)]
    sents = [
        s for s in sents
        if len(s) >= 35
        and s[-1] in ".!?\"”’'"
        and not looks_like_bad_text(s)
    ]

    buf = []
    buf_len = 0

    for s in sents:
        proposed_len = buf_len + len(s) + (1 if buf else 0)

        if proposed_len <= TARGET_MAX_CHARS:
            buf.append(s)
            buf_len = proposed_len
        else:
            if buf:
                chunk = " ".join(buf).strip()
                if len(chunk) >= TARGET_MIN_CHARS and not looks_like_bad_text(chunk):
                    yield chunk
            buf = [s]
            buf_len = len(s)

    if buf:
        chunk = " ".join(buf).strip()
        if len(chunk) >= TARGET_MIN_CHARS and not looks_like_bad_text(chunk):
            yield chunk

def fingerprint(text: str) -> str:
    return hashlib.sha1(text.lower().encode("utf-8", errors="ignore")).hexdigest()

# =========================
# FILE READERS
# =========================

def detect_text_field(row: dict) -> Optional[str]:
    for key in TEXT_FIELD_CANDIDATES:
        if key in row and row[key]:
            return key

    best_key = None
    best_len = 0
    for k, v in row.items():
        if isinstance(v, str):
            lv = len(v.strip())
            if lv > best_len:
                best_len = lv
                best_key = k
    return best_key

def iter_csv_texts(path: str) -> Iterator[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore", newline="") as f:
            reader = csv.DictReader(f)

            try:
                for row_no, row in enumerate(reader, start=1):
                    try:
                        if not row:
                            continue
                        key = detect_text_field(row)
                        if key:
                            val = row.get(key, "")
                            if isinstance(val, str) and val.strip():
                                yield val
                    except Exception as e:
                        print(f"Skipping bad CSV row {row_no} in {path}: {e}")
                        continue

            except csv.Error as e:
                print(f"Skipping rest of CSV file {path} due to parser error: {e}")
                return

    except Exception as e:
        print(f"Could not open/read CSV file {path}: {e}")
        return

def iter_jsonl_texts(path: str) -> Iterator[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line_no, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except Exception:
                    continue

                if isinstance(row, dict):
                    key = detect_text_field(row)
                    if key:
                        val = row.get(key, "")
                        if isinstance(val, str) and val.strip():
                            yield val
    except Exception as e:
        print(f"Could not open/read JSONL file {path}: {e}")
        return

def iter_txt_texts(path: str) -> Iterator[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            buf = []
            for line in f:
                if line.strip():
                    buf.append(line.rstrip("\n"))
                else:
                    if buf:
                        yield " ".join(buf)
                        buf = []
            if buf:
                yield " ".join(buf)
    except Exception as e:
        print(f"Could not open/read TXT file {path}: {e}")
        return

def iter_texts_from_file(path: str) -> Iterator[str]:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        yield from iter_csv_texts(path)
    elif ext == ".jsonl":
        yield from iter_jsonl_texts(path)
    elif ext == ".txt":
        yield from iter_txt_texts(path)
    else:
        return

# =========================
# MAIN
# =========================

def resolve_input_files():
    files = []
    for p in INPUT_PATHS:
        matches = glob.glob(p)
        if matches:
            files.extend(matches)
        elif os.path.isfile(p):
            files.append(p)

    seen = set()
    out = []
    for f in files:
        if f not in seen:
            out.append(f)
            seen.add(f)
    return out

def main():
    files = resolve_input_files()
    if not files:
        raise SystemExit("No input files found. Update INPUT_PATHS first.")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    seen_hashes = set()
    written = 0
    scanned_docs = 0

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        for path in files:
            print(f"\n[READING] {path}")
            file_written_before = written
            file_scanned_before = scanned_docs

            try:
                for raw_text in iter_texts_from_file(path):
                    scanned_docs += 1
                    text = clean_text(raw_text)

                    if looks_like_bad_text(text):
                        continue


                    for passage in pack_sentences_into_passages(text):
                        h = fingerprint(passage)
                        if h in seen_hashes:
                            continue
                        seen_hashes.add(h)

                        row = {"text": passage, "label": LABEL}
                        out.write(json.dumps(row, ensure_ascii=False) + "\n")
                        written += 1

                        if written % 500 == 0:
                            print(f"  written: {written}")

                        if MAX_OUTPUT_ROWS and written >= MAX_OUTPUT_ROWS:
                            print(f"\nDone. Reached MAX_OUTPUT_ROWS={MAX_OUTPUT_ROWS}")
                            print(f"Scanned docs: {scanned_docs}")
                            print(f"Wrote rows : {written}")
                            print(f"Output     : {OUTPUT_FILE}")
                            return

            except Exception as e:
                print(f"Skipping file {path} due to unexpected error: {e}")
                continue

            file_scanned = scanned_docs - file_scanned_before
            file_written = written - file_written_before
            print(f"  scanned from file: {file_scanned}")
            print(f"  kept from file   : {file_written}")

    print("\n====================================")
    print("Human extraction complete")
    print("Scanned docs:", scanned_docs)
    print("Wrote rows :", written)
    print("Output     :", OUTPUT_FILE)
    print("====================================")

if __name__ == "__main__":
    main()