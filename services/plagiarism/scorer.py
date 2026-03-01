"""Weighted score aggregation for plagiarism detection."""


def aggregate_score(
    lexical: float,
    semantic: float,
    structural: float,
    weights: tuple = (0.25, 0.55, 0.20),
) -> float:
    """
    Combine lexical, semantic, and structural scores into a single plagiarism %.
    Semantic gets highest weight as it catches paraphrasing.
    """
    w_lex, w_sem, w_str = weights
    score = w_lex * lexical + w_sem * semantic + w_str * structural
    return round(min(max(score, 0.0), 100.0), 2)
