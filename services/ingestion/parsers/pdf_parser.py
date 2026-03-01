"""PDF parser using pdfplumber with pdfminer fallback."""
import io
import pdfplumber
from pdfminer.high_level import extract_text as pdfminer_extract


def parse_pdf(content: bytes) -> dict:
    sections = []
    paragraphs = []
    metadata = {"source": "pdf", "pages": 0}

    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            metadata["pages"] = len(pdf.pages)
            metadata["title"] = pdf.metadata.get("Title", "")
            metadata["author"] = pdf.metadata.get("Author", "")

            prev_bbox_bottom = None
            for page_num, page in enumerate(pdf.pages, start=1):
                words = page.extract_words(x_tolerance=3, y_tolerance=3)
                text = page.extract_text() or ""

                # Filter headers/footers by vertical position
                page_h = page.height
                header_zone = page_h * 0.08
                footer_zone = page_h * 0.92

                filtered_words = [
                    w for w in words
                    if w["top"] > header_zone and w["bottom"] < footer_zone
                ]

                page_text = " ".join(w["text"] for w in filtered_words).strip()
                if page_text:
                    # Detect paragraph breaks by large vertical gaps
                    current_para = []
                    for w in filtered_words:
                        if prev_bbox_bottom and (w["top"] - prev_bbox_bottom) > 12:
                            if current_para:
                                para_text = " ".join(current_para).strip()
                                if para_text:
                                    paragraphs.append({
                                        "page": page_num,
                                        "text": para_text,
                                        "char_start": 0,
                                    })
                            current_para = []
                        current_para.append(w["text"])
                        prev_bbox_bottom = w["bottom"]

                    if current_para:
                        para_text = " ".join(current_para).strip()
                        if para_text:
                            paragraphs.append({"page": page_num, "text": para_text, "char_start": 0})

                    sections.append({"page": page_num, "text": page_text})

    except Exception:
        # Fallback to pdfminer
        try:
            text = pdfminer_extract(io.BytesIO(content))
            raw_paras = [p.strip() for p in text.split("\n\n") if p.strip()]
            paragraphs = [{"page": 0, "text": p, "char_start": 0} for p in raw_paras]
            sections = [{"page": 0, "text": text}]
        except Exception as e:
            raise RuntimeError(f"Failed to parse PDF: {e}")

    full_text = " ".join(p["text"] for p in paragraphs)
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
