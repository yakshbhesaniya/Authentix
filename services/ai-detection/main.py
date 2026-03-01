"""
Authentix — AI Detection Service
Ensemble: Transformer classifier + Perplexity + Stylometrics + Distribution
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from detectors.transformer_classifier import TransformerClassifier
from detectors.perplexity_detector import PerplexityDetector
from detectors.stylometric import StylometricDetector
from detectors.distribution import DistributionAnalyzer
from ensemble import EnsembleClassifier
from explainer import explain

app = FastAPI(title="Authentix AI Detection Engine", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Lazy singletons
_ensemble: Optional[EnsembleClassifier] = None


def get_ensemble() -> EnsembleClassifier:
    global _ensemble
    if _ensemble is None:
        _ensemble = EnsembleClassifier(
            TransformerClassifier(),
            PerplexityDetector(),
            StylometricDetector(),
            DistributionAnalyzer(),
        )
    return _ensemble


class DetectRequest(BaseModel):
    text: str


class DetectResponse(BaseModel):
    score: float               # 0–100 AI likelihood
    confidence_interval: list  # [low, high]
    label: str                 # "human" | "ai" | "uncertain"
    model_agreement: float     # 0–1
    signals: dict              # per-signal breakdown


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-detection"}


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    if len(req.text.strip()) < 50:
        raise HTTPException(400, "Text must be at least 50 characters for AI detection")

    ensemble = get_ensemble()
    result = ensemble.predict(req.text)
    signals = explain(req.text, result)

    score = result["score"]
    label = "ai" if score > 65 else ("human" if score < 35 else "uncertain")

    return DetectResponse(
        score=score,
        confidence_interval=result["confidence_interval"],
        label=label,
        model_agreement=result["agreement"],
        signals=signals,
    )
