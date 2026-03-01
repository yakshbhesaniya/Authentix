"""
Script to train the AI Detection Transformer Classifier and Meta-Ensemble.
Requires: PyTorch, HuggingFace Transformers, scikit-learn, datasets.
"""

import json
import logging
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import load_dataset
from sklearn.linear_model import LogisticRegression
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
MODEL_NAME = "roberta-base"
BATCH_SIZE = 16
EPOCHS = 3
DATA_PATH = "../../data/training/"

def train_transformer():
    logger.info("Loading training corpora (Human vs AI)...")
    # This expects a CSV with 'text' and 'label' (0=Human, 1=AI)
    dataset = load_dataset('csv', data_files={'train': DATA_PATH + 'train_corpus.csv', 'val': DATA_PATH + 'val_corpus.csv'})
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    
    def tokenize_function(examples):
        return tokenizer(examples['text'], padding="max_length", truncation=True, max_length=512)

    tokenized_datasets = dataset.map(tokenize_function, batched=True)
    
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2)
    
    training_args = TrainingArguments(
        output_dir="../../model_cache/ai_detector",
        evaluation_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        num_train_epochs=EPOCHS,
        weight_decay=0.01,
        save_strategy="epoch",
        load_best_model_at_end=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets['train'],
        eval_dataset=tokenized_datasets['val'],
    )

    logger.info("Training transformer classifier...")
    trainer.train()
    trainer.save_model("../../model_cache/ai_detector/best")
    tokenizer.save_pretrained("../../model_cache/ai_detector/best")
    logger.info("Transformer model saved.")


def train_meta_ensemble():
    logger.info("Training Logistic Stacking Meta-Classifier...")
    # Load out-of-fold predictions from base models (RoBERTa, Perplexity, Stylometrics, Distribution)
    # Expected JSON: [{"signals": {"roberta": 0.8, "perp": 0.4, "stylo": 0.6, "dist": 0.5}, "label": 1}, ...]
    with open(DATA_PATH + 'ensemble_train_features.json', 'r') as f:
        data = json.load(f)
        
    X = [[d['signals']['roberta'], d['signals']['perplexity'], d['signals']['stylometrics'], d['signals']['distribution']] for d in data]
    y = [d['label'] for d in data]
    
    # We use Platt Scaling (calibration) natively with Logistic Regression
    clf = LogisticRegression(class_weight='balanced')
    clf.fit(X, y)
    
    joblib.dump(clf, "../../model_cache/ensemble_weights.pkl")
    logger.info(f"Ensemble meta-classifier saved. Coefficients: {clf.coef_}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--step", choices=["transformer", "ensemble", "all"], default="all")
    args = parser.parse_args()
    
    if args.step in ["transformer", "all"]:
        train_transformer()
    if args.step in ["ensemble", "all"]:
        train_meta_ensemble()
