"""T5/PEGASUS-based constrained rewriter for humanization."""
from transformers import T5ForConditionalGeneration, T5TokenizerFast
import torch
import random


MODEL_NAME = "t5-base"  # Switch to t5-large or PEGASUS for production


class Rewriter:
    def __init__(self):
        self.tokenizer = T5TokenizerFast.from_pretrained(MODEL_NAME)
        self.model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.model.eval()

    def rewrite(self, text: str, n_candidates: int = 4) -> list:
        """Generate n diverse humanized rewrite candidates."""
        # Split into manageable chunks
        chunks = self._split_chunks(text)
        candidates = [""] * n_candidates

        for chunk in chunks:
            chunk_candidates = self._rewrite_chunk(chunk, n_candidates)
            for i in range(n_candidates):
                candidates[i] += chunk_candidates[i] + " "

        return [c.strip() for c in candidates]

    def _rewrite_chunk(self, text: str, n: int) -> list:
        prompt = f"paraphrase: {text} </s>"
        inputs = self.tokenizer.encode(
            prompt, return_tensors="pt", max_length=512, truncation=True
        ).to(self.device)

        with torch.no_grad():
            outputs = self.model.generate(
                inputs,
                max_length=len(inputs[0]) + 100,
                num_return_sequences=n,
                num_beams=max(n, 6),
                temperature=0.95,
                do_sample=True,
                top_k=50,
                top_p=0.92,
                repetition_penalty=1.3,
                length_penalty=1.0,
                early_stopping=True,
            )

        results = []
        for out in outputs:
            decoded = self.tokenizer.decode(out, skip_special_tokens=True)
            results.append(decoded)

        # Ensure we have enough candidates
        while len(results) < n:
            results.append(results[0] if results else text)

        return results[:n]

    def _split_chunks(self, text: str, max_words: int = 200) -> list:
        import re
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        chunks, current, current_words = [], [], 0
        for sent in sentences:
            wc = len(sent.split())
            if current_words + wc > max_words and current:
                chunks.append(" ".join(current))
                current, current_words = [], 0
            current.append(sent)
            current_words += wc
        if current:
            chunks.append(" ".join(current))
        return chunks or [text]
