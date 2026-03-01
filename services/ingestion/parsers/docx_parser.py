"""DOCX parser using python-docx."""
import io
from docx import Document


def parse_docx(content: bytes) -> dict:
    sections = []
    paragraphs = []
    metadata = {"source": "docx"}

    doc = Document(io.BytesIO(content))

    # Core properties
    cp = doc.core_properties
    metadata["title"] = cp.title or ""
    metadata["author"] = cp.author or ""

    current_section = {"heading": "Introduction", "paragraphs": []}
    para_idx = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        # Detect headings
        if para.style.name.startswith("Heading"):
            if current_section["paragraphs"]:
                sections.append(current_section)
            current_section = {"heading": text, "paragraphs": []}
            continue

        current_section["paragraphs"].append(text)
        paragraphs.append({
            "index": para_idx,
            "section": current_section["heading"],
            "text": text,
            "char_start": 0,
        })
        para_idx += 1

    if current_section["paragraphs"]:
        sections.append(current_section)

    full_text = "\n\n".join(p["text"] for p in paragraphs)
    tokens = _simple_tokenize(full_text)

    return {
        "metadata": metadata,
        "sections": sections,
        "paragraphs": paragraphs,
        "tokens": tokens,
        "full_text": full_text,
        "word_count": len(full_text.split()),
    }


def _simple_tokenize(text: str) -> list:
    import re
    return re.findall(r"\b\w+\b", text.lower())
