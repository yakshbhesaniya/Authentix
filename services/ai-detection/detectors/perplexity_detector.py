"""Perplexity-based AI detector using GPT-2."""
import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast
import math

MODEL_NAME = "distilgpt2"


class PerplexityDetector:
    def __init__(self):
        self.tokenizer = GPT2TokenizerFast.from_pretrained(MODEL_NAME)
        self.model = GPT2LMHeadModel.from_pretrained(MODEL_NAME)
        self.model.eval()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def predict(self, text: str) -> dict:
        """
        AI-generated text tends to have LOW perplexity under language models
        (models produce fluent, predictable text).
        Human text usually has HIGHER perplexity.
        """
        ppl = self._perplexity(text)
        # Calibrated thresholds: ppl < 20 → likely AI, ppl > 100 → likely human
        if ppl < 20:
            ai_prob = 0.90
        elif ppl < 50:
            ai_prob = 0.70
        elif ppl < 100:
            ai_prob = 0.40
        else:
            ai_prob = 0.15
        return {"probability": ai_prob, "perplexity": round(ppl, 2), "model": "perplexity"}

    def _perplexity(self, text: str) -> float:
        encodings = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        )
        input_ids = encodings.input_ids.to(self.device)
        with torch.no_grad():
            outputs = self.model(input_ids, labels=input_ids)
            loss = outputs.loss
        return math.exp(loss.item())
