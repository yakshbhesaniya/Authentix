"""RoBERTa-based transformer classifier for AI vs human text."""
from transformers import pipeline
import torch

MODEL_NAME = "roberta-base-openai-detector"  # OpenAI's GPT-2 detector fine-tuned on RoBERTa


class TransformerClassifier:
    def __init__(self):
        device = 0 if torch.cuda.is_available() else -1
        self.classifier = pipeline(
            "text-classification",
            model=MODEL_NAME,
            device=device,
            truncation=True,
            max_length=512,
        )

    def predict(self, text: str) -> dict:
        """Return AI probability (0–1) and raw label."""
        # Chunk long texts
        chunks = self._chunk_text(text, max_chars=1800)
        scores = []
        for chunk in chunks:
            result = self.classifier(chunk)[0]
            label = result["label"].lower()
            conf = result["score"]
            # "LABEL_1" or "Fake" = AI, "LABEL_0" or "Real" = human
            ai_prob = conf if ("fake" in label or "1" in label) else (1 - conf)
            scores.append(ai_prob)
        avg = sum(scores) / len(scores)
        return {"probability": avg, "model": "roberta"}

    def _chunk_text(self, text: str, max_chars: int = 1800) -> list:
        words = text.split()
        chunks, current = [], []
        for w in words:
            current.append(w)
            if len(" ".join(current)) >= max_chars:
                chunks.append(" ".join(current))
                current = []
        if current:
            chunks.append(" ".join(current))
        return chunks or [text]
