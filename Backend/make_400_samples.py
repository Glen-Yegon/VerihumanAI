import json
import random
import re
from openai import OpenAI
import os
from dotenv import load_dotenv
load_dotenv()

# ---------- CONFIG ----------
OUT_PATH = "detector_data.jsonl"
SEED = 42

N_HUMAN = 200
N_AI = 200

MIN_WORDS = 90
MAX_WORDS = 220

OPENAI_MODEL_AI = "gpt-4o-mini"

random.seed(SEED)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------- HELPERS ----------
def words_count(t: str) -> int:
    return len(re.findall(r"\S+", t.strip()))

def clamp_words(text: str, min_w: int, max_w: int) -> str:
    words = re.findall(r"\S+", text.strip())
    if len(words) < min_w:
        pad = [
            "I’m trying to keep it simple, but I might be missing something small.",
            "Anyway, that’s the main point I wanted to capture here.",
            "If this sounds off, I’ll adjust it after feedback.",
            "I’m not totally sure, but this is what I observed from the steps.",
        ]
        while len(words) < min_w:
            words += random.choice(pad).split()
    if len(words) > max_w:
        words = words[:max_w]
    return " ".join(words)

def lightly_humanize(text: str) -> str:
    # small imperfections, not too much
    if random.random() < 0.22:
        text = text.replace(" because ", " coz ", 1) if " because " in text else text
    if random.random() < 0.18:
        text = text.replace(" about ", " abt ", 1) if " about " in text else text
    if random.random() < 0.12:
        text = text.replace("and", "&", 1)
    return text

# ---------- TOPIC POOLS (DIVERSITY) ----------
FIELDS = [
    "education (student reflection, studying, assignments)",
    "research (methods, results, limitations)",
    "business (strategy, operations, KPIs, memo)",
    "customer support (refunds, troubleshooting, response)",
    "marketplace listings (selling, buying, negotiation)",
    "tech (networking, apps, bugs, configs)",
    "health (non-medical: wellbeing routines, sleep, stress)",
    "finance (non-advice: budgeting, saving habits)",
    "general knowledge (explanations, how-to)",
    "career (CV, interviews, internships)",
]

HUMAN_PROMPT = """Write a HUMAN-written text (90-220 words) in a natural voice.
Requirements:
- Sound like a real person with uneven rhythm and small details.
- Include at least one concrete detail (time, place, number, small mistake, specific object).
- Avoid sounding like a formal report.
Field: {field}
"""

AI_PROMPT = """Write an AI-like text (90-220 words) that sounds structured and polished.
Requirements:
- Clear topic sentence, organized flow, neutral tone.
- Include generic recommendations or conclusions.
- Avoid personal anecdotes.
Field: {field}
"""

def generate_text(prompt: str) -> str:
    resp = client.responses.create(
        model=OPENAI_MODEL_AI,
        input=prompt,
        temperature=0.9,
        max_output_tokens=450,
    )
    text = (resp.output_text or "").strip()
    return text

def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY not set in environment/.env")

    rows = []

    # 200 HUMAN-like (label 0)
    for _ in range(N_HUMAN):
        field = random.choice(FIELDS)
        t = generate_text(HUMAN_PROMPT.format(field=field))
        t = clamp_words(t, MIN_WORDS, MAX_WORDS)
        t = lightly_humanize(t)
        rows.append({"text": t, "label": 0})

    # 200 AI-like (label 1)
    for _ in range(N_AI):
        field = random.choice(FIELDS)
        t = generate_text(AI_PROMPT.format(field=field))
        t = clamp_words(t, MIN_WORDS, MAX_WORDS)
        rows.append({"text": t, "label": 1})

    random.shuffle(rows)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"Wrote {len(rows)} samples to {OUT_PATH}")

if __name__ == "__main__":
    main()