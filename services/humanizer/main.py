"""
Authentix — Humanizer Service
Controlled rewriting pipeline with validation firewall.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

from pipeline.rewriter import Rewriter
from pipeline.ranker import Ranker
from pipeline.validator import Validator
from pipeline.loop import humanize_with_retry

app = FastAPI(title="Authentix Humanizer", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_rewriter = None
_ranker = None
_validator = None


def get_components():
    global _rewriter, _ranker, _validator
    if _rewriter is None:
        _rewriter = Rewriter()
        _ranker = Ranker()
        _validator = Validator()
    return _rewriter, _ranker, _validator


class HumanizeRequest(BaseModel):
    text: str
    max_retries: int = 5
    min_similarity: float = 0.92


class HumanizeResponse(BaseModel):
    humanized_text: str
    validation: dict
    attempts: int
    passed: bool


@app.get("/health")
def health():
    return {"status": "ok", "service": "humanizer"}


@app.post("/humanize", response_model=HumanizeResponse)
async def humanize(req: HumanizeRequest):
    if len(req.text.strip()) < 20:
        raise HTTPException(400, "Text too short to humanize")

    rewriter, ranker, validator = get_components()

    result = humanize_with_retry(
        text=req.text,
        rewriter=rewriter,
        ranker=ranker,
        validator=validator,
        max_retries=req.max_retries,
        min_similarity=req.min_similarity,
        ai_detection_url=os.getenv("AI_DETECTION_URL", "http://localhost:8003"),
    )

    return HumanizeResponse(
        humanized_text=result["text"],
        validation=result["validation"],
        attempts=result["attempts"],
        passed=result["passed"],
    )
