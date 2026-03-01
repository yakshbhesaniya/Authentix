"""Retry loop — keeps regenerating until validation passes all gates."""
from pipeline.rewriter import Rewriter
from pipeline.ranker import Ranker
from pipeline.validator import Validator
import httpx


def humanize_with_retry(
    text: str,
    rewriter: Rewriter,
    ranker: Ranker,
    validator: Validator,
    max_retries: int = 5,
    min_similarity: float = 0.92,
    ai_detection_url: str = "http://localhost:8003",
) -> dict:
    """
    1. Generate N candidates
    2. Rank by semantic + human-likeness
    3. Run validation firewall on best candidate
    4. If passes, return. Else retry.
    """
    for attempt in range(1, max_retries + 1):
        candidates = rewriter.rewrite(text, n_candidates=4)
        ranked = ranker.rank(text, candidates)

        # Try candidates in quality order
        for ranked_cand in ranked:
            candidate_text = ranked_cand["text"]
            validation = validator.validate(text, candidate_text, min_similarity)

            if validation["passed"]:
                # Optional: check AI detection score via internal service
                ai_score = _check_ai_score(candidate_text, ai_detection_url)
                validation["final_ai_score"] = ai_score
                return {
                    "text": candidate_text,
                    "validation": validation,
                    "attempts": attempt,
                    "passed": True,
                }

    # Return best candidate even if all gates didn't pass (with warning)
    best = ranked[0] if ranked else {"text": text}
    validation = validator.validate(text, best["text"], min_similarity)
    validation["final_ai_score"] = _check_ai_score(best["text"], ai_detection_url)
    return {
        "text": best["text"],
        "validation": validation,
        "attempts": max_retries,
        "passed": False,
    }


def _check_ai_score(text: str, ai_detection_url: str) -> float:
    """Quick AI detection score check on the humanized output."""
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(f"{ai_detection_url}/detect", json={"text": text})
            return resp.json().get("score", -1)
    except Exception:
        return -1  # -1 means unavailable
