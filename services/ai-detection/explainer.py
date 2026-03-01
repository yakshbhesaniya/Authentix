"""Generate explanation breakdown of AI detection signals."""


def explain(text: str, ensemble_result: dict) -> dict:
    """Return a human-readable signal breakdown from the ensemble raw results."""
    raw = ensemble_result.get("raw", {})

    signals = {}

    # Transformer
    transformer = raw.get("transformer", {})
    t_prob = transformer.get("probability", 0.5)
    signals["transformer_score"] = {
        "value": round(t_prob * 100, 1),
        "label": "Transformer Classification",
        "description": "RoBERTa-based classifier trained on human vs AI-generated text",
        "threshold": 50,
    }

    # Perplexity
    perplexity = raw.get("perplexity", {})
    p_val = perplexity.get("perplexity", 0)
    p_prob = perplexity.get("probability", 0.5)
    signals["perplexity"] = {
        "value": round(p_val, 1),
        "ai_probability": round(p_prob * 100, 1),
        "label": "Perplexity Score",
        "description": "Lower perplexity indicates predictable, AI-generated phrasing",
        "interpretation": "Low (<20): likely AI | Medium (20-100): uncertain | High (>100): likely human",
    }

    # Stylometrics
    stylo = raw.get("stylometric", {})
    s_features = stylo.get("features", {})
    signals["stylometrics"] = {
        "burstiness": s_features.get("burstiness", 0),
        "sentence_length_variance": s_features.get("sentence_length_variance", 0),
        "type_token_ratio": s_features.get("type_token_ratio", 0),
        "repetition_score": s_features.get("repetition_score", 0),
        "ai_probability": round(stylo.get("probability", 0.5) * 100, 1),
        "label": "Stylometric Analysis",
        "description": "Measures writing rhythm, vocabulary diversity, and sentence uniformity",
    }

    # Distribution
    dist = raw.get("distribution", {})
    signals["token_distribution"] = {
        "entropy": dist.get("entropy", 0),
        "uniformity": dist.get("uniformity", 0),
        "ai_probability": round(dist.get("probability", 0.5) * 100, 1),
        "label": "Token Probability Distribution",
        "description": "AI text tends to have uniformly high token probabilities and low entropy",
    }

    return signals
