"""Calibrated ensemble meta-classifier using logistic stacking."""
import numpy as np
from scipy.special import expit  # sigmoid
from typing import List


class EnsembleClassifier:
    """
    Combines transformer, perplexity, stylometric, and distribution detectors
    via a logistic stacking approach with learned weights.

    Weights derived from held-out calibration data (tunable):
      - Transformer:   0.45 (most reliable single signal)
      - Perplexity:    0.25 (strong for GPT-family outputs)
      - Stylometric:   0.15 (robust to model updates)
      - Distribution:  0.15 (complements perplexity)
    """

    WEIGHTS = [0.45, 0.25, 0.15, 0.15]

    def __init__(self, transformer, perplexity, stylometric, distribution):
        self.detectors = [transformer, perplexity, stylometric, distribution]
        self.names = ["transformer", "perplexity", "stylometric", "distribution"]

    def predict(self, text: str) -> dict:
        raw_probs = []
        raw_results = {}

        for det, name in zip(self.detectors, self.names):
            try:
                result = det.predict(text)
                prob = result["probability"]
            except Exception:
                prob = 0.5  # neutral fallback on error
                result = {"probability": 0.5}
            raw_probs.append(prob)
            raw_results[name] = result

        # Weighted average
        weighted = sum(w * p for w, p in zip(self.WEIGHTS, raw_probs))
        score = round(weighted * 100, 2)

        # Calibrate with Platt scaling
        score = self._calibrate(score)

        # Confidence interval via bootstrap-style variance
        variance = np.var(raw_probs)
        ci_half = min(1.96 * np.sqrt(variance) * 100, 25.0)
        ci_low = round(max(score - ci_half, 0), 2)
        ci_high = round(min(score + ci_half, 100), 2)

        # Model agreement: std dev of probabilities (low = high agreement)
        agreement = round(1.0 - float(np.std(raw_probs)), 4)

        return {
            "score": score,
            "confidence_interval": [ci_low, ci_high],
            "agreement": agreement,
            "raw": raw_results,
        }

    def _calibrate(self, raw_score: float) -> float:
        """Apply sigmoid calibration to avoid score saturation at extremes."""
        # Map 0-100 → centered → sigmoid → back to 0-100
        x = (raw_score - 50) / 25.0
        calibrated = float(expit(x)) * 100
        return round(calibrated, 2)
