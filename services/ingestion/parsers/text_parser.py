"""Plain text parser."""
import re


def parse_text(text: str) -> dict:
    # Split into paragraphs on double newlines
    raw_paras = re.split(r"\n{2,}", text.strip())
    paragraphs = []
    sections = []
    char_cursor = 0

    current_section = {"heading": "Body", "paragraphs": []}

    for idx, para in enumerate(raw_paras):
        para = para.strip()
        if not para:
            continue

        # Simple heading heuristic: short line ending without period, all caps or Title Case
        is_heading = (
            len(para) < 100
            and not para.endswith(".")
            and (para.isupper() or para.istitle())
        )

        if is_heading and idx > 0:
            sections.append(current_section)
            current_section = {"heading": para, "paragraphs": []}
            continue

        current_section["paragraphs"].append(para)
        paragraphs.append({
            "index": idx,
            "section": current_section["heading"],
            "text": para,
            "char_start": char_cursor,
        })
        char_cursor += len(para) + 2

    sections.append(current_section)
    full_text = "\n\n".join(p["text"] for p in paragraphs)
    tokens = re.findall(r"\b\w+\b", full_text.lower())

    return {
        "metadata": {"source": "text"},
        "sections": sections,
        "paragraphs": paragraphs,
        "tokens": tokens,
        "full_text": full_text,
        "word_count": len(full_text.split()),
    }
