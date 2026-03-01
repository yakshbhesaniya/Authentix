"""Candidate ranker: semantic preservation + stylometric score + AI-resistance."""
from sentence_transformers import SentenceTransformer
import numpy as np
import re
import math
from collections import Counter

SBERT_MODEL = "all-MiniLM-L6-v2"


class Ranker:
    def __init__(self):
        self.sbert = SentenceTransformer(SBERT_MODEL)

    def rank(self, original: str, candidates: list) -> list:
        """
        Score each candidate on:
        1. Semantic preservation (SBERT cosine similarity vs original)
        2. Stylometric human-likeness (burstiness, TTR, sentence variance)
        Returns candidates sorted best → worst with scores.
        """
        orig_emb = self.sbert.encode([original])[0]
        cand_embs = self.sbert.encode(candidates)

        ranked = []
        for cand, emb in zip(candidates, cand_embs):
            semantic_sim = float(np.dot(orig_emb, emb) / (
                np.linalg.norm(orig_emb) * np.linalg.norm(emb) + 1e-9
            ))
            human_likeness = _stylometric_human_score(cand)

            # Composite score: 60% semantic, 40% human-likeness
            composite = 0.60 * semantic_sim + 0.40 * human_likeness

            ranked.append({
                "text": cand,
                "semantic_similarity": round(semantic_sim, 4),
                "human_likeness": round(human_likeness, 4),
                "composite_score": round(composite, 4),
            })

        ranked.sort(key=lambda x: -x["composite_score"])
        return ranked


def _stylometric_human_score(text: str) -> float:
    """Heuristic: high burstiness + variance = more human-like."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    words = re.findall(r"\b\w+\b", text.lower())
    if not words or not sentences:
        return 0.5

    sent_lengths = [len(s.split()) for s in sentences if s.strip()]
    ttr = len(set(words)) / len(words)
    variance = _variance(sent_lengths)
    burstiness = _burstiness(sent_lengths)  # high = human

    # AI detection proxy: low variance + low burstiness = AI → human_likeness low
    ai_prob = 0.0
    if variance < 20:
        ai_prob += 0.33
    if burstiness < 0.3:
        ai_prob += 0.33
    if ttr < 0.5:
        ai_prob += 0.33

    return round(1.0 - min(ai_prob, 1.0), 4)


def _variance(vals: list) -> float:
    if len(vals) < 2:
        return 0.0
    mean = sum(vals) / len(vals)
    return sum((v - mean) ** 2 for v in vals) / len(vals)


def _burstiness(sent_lengths: list) -> float:
    if len(sent_lengths) < 2:
        return 0.0
    mean = sum(sent_lengths) / len(sent_lengths)
    std = math.sqrt(_variance(sent_lengths))
    return (std - mean) / (std + mean + 1e-9)
