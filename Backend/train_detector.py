import os
import json
import numpy as np
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report

# IMPORTANT:
# This imports your feature extractor from your backend file.
from fastapi_gpt5_backend import extract_detector_features

DATA_PATH = os.getenv("DETECT_DATA_PATH", "detector_data.jsonl")
OUT_DIR = os.getenv("DETECT_OUT_DIR", "detector_artifacts")
MODEL_PATH = os.path.join(OUT_DIR, "detector_lr.joblib")
META_PATH = os.path.join(OUT_DIR, "feature_meta.joblib")

MIN_TEXT_CHARS = int(os.getenv("DETECT_MIN_TEXT_CHARS", "80"))

# ✅ Works with very small data, but warns you.
MIN_ROWS = int(os.getenv("DETECT_TRAIN_MIN_ROWS", "4"))

RANDOM_STATE = int(os.getenv("DETECT_RANDOM_STATE", "42"))

# For big datasets you can keep 0.18; for small datasets we’ll auto-adjust.
TEST_SIZE_DEFAULT = float(os.getenv("DETECT_TEST_SIZE", "0.18"))

# Optional cap if you ever want to limit training size (default: no cap)
MAX_ROWS = int(os.getenv("DETECT_TRAIN_MAX_ROWS", "0"))  # 0 = unlimited


def load_jsonl(path: str):
    texts, labels = [], []

    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue

            try:
                row = json.loads(line)
                text = (row.get("text") or "").strip()
                label = int(row.get("label"))

                if len(text) < MIN_TEXT_CHARS:
                    continue
                if label not in (0, 1):
                    continue

                texts.append(text)
                labels.append(label)

            except Exception as e:
                print(f"Skipping bad line {line_no}: {e}")

    return texts, labels


def choose_test_size(n_rows: int) -> float:
    """
    Pick a test_size that:
    - Leaves at least a couple samples in test for tiny datasets
    - Approaches TEST_SIZE_DEFAULT for larger datasets
    """
    if n_rows < 8:
        # 4-7 rows -> 1-2 test rows
        return 0.25
    if n_rows < 20:
        return 0.2
    return TEST_SIZE_DEFAULT


def can_stratify(labels: np.ndarray) -> bool:
    """
    Stratify only if each class has enough examples to split.
    """
    unique, counts = np.unique(labels, return_counts=True)
    if len(unique) < 2:
        return False
    # Each class must have at least 2 samples to be split safely
    return np.min(counts) >= 2


def main():
    if not os.path.exists(DATA_PATH):
        raise SystemExit(
            f"Missing {DATA_PATH}. Put it in the same folder as train_detector.py "
            f"or set DETECT_DATA_PATH."
        )

    texts, labels = load_jsonl(DATA_PATH)

    if len(texts) < MIN_ROWS:
        raise SystemExit(
            f"Not enough training data: {len(texts)} rows.\n"
            f"Need at least {MIN_ROWS} rows.\n"
            f"Tip: For real training, set DETECT_TRAIN_MIN_ROWS=400+ and use 1000+ per class."
        )

    # ✅ Allow training on "as many as possible"
    if MAX_ROWS and len(texts) > MAX_ROWS:
        texts = texts[:MAX_ROWS]
        labels = labels[:MAX_ROWS]

    labels = np.array(labels, dtype=np.int32)

    # Ensure both classes exist
    unique_labels = set(labels.tolist())
    if len(unique_labels) < 2:
        raise SystemExit(
            f"Need BOTH classes in dataset (label 0 and label 1). Found only: {sorted(unique_labels)}"
        )

    os.makedirs(OUT_DIR, exist_ok=True)

    # Feature extraction (unlimited size)
    feat_dicts = [extract_detector_features(t) for t in texts]
    feature_order = sorted(feat_dicts[0].keys())

    X = np.array(
        [[fd.get(k, 0.0) for k in feature_order] for fd in feat_dicts],
        dtype=np.float32
    )
    y = labels

    # Split choices for small vs large datasets
    test_size = choose_test_size(len(y))
    stratify = y if can_stratify(y) and len(y) >= 10 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=RANDOM_STATE,
        stratify=stratify
    )

    # Train
    model = LogisticRegression(
        max_iter=6000,
        n_jobs=1,
        class_weight="balanced"
    )
    model.fit(X_train, y_train)

    # Evaluate
    p = model.predict_proba(X_test)[:, 1]

    auc = None
    if len(set(y_test.tolist())) == 2:
        auc = roc_auc_score(y_test, p)

    print("====================================")
    print("Detector Training Results")
    print(f"Total rows used: {len(y)}  |  Train: {len(y_train)}  Test: {len(y_test)}")
    if len(y) < 200:
        print("⚠️  WARNING: Very small dataset — accuracy/AUC will be unstable and likely misleading.")
    if auc is not None:
        print("AUC:", round(float(auc), 4))
    else:
        print("AUC: (skipped — test split missing a class)")
    print("====================================")

    try:
        print(classification_report(y_test, (p >= 0.5).astype(int), digits=4))
    except Exception:
        print("classification_report skipped (test split too small / missing class).")

    # Save artifacts
    joblib.dump(model, MODEL_PATH)
    joblib.dump({"feature_order": feature_order}, META_PATH)

    print("====================================")
    print("Saved model artifacts:")
    print(" -", MODEL_PATH)
    print(" -", META_PATH)
    print("====================================")


if __name__ == "__main__":
    main()