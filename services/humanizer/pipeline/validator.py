"""
Validation Firewall:
1. SBERT semantic similarity ≥ threshold
2. Named entity preservation (spaCy)
3. Numerical fidelity (regex)
4. Logical structure preservation
"""
from sentence_transformers import SentenceTransformer
import spacy
import re
import numpy as np

SBERT_MODEL = "all-MiniLM-L6-v2"
SPACY_MODEL = "en_core_web_sm"


class Validator:
    def __init__(self):
        self.sbert = SentenceTransformer(SBERT_MODEL)
        try:
            self.nlp = spacy.load(SPACY_MODEL)
        except OSError:
            import subprocess, sys
            subprocess.run([sys.executable, "-m", "spacy", "download", SPACY_MODEL], check=True)
            self.nlp = spacy.load(SPACY_MODEL)

    def validate(self, original: str, candidate: str, min_similarity: float = 0.92) -> dict:
        """Run all validation gates. Returns report with pass/fail for each gate."""
        sem_sim = self._semantic_similarity(original, candidate)
        ner_check = self._ner_preservation(original, candidate)
        num_check = self._numeric_fidelity(original, candidate)
        struct_check = self._structure_preserved(original, candidate)

        all_passed = (
            sem_sim >= min_similarity
            and ner_check["preserved"]
            and num_check["preserved"]
            and struct_check["preserved"]
        )

        return {
            "passed": all_passed,
            "semantic_similarity": round(sem_sim, 4),
            "semantic_threshold": min_similarity,
            "ner_preservation": ner_check,
            "numeric_fidelity": num_check,
            "structure_preservation": struct_check,
        }

    def _semantic_similarity(self, a: str, b: str) -> float:
        embs = self.sbert.encode([a, b])
        cos = float(np.dot(embs[0], embs[1]) / (
            np.linalg.norm(embs[0]) * np.linalg.norm(embs[1]) + 1e-9
        ))
        return cos

    def _ner_preservation(self, original: str, candidate: str) -> dict:
        orig_doc = self.nlp(original)
        cand_doc = self.nlp(candidate)

        orig_entities = {(e.text.lower(), e.label_) for e in orig_doc.ents}
        cand_entities = {(e.text.lower(), e.label_) for e in cand_doc.ents}

        missing = orig_entities - cand_entities
        preserved = len(missing) == 0 or len(orig_entities) == 0

        return {
            "preserved": preserved,
            "original_entities": list(orig_entities),
            "missing_entities": list(missing),
        }

    def _numeric_fidelity(self, original: str, candidate: str) -> dict:
        orig_nums = set(re.findall(r"\b\d+(?:\.\d+)?%?\b", original))
        cand_nums = set(re.findall(r"\b\d+(?:\.\d+)?%?\b", candidate))
        missing = orig_nums - cand_nums
        preserved = len(missing) == 0

        return {
            "preserved": preserved,
            "original_numbers": list(orig_nums),
            "missing_numbers": list(missing),
        }

    def _structure_preserved(self, original: str, candidate: str) -> dict:
        orig_paras = len([p for p in original.split("\n\n") if p.strip()])
        cand_paras = len([p for p in candidate.split("\n\n") if p.strip()])

        # Allow up to 50% change in paragraph count
        ratio = cand_paras / (orig_paras + 1e-9)
        preserved = 0.5 <= ratio <= 1.5

        return {
            "preserved": preserved,
            "original_paragraph_count": orig_paras,
            "candidate_paragraph_count": cand_paras,
        }
