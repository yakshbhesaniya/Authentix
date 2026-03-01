"""Stylometric feature extractor — non-neural AI signal detection."""
import re
import math
from collections import Counter


class StylometricDetector:
    def predict(self, text: str) -> dict:
        features = self._extract_features(text)
        ai_prob = self._score(features)
        return {"probability": ai_prob, "features": features, "model": "stylometric"}

    def _extract_features(self, text: str) -> dict:
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        words = re.findall(r"\b\w+\b", text.lower())
        word_lengths = [len(w) for w in words]

        # Sentence length variance (AI text tends to be uniform)
        sent_lengths = [len(s.split()) for s in sentences if s.strip()]
        sent_length_variance = _variance(sent_lengths) if sent_lengths else 0

        # Vocabulary richness (Type-Token Ratio)
        ttr = len(set(words)) / len(words) if words else 0

        # Burstiness: variance in inter-sentence word count changes
        burstiness = _burstiness(sent_lengths)

        # Average sentence length (AI tends to use longer, complex sentences)
        avg_sent_len = sum(sent_lengths) / len(sent_lengths) if sent_lengths else 0

        # Repetition score: most common bigrams / total bigrams
        bigrams = [" ".join(words[i:i+2]) for i in range(len(words)-1)]
        bigram_counts = Counter(bigrams)
        repeat_score = (
            sum(1 for c in bigram_counts.values() if c > 2) / len(bigrams)
            if bigrams else 0
        )

        return {
            "sentence_length_variance": round(sent_length_variance, 2),
            "type_token_ratio": round(ttr, 4),
            "burstiness": round(burstiness, 4),
            "avg_sentence_length": round(avg_sent_len, 2),
            "repetition_score": round(repeat_score, 4),
        }

    def _score(self, features: dict) -> float:
        """Heuristic scoring — low variance + low burstiness = likely AI."""
        ai_signals = 0
        if features["sentence_length_variance"] < 20:
            ai_signals += 1
        if features["burstiness"] < 0.3:
            ai_signals += 1
        if features["type_token_ratio"] > 0.7:
            ai_signals += 0.5
        if features["avg_sentence_length"] > 20:
            ai_signals += 0.5
        if features["repetition_score"] > 0.05:
            ai_signals += 1

        return round(min(ai_signals / 4.0, 1.0), 4)


def _variance(vals: list) -> float:
    if len(vals) < 2:
        return 0.0
    mean = sum(vals) / len(vals)
    return sum((v - mean) ** 2 for v in vals) / len(vals)


def _burstiness(sent_lengths: list) -> float:
    """Burstiness: (std - mean) / (std + mean) — 1 = bursty (human), -1 = flat (AI)."""
    if len(sent_lengths) < 2:
        return 0.0
    mean = sum(sent_lengths) / len(sent_lengths)
    std = math.sqrt(_variance(sent_lengths))
    if mean + std == 0:
        return 0.0
    return (std - mean) / (std + mean)
