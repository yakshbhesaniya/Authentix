"""
Authentix — Evaluation & Metrics Service
Tracks model performance, drift, and calibration over time.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json

app = FastAPI(title="Authentix Evaluation Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class LogMetricRequest(BaseModel):
    service: str
    metric_name: str
    metric_value: float
    metadata: dict = {}


@app.get("/health")
def health():
    return {"status": "ok", "service": "evaluation"}


@app.post("/log")
async def log_metric(req: LogMetricRequest):
    """Persist a metric data point to PostgreSQL."""
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO model_metrics (service, metric_name, metric_value, metadata) VALUES (%s,%s,%s,%s)",
                [req.service, req.metric_name, req.metric_value, json.dumps(req.metadata)],
            )
            conn.commit()
            conn.close()
        except Exception as e:
            return {"status": "error", "detail": str(e)}
    return {"status": "logged"}


@app.get("/metrics/{service}")
async def get_metrics(service: str, limit: int = 100):
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return {"metrics": []}
    import psycopg2, psycopg2.extras
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT * FROM model_metrics WHERE service=%s ORDER BY recorded_at DESC LIMIT %s",
        [service, limit],
    )
    rows = cur.fetchall()
    conn.close()
    return {"metrics": [dict(r) for r in rows]}


@app.get("/drift-report")
async def drift_report():
    """Simple drift report: last 7 days avg AI scores and plagiarism rates."""
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return {"message": "No database configured"}
    import psycopg2, psycopg2.extras
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT service, metric_name,
               AVG(metric_value) as avg_value,
               STDDEV(metric_value) as std_value,
               COUNT(*) as count
        FROM model_metrics
        WHERE recorded_at > NOW() - INTERVAL '7 days'
        GROUP BY service, metric_name
        ORDER BY service, metric_name
    """)
    rows = cur.fetchall()
    conn.close()
    return {"drift_report": [dict(r) for r in rows]}
