"""
Script to evaluate the full pipeline (Plagiarism, AI Detection, Humanization).
Metrics computed: Precision, Recall, ROC-AUC, Calibration, Semantic Similarity.
Requires: scikit-learn, numpy, pandas, sentence-transformers, spacy
"""

import json
import logging
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def evaluate_plagiarism(predictions_path: str, ground_truth_path: str):
    logger.info("Evaluating Plagiarism Engine on PAN paraphrase benchmarks...")
    # Load data
    with open(predictions_path, 'r') as f: preds = json.load(f)
    with open(ground_truth_path, 'r') as f: truths = json.load(f)
    
    y_true = [t['is_plagiarized'] for t in truths]
    y_scores = [p['plagiarism_score'] for p in preds]
    
    precision, recall, _ = precision_recall_curve(y_true, y_scores)
    pr_auc = auc(recall, precision)
    logger.info(f"Plagiarism PR-AUC: {pr_auc:.3f}")
    
    # Calculate False Positive Rate
    fp = sum(1 for label, score in zip(y_true, y_scores) if label == 0 and score > 20)
    tn = sum(1 for label in y_true if label == 0)
    logger.info(f"Plagiarism False Positive Rate (threshold > 20%): {(fp/tn)*100:.2f}%")


def evaluate_ai_detection(predictions_path: str, ground_truth_path: str):
    logger.info("Evaluating AI Detection Engine on cross-model corpus...")
    # Load data
    with open(predictions_path, 'r') as f: preds = json.load(f)
    with open(ground_truth_path, 'r') as f: truths = json.load(f)
    
    y_true = [t['is_ai'] for t in truths]
    y_scores = [p['ai_score']/100 for p in preds]  # normalized 0-1
    
    roc_auc = roc_auc_score(y_true, y_scores)
    logger.info(f"AI Detection ROC-AUC: {roc_auc:.3f}")
    
    # Calibration metric (Expected Calibration Error - ECE proxy)
    bins = 10
    bin_size = len(y_scores) // bins
    sorted_pairs = sorted(zip(y_scores, y_true))
    ece = 0.0
    for i in range(bins):
        bin_pairs = sorted_pairs[i * bin_size : (i + 1) * bin_size]
        bin_conf = np.mean([p[0] for p in bin_pairs])
        bin_acc = np.mean([p[1] for p in bin_pairs])
        ece += abs(bin_conf - bin_acc) * (len(bin_pairs) / len(y_scores))
    logger.info(f"AI Detection Calibration Error (ECE): {ece:.3f}")


def evaluate_humanizer(predictions_path: str, ground_truth_path: str):
    logger.info("Evaluating Humanization Engine...")
    # Requires running sentence-transformers over semantic outputs
    with open(predictions_path, 'r') as f: preds = json.load(f)
    
    sim_scores = [p['validation']['semantic_similarity'] for p in preds if p.get('validation')]
    avg_sim = np.mean(sim_scores) if sim_scores else 0
    passed = sum(1 for s in sim_scores if s >= 0.92)
    
    logger.info(f"Avg Semantic Similarity: {avg_sim:.3f}")
    logger.info(f"Pass Rate (Sim >= 0.92): {(passed/len(sim_scores) if sim_scores else 0)*100:.1f}%")
    
    # Fact consistency & NER
    ner_passed = sum(1 for p in preds if p.get('validation', {}).get('ner_preservation', {}).get('preserved', False))
    logger.info(f"NER Strict Preservation Pass Rate: {(ner_passed/len(preds) if preds else 0)*100:.1f}%")
    
    # Evasion rate (how many outputs bypass the AI detector threshold < 35)
    evaded = sum(1 for p in preds if p.get('validation', {}).get('final_ai_score', 100) < 35)
    logger.info(f"Detector Evasion Rate: {(evaded/len(preds) if preds else 0)*100:.1f}%")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--component", choices=["plagiarism", "ai", "humanizer", "all"], default="all")
    parser.add_argument("--preds", type=str, required=True, help="Path to JSON predictions")
    parser.add_argument("--truths", type=str, required=True, help="Path to JSON ground truth")
    args = parser.parse_args()
    
    if args.component in ["plagiarism", "all"]:
        evaluate_plagiarism(args.preds, args.truths)
    if args.component in ["ai", "all"]:
        evaluate_ai_detection(args.preds, args.truths)
    if args.component in ["humanizer", "all"]:
        evaluate_humanizer(args.preds, args.truths)
