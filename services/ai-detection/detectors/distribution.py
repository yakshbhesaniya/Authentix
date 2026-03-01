"""Token probability distribution analyzer."""
import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast
import numpy as np

MODEL_NAME = "distilgpt2"


class DistributionAnalyzer:
    def __init__(self):
        self.tokenizer = GPT2TokenizerFast.from_pretrained(MODEL_NAME)
        self.model = GPT2LMHeadModel.from_pretrained(MODEL_NAME)
        self.model.eval()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def predict(self, text: str) -> dict:
        """
        AI text tends to have uniformly high token probabilities.
        Compute entropy of token-level log probs and uniformity score.
        """
        token_probs = self._get_token_probs(text)
        if not token_probs:
            return {"probability": 0.5, "entropy": 0, "uniformity": 0, "model": "distribution"}

        entropy = float(np.mean([-p * np.log(p + 1e-9) for p in token_probs]))
        uniformity = 1.0 - float(np.std(token_probs))  # High uniformity = likely AI

        # AI text has low entropy and high uniformity
        ai_prob = max(0, min(1, uniformity * 0.6 + (1 - entropy / 5) * 0.4))

        return {
            "probability": round(ai_prob, 4),
            "entropy": round(entropy, 4),
            "uniformity": round(uniformity, 4),
            "model": "distribution",
        }

    def _get_token_probs(self, text: str) -> list:
        try:
            enc = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
            input_ids = enc.input_ids.to(self.device)
            with torch.no_grad():
                outputs = self.model(input_ids)
                logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            token_probs = []
            for i in range(input_ids.shape[1] - 1):
                tok_id = input_ids[0, i + 1].item()
                token_probs.append(probs[0, i, tok_id].item())
            return token_probs
        except Exception:
            return []
