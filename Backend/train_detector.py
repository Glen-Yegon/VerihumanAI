import os
import json
import numpy as np
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report

from fastapi_gpt5_backend import extract_detector_features

DATA_PATH = os.getenv("DETECT_DATA_PATH", "detector_data/detector_data.jsonl")
OUT_DIR = os.getenv("DETECT_OUT_DIR", "detector_artifacts")
MODEL_PATH = os.path.join(OUT_DIR, "detector_lr.joblib")
META_PATH = os.path.join(OUT_DIR, "feature_meta.joblib")

MIN_TEXT_CHARS = int(os.getenv("DETECT_MIN_TEXT_CHARS", "80"))
MIN_ROWS = int(os.getenv("DETECT_TRAIN_MIN_ROWS", "4"))
RANDOM_STATE = int(os.getenv("DETECT_RANDOM_STATE", "42"))
TEST_SIZE_DEFAULT = float(os.getenv("DETECT_TEST_SIZE", "0.18"))
MAX_ROWS = int(os.getenv("DETECT_TRAIN_MAX_ROWS", "0"))  # 0 = unlimited


def load_jsonl(path: str):
    texts, labels = [], []

    total_rows = 0
    dropped_short = 0
    dropped_bad_label = 0
    dropped_parse = 0

    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue

            total_rows += 1

            try:
                row = json.loads(line)
                text = (row.get("text") or "").strip()
                label = int(row.get("label"))

                if len(text) < MIN_TEXT_CHARS:
                    dropped_short += 1
                    continue

                if label not in (0, 1):
                    dropped_bad_label += 1
                    continue

                texts.append(text)
                labels.append(label)

            except Exception as e:
                dropped_parse += 1
                print(f"Skipping bad line {line_no}: {e}")

    print("====================================")
    print("Load summary")
    print(f"Raw rows read       : {total_rows}")
    print(f"Kept rows           : {len(texts)}")
    print(f"Dropped short rows  : {dropped_short}")
    print(f"Dropped bad labels  : {dropped_bad_label}")
    print(f"Dropped parse rows  : {dropped_parse}")
    print("====================================")

    return texts, labels


def choose_test_size(n_rows: int) -> float:
    if n_rows < 8:
        return 0.25
    if n_rows < 20:
        return 0.2
    return TEST_SIZE_DEFAULT


def can_stratify(labels: np.ndarray) -> bool:
    unique, counts = np.unique(labels, return_counts=True)
    if len(unique) < 2:
        return False
    return np.min(counts) >= 2


def rebalance_dataset(texts, labels):
    human = [(t, l) for t, l in zip(texts, labels) if l == 0]
    ai = [(t, l) for t, l in zip(texts, labels) if l == 1]

    limit = min(len(human), len(ai))
    if limit == 0:
        return [], []

    human = human[:limit]
    ai = ai[:limit]

    merged = human + ai
    rng = np.random.default_rng(RANDOM_STATE)
    rng.shuffle(merged)

    texts_bal = [t for t, _ in merged]
    labels_bal = [l for _, l in merged]

    print("====================================")
    print("Post-filter balancing")
    print(f"Human kept: {len(human)}")
    print(f"AI kept   : {len(ai)}")
    print(f"Total used: {len(labels_bal)}")
    print("====================================")

    return texts_bal, labels_bal


def main():
    if not os.path.exists(DATA_PATH):
        raise SystemExit(
            f"Missing {DATA_PATH}. Put it in the correct folder "
            f"or set DETECT_DATA_PATH."
        )

    texts, labels = load_jsonl(DATA_PATH)

    if len(texts) < MIN_ROWS:
        raise SystemExit(
            f"Not enough training data: {len(texts)} rows.\n"
            f"Need at least {MIN_ROWS} rows.\n"
            f"Tip: for real training, use 1000+ per class."
        )

    if MAX_ROWS and len(texts) > MAX_ROWS:
        texts = texts[:MAX_ROWS]
        labels = labels[:MAX_ROWS]

    texts, labels = rebalance_dataset(texts, labels)

    if len(texts) < MIN_ROWS:
        raise SystemExit("Not enough usable rows after balancing.")

    labels = np.array(labels, dtype=np.int32)

    unique_labels = set(labels.tolist())
    if len(unique_labels) < 2:
        raise SystemExit(
            f"Need BOTH classes in dataset (label 0 and label 1). Found only: {sorted(unique_labels)}"
        )

    os.makedirs(OUT_DIR, exist_ok=True)

    print("Extracting features...")
    feat_dicts = [extract_detector_features(t) for t in texts]
    feature_order = sorted(feat_dicts[0].keys())

    X = np.array(
        [[fd.get(k, 0.0) for k in feature_order] for fd in feat_dicts],
        dtype=np.float32
    )
    y = labels

    test_size = choose_test_size(len(y))
    stratify = y if can_stratify(y) and len(y) >= 10 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=RANDOM_STATE,
        stratify=stratify
    )

    model = LogisticRegression(
        max_iter=6000,
        n_jobs=1,
        class_weight="balanced"
    )
    model.fit(X_train, y_train)

    p = model.predict_proba(X_test)[:, 1]

    auc = None
    if len(set(y_test.tolist())) == 2:
        auc = roc_auc_score(y_test, p)

    print("====================================")
    print("Detector Training Results")
    print(f"Total rows used: {len(y)}")
    print(f"Train rows     : {len(y_train)}")
    print(f"Test rows      : {len(y_test)}")
    print(f"Human rows     : {int(np.sum(y == 0))}")
    print(f"AI rows        : {int(np.sum(y == 1))}")
    if len(y) < 200:
        print("⚠️ WARNING: Very small dataset — metrics may be unstable.")
    if auc is not None:
        print("AUC:", round(float(auc), 4))
    else:
        print("AUC: skipped — test split missing a class.")
    print("====================================")

    try:
        print(classification_report(y_test, (p >= 0.5).astype(int), digits=4))
    except Exception:
        print("classification_report skipped.")

    joblib.dump(model, MODEL_PATH)
    joblib.dump({
        "feature_order": feature_order,
        "min_text_chars": MIN_TEXT_CHARS,
        "total_rows_used": int(len(y)),
        "human_rows": int(np.sum(y == 0)),
        "ai_rows": int(np.sum(y == 1)),
    }, META_PATH)

    print("====================================")
    print("Saved model artifacts:")
    print(" -", MODEL_PATH)
    print(" -", META_PATH)
    print("====================================")


if __name__ == "__main__":
    main()