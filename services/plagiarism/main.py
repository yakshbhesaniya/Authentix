"""
Authentix — Plagiarism Engine FastAPI Service
Hybrid: exact matching (MinHash+LSH) + semantic similarity (SBERT + Qdrant)
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from engines.shingling import shingle
from engines.minhash_lsh import MinHashLSHEngine
from engines.semantic import SemanticEngine
from engines.structural import structural_similarity
from scorer import aggregate_score

app = FastAPI(
    title="Authentix Plagiarism Engine",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Lazy-loaded engines
_lsh_engine: Optional[MinHashLSHEngine] = None
_semantic_engine: Optional[SemanticEngine] = None


def get_lsh() -> MinHashLSHEngine:
    global _lsh_engine
    if _lsh_engine is None:
        _lsh_engine = MinHashLSHEngine()
    return _lsh_engine


def get_semantic() -> SemanticEngine:
    global _semantic_engine
    if _semantic_engine is None:
        _semantic_engine = SemanticEngine(
            qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333")
        )
    return _semantic_engine


class CheckRequest(BaseModel):
    text: str
    job_id: Optional[str] = None


class CheckResponse(BaseModel):
    score: float          # 0-100 overall plagiarism score
    lexical_score: float
    semantic_score: float
    structural_score: float
    report: dict


class IndexRequest(BaseModel):
    text: str
    doc_id: str
    metadata: Optional[dict] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "plagiarism"}


@app.post("/check", response_model=CheckResponse)
async def check_plagiarism(req: CheckRequest):
    if len(req.text.strip()) < 20:
        raise HTTPException(400, "Text too short for analysis")

    text = req.text

    # 1. Exact / Lexical layer (MinHash + LSH)
    shingles = shingle(text, n=5)
    lsh_matches = get_lsh().query(shingles)
    lexical_score = min(len(lsh_matches) * 5.0, 100.0) if lsh_matches else 0.0

    # 2. Semantic layer (SBERT embeddings + Qdrant ANN)
    sem_result = get_semantic().search(text)
    semantic_score = sem_result["score"]
    matched_sources = sem_result["sources"]

    # 3. Structural layer
    struct_score = structural_similarity(text, matched_sources)

    # 4. Weighted aggregate
    overall = aggregate_score(lexical_score, semantic_score, struct_score)

    report = {
        "overall_score": overall,
        "lexical_score": lexical_score,
        "semantic_score": semantic_score,
        "structural_score": struct_score,
        "matched_segments": sem_result.get("matched_segments", []),
        "sources": matched_sources,
    }

    return CheckResponse(
        score=overall,
        lexical_score=lexical_score,
        semantic_score=semantic_score,
        structural_score=struct_score,
        report=report,
    )


@app.post("/index")
async def index_document(req: IndexRequest):
    """Add a document to the searchable index."""
    shingles = shingle(req.text, n=5)
    get_lsh().add(req.doc_id, shingles)
    get_semantic().index(req.text, req.doc_id, req.metadata or {})
    return {"status": "indexed", "doc_id": req.doc_id}
