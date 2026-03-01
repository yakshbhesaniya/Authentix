"""Semantic similarity engine using SBERT + Qdrant vector search."""
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance, VectorParams, PointStruct, Filter
)
import numpy as np
from typing import Optional
import uuid

COLLECTION = "authentix_documents"
MODEL_NAME = "all-MiniLM-L6-v2"  # Efficient 384-dim SBERT model


class SemanticEngine:
    def __init__(self, qdrant_url: str = "http://localhost:6333"):
        self.model = SentenceTransformer(MODEL_NAME)
        self.dim = self.model.get_sentence_embedding_dimension()
        self.client = QdrantClient(url=qdrant_url)
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            self.client.get_collection(COLLECTION)
        except Exception:
            self.client.create_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(size=self.dim, distance=Distance.COSINE),
            )

    def index(self, text: str, doc_id: str, metadata: Optional[dict] = None):
        """Index a document's sentence embeddings into Qdrant."""
        sentences = self._split_sentences(text)
        embeddings = self.model.encode(sentences, batch_size=32, show_progress_bar=False)
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=emb.tolist(),
                payload={"doc_id": doc_id, "sentence": sent, **(metadata or {})},
            )
            for emb, sent in zip(embeddings, sentences)
        ]
        if points:
            self.client.upsert(collection_name=COLLECTION, points=points)

    def search(self, text: str, top_k: int = 10, score_threshold: float = 0.75) -> dict:
        """Find semantically similar passages and compute a plagiarism score."""
        sentences = self._split_sentences(text)
        if not sentences:
            return {"score": 0.0, "sources": [], "matched_segments": []}

        embeddings = self.model.encode(sentences, batch_size=32, show_progress_bar=False)

        matched_segments = []
        source_map: dict = {}
        total_similarity = 0.0
        match_count = 0

        for sent, emb in zip(sentences, embeddings):
            results = self.client.search(
                collection_name=COLLECTION,
                query_vector=emb.tolist(),
                limit=top_k,
                score_threshold=score_threshold,
            )
            for hit in results:
                sim = hit.score
                doc_id = hit.payload.get("doc_id", "unknown")
                matched_text = hit.payload.get("sentence", "")
                matched_segments.append({
                    "original": sent,
                    "matched": matched_text,
                    "similarity": round(sim, 4),
                    "source": doc_id,
                })
                total_similarity += sim
                match_count += 1
                if doc_id not in source_map or source_map[doc_id] < sim:
                    source_map[doc_id] = sim

        # Score: proportion of sentences with matches * average similarity * 100
        if match_count == 0:
            score = 0.0
        else:
            matched_ratio = min(match_count / len(sentences), 1.0)
            avg_sim = total_similarity / match_count
            score = round(matched_ratio * avg_sim * 100, 2)

        sources = [
            {"doc_id": doc_id, "max_similarity": round(sim, 4)}
            for doc_id, sim in sorted(source_map.items(), key=lambda x: -x[1])
        ]

        return {
            "score": score,
            "sources": sources,
            "matched_segments": matched_segments[:50],  # cap for response size
        }

    def _split_sentences(self, text: str) -> list:
        import re
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        return [s.strip() for s in sentences if len(s.strip()) > 20]
