"""Text normalization: unicode, whitespace, repeated patterns."""
import unicodedata
import re


def normalize(doc: dict) -> dict:
    """Apply unicode and whitespace normalization to the parsed document."""
    doc["full_text"] = _normalize_text(doc.get("full_text", ""))

    for i, para in enumerate(doc.get("paragraphs", [])):
        doc["paragraphs"][i]["text"] = _normalize_text(para["text"])

    for i, sec in enumerate(doc.get("sections", [])):
        if isinstance(sec, dict) and "text" in sec:
            doc["sections"][i]["text"] = _normalize_text(sec["text"])
        elif isinstance(sec, dict) and "paragraphs" in sec:
            doc["sections"][i]["paragraphs"] = [
                _normalize_text(p) for p in sec["paragraphs"]
            ]

    # Remove watermark-style repeated phrases (3+ times)
    doc["full_text"] = _remove_repeated_phrases(doc["full_text"])

    return doc


def _normalize_text(text: str) -> str:
    if not text:
        return text
    # Unicode NFC normalization
    text = unicodedata.normalize("NFC", text)
    # Replace fancy quotes/dashes
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    # Collapse whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove null bytes and control chars
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return text.strip()


def _remove_repeated_phrases(text: str, min_len: int = 6, threshold: int = 3) -> str:
    """Remove phrases that repeat more than threshold times (watermarks)."""
    words = text.split()
    phrase_counts: dict = {}
    for size in range(min_len, min_len + 3):
        for i in range(len(words) - size + 1):
            phrase = " ".join(words[i : i + size])
            phrase_counts[phrase] = phrase_counts.get(phrase, 0) + 1

    for phrase, count in phrase_counts.items():
        if count >= threshold:
            text = text.replace(phrase, "")

    return re.sub(r"\s{2,}", " ", text).strip()
