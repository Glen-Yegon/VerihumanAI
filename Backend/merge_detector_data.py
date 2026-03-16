import json
import random

HUMAN_FILE = "detector_data/human_output.jsonl"
AI_FILE = "detector_data/ai_output.jsonl"
OUT_FILE = "detector_data/detector_data.jsonl"

SHUFFLE = True
BALANCE_TO_SMALLER_CLASS = True

def read_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                text = (row.get("text") or "").strip()
                label = row.get("label")
                if text and label in (0, 1):
                    rows.append({"text": text, "label": int(label)})
            except Exception as e:
                print(f"Skipping bad line {line_no} in {path}: {e}")
    return rows

def main():
    human = read_jsonl(HUMAN_FILE)
    ai = read_jsonl(AI_FILE)

    print(f"Human rows before balancing: {len(human)}")
    print(f"AI rows before balancing   : {len(ai)}")

    if BALANCE_TO_SMALLER_CLASS:
        limit = min(len(human), len(ai))
        human = human[:limit]
        ai = ai[:limit]
        print(f"Balanced to {limit} rows per class.")

    rows = human + ai

    if SHUFFLE:
        random.seed(42)
        random.shuffle(rows)

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print("====================================")
    print("Merged detector dataset")
    print("Human rows:", len(human))
    print("AI rows   :", len(ai))
    print("Total rows:", len(rows))
    print("Output    :", OUT_FILE)
    print("====================================")

if __name__ == "__main__":
    main()