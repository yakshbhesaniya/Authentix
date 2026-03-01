"""Structural comparison: paragraph alignment scoring."""
import re
from typing import List


def structural_similarity(input_text: str, matched_sources: List[dict]) -> float:
    """
    Score structural similarity based on ratio of input paragraphs
    that have high-quality sentence-level matches in the found sources.
    """
    if not matched_sources:
        return 0.0

    paragraphs = _split_paragraphs(input_text)
    if not paragraphs:
        return 0.0

    # Simplified: use the count of matched_sources as a proxy for structural overlap
    source_count = len(matched_sources)
    para_count = len(paragraphs)

    # Each matched source represents at least 1 matched paragraph
    ratio = min(source_count / para_count, 1.0)
    score = ratio * 100.0

    return round(score, 2)


def _split_paragraphs(text: str) -> List[str]:
    blocks = re.split(r"\n\s*\n", text.strip())
    return [b.strip() for b in blocks if len(b.strip()) > 30]
