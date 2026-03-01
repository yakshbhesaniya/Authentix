"""
Authentix — Document Ingestion Service
Parses PDF, DOCX, and plain text into structured JSON.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from parsers.pdf_parser import parse_pdf
from parsers.docx_parser import parse_docx
from parsers.text_parser import parse_text
from normalizer import normalize

app = FastAPI(
    title="Authentix Ingestion Service",
    version="1.0.0",
    description="Document parsing and normalization service",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ParseRequest(BaseModel):
    file_key: Optional[str] = None
    text: Optional[str] = None
    file_type: Optional[str] = None


class ParseResponse(BaseModel):
    metadata: dict
    sections: list
    paragraphs: list
    tokens: list
    full_text: str
    word_count: int


@app.get("/health")
def health():
    return {"status": "ok", "service": "ingestion"}


@app.post("/parse", response_model=ParseResponse)
async def parse_document(req: ParseRequest):
    if not req.text and not req.file_key:
        raise HTTPException(status_code=400, detail="Either text or file_key must be provided")

    if req.text:
        raw = req.text
        result = parse_text(raw)
    else:
        # Download from MinIO then dispatch by type
        content = await _download_from_minio(req.file_key)
        ft = req.file_type or ""
        if "pdf" in ft:
            result = parse_pdf(content)
        elif "word" in ft or "docx" in ft:
            result = parse_docx(content)
        else:
            result = parse_text(content.decode("utf-8", errors="replace"))

    result = normalize(result)
    return result


@app.post("/parse-upload", response_model=ParseResponse)
async def parse_upload(file: UploadFile = File(...)):
    content = await file.read()
    ft = file.content_type or ""
    if "pdf" in ft:
        result = parse_pdf(content)
    elif "word" in ft or "docx" in ft:
        result = parse_docx(content)
    else:
        result = parse_text(content.decode("utf-8", errors="replace"))
    result = normalize(result)
    return result


async def _download_from_minio(file_key: str) -> bytes:
    from minio import Minio
    client = Minio(
        os.getenv("MINIO_ENDPOINT", "localhost:9000"),
        access_key=os.getenv("MINIO_ACCESS_KEY", "authentix"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "authentix_secret"),
        secure=False,
    )
    bucket = os.getenv("MINIO_BUCKET", "authentix-documents")
    response = client.get_object(bucket, file_key)
    return response.read()
