# Authentix — Content Intelligence Platform

> Detect plagiarism. Score AI content. Humanize text. Production-grade, modular and measurably accurate.

Built by **Yaksh Bhesaniya** with ♥

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (port 80)                      │
│           /api → Gateway (4000)  /  → Web (3000)           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐    BullMQ     ┌──────────────────┐
│  API Gateway        │  ──────────►  │  Ingestion :8001 │
│  (Fastify + JWT)    │               │  Plagiarism:8002  │
│  - Auth             │               │  AI Det.  :8003  │
│  - Rate Limiting    │               │  Humanizer:8004  │
│  - File Upload      │               │  Eval.    :8005  │
└─────────────────────┘               └──────────────────┘
         │
         ▼
┌─────────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐
│ PostgreSQL  │  │  Redis  │  │  Qdrant  │  │  MinIO   │
│  (primary)  │  │ (queue) │  │ (vectors)│  │  (files) │
└─────────────┘  └─────────┘  └──────────┘  └──────────┘
```

## Services

| Service | Port | Stack | Purpose |
|---|---|---|---|
| `apps/gateway` | 4000 | Node.js + Fastify + TS | API gateway, auth, BullMQ orchestration |
| `apps/web` | 3000 | Next.js 14 | Frontend dashboard |
| `services/ingestion` | 8001 | Python + FastAPI | PDF/DOCX/text parsing |
| `services/plagiarism` | 8002 | Python + FastAPI | MinHash+LSH + SBERT + Qdrant |
| `services/ai-detection` | 8003 | Python + FastAPI | RoBERTa + perplexity + stylometrics ensemble |
| `services/humanizer` | 8004 | Python + FastAPI | T5 rewriter + validation firewall |
| `services/evaluation` | 8005 | Python + FastAPI | Metrics, drift monitoring |

---

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev)
- Python 3.11+ (for local dev)

### 2. Configure Environment

```bash
cp infra/.env.example infra/.env
# Edit infra/.env — change JWT_SECRET and passwords for production
```

### 3. Run the Stack

```bash
cd infra
docker compose up --build
```

Services will be available at:
- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:4000
- **Qdrant Dashboard:** http://localhost:6333/dashboard
- **MinIO Console:** http://localhost:9001

---

## Local Development

### Gateway

```bash
cd apps/gateway
cp ../../infra/.env.example .env
npm install
npm run dev
```

### Python Services (example — plagiarism)

```bash
cd services/plagiarism
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --port 8002 --reload
```

### Frontend

```bash
cd apps/web
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except auth routes.

### Auth
```
POST /auth/register   { name, email, password }  → { token, user }
POST /auth/login      { email, password }          → { token, user }
GET  /auth/me                                      → { id, name, email }
```

### Analysis
```
POST /analyze         { text }           → { jobId, status }
POST /humanize        { text }           → { jobId, status }
POST /full-report     { text }           → { jobId, status }
POST /upload          multipart/form-data (file)  → { jobId, status }
```

### Jobs
```
GET  /jobs            → { jobs[] }
GET  /jobs/:id        → { job, results }
GET  /health          → { status, version }
```

### Result Shape

```json
{
  "job": { "id", "type", "status", "progress" },
  "results": {
    "plagiarism_score": 23.4,
    "plagiarism_report": {
      "lexical_score": 12.1,
      "semantic_score": 31.2,
      "structural_score": 10.0,
      "matched_segments": [...]
    },
    "ai_score": 78.2,
    "ai_confidence_low": 65.0,
    "ai_confidence_high": 88.0,
    "ai_signals": {
      "transformer_score": { "value": 82.1, "label": "..." },
      "perplexity": { "value": 14.3, "ai_probability": 75.0, "label": "..." },
      "stylometrics": { "burstiness": -0.12, "type_token_ratio": 0.81, "label": "..." },
      "token_distribution": { "entropy": 1.2, "uniformity": 0.87, "label": "..." }
    },
    "humanized_text": "...",
    "humanize_validation": {
      "passed": true,
      "semantic_similarity": 0.94,
      "ner_preservation": { "preserved": true },
      "numeric_fidelity": { "preserved": true },
      "structure_preservation": { "preserved": true },
      "final_ai_score": 28.5
    }
  }
}
```

---

## AI Detection Engine

Ensemble of 4 models with calibrated stacking:

| Model | Weight | Signal |
|---|---|---|
| RoBERTa classifier | 45% | Semantic AI-pattern recognition |
| GPT-2 perplexity | 25% | Low perplexity = predictable AI text |
| Stylometrics | 15% | Burstiness, TTR, sentence variance |
| Distribution analyzer | 15% | Token probability uniformity |

Score 0–100 with confidence interval and per-signal explanation.

---

## Plagiarism Engine

Hybrid weighted approach:

| Layer | Weight | Method |
|---|---|---|
| Semantic | 55% | SBERT + Qdrant ANN search |
| Lexical | 25% | MinHash + LSH (shingling) |
| Structural | 20% | Paragraph alignment |

---

## Humanization Pipeline

1. **Rewrite** — T5-base with beam sampling + temperature
2. **Rank** — SBERT semantic similarity + stylometric human-likeness
3. **Validate (Firewall)**:
   - Semantic similarity ≥ 0.92
   - Named entity preservation (spaCy NER)
   - Numerical fidelity (regex)
   - Structural preservation
4. **Retry** — if validation fails, regenerate up to 5 times

---

## Load Testing

```bash
# Start the stack first
docker compose -f infra/docker-compose.yml up -d
# Then run integration suite:
cd infra && python integration_tests/run_all.py

# Run load test (requires k6 installed)
k6 run infra/k6/load_test.js

# Custom base URL
BASE_URL=http://your-server k6 run infra/k6/load_test.js
```

Targets: p95 < 3s, error rate < 5% at 100 concurrent users.

---

## Observability

| What | Where |
|---|---|
| Model drift | `GET /metrics/{service}` on evaluation service |
| 7-day drift summary | `GET /drift-report` on evaluation service |
| Job failures | PostgreSQL `jobs` table (`status = 'failed'`) |
| Humanizer rejections | `humanize_validation.passed = false` in results |

---

## Project Structure

```
Authentix/
├── apps/
│   ├── gateway/          # Fastify API gateway (TypeScript)
│   └── web/              # Next.js 14 frontend
├── services/
│   ├── ingestion/        # Document parsing service
│   ├── plagiarism/       # Plagiarism detection engine
│   ├── ai-detection/     # AI content detection ensemble
│   ├── humanizer/        # Humanization pipeline
│   └── evaluation/       # Metrics & monitoring
├── infra/
│   ├── docker-compose.yml
│   ├── init.sql          # PostgreSQL schema
│   ├── nginx/
│   └── k6/               # Load tests
└── .github/workflows/    # CI/CD
```

---

## Principle

> Do not claim perfect detection. Build measurable, transparent, continuously improving accuracy with validation evidence.

---

Made with ♥ by **Yaksh Bhesaniya**
