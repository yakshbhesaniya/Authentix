-- Authentix Database Schema
-- Run once at startup via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Users ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Analysis Jobs ─────────────────────────────────────────────────
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE job_type   AS ENUM ('analyze', 'humanize', 'full_report');

CREATE TABLE IF NOT EXISTS jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  type            job_type NOT NULL,
  status          job_status DEFAULT 'queued',
  input_text      TEXT,
  file_key        TEXT,           -- S3/MinIO object key
  file_name       TEXT,
  file_type       TEXT,
  error           TEXT,
  progress        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Analysis Results ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_results (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                UUID UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  plagiarism_score      NUMERIC(5,2),
  plagiarism_report     JSONB,
  ai_score              NUMERIC(5,2),
  ai_confidence_low     NUMERIC(5,2),
  ai_confidence_high    NUMERIC(5,2),
  ai_signals            JSONB,
  humanized_text        TEXT,
  humanize_validation   JSONB,
  raw_ingestion         JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Document Index ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_index (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
  title         TEXT,
  content_hash  TEXT UNIQUE,
  word_count    INTEGER,
  qdrant_ids    JSONB,           -- array of vector IDs in Qdrant
  indexed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── API Keys ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash    TEXT UNIQUE NOT NULL,
  label       TEXT,
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Metrics / Observability ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_metrics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service       TEXT NOT NULL,
  metric_name   TEXT NOT NULL,
  metric_value  NUMERIC,
  metadata      JSONB,
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_user_id     ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at  ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_job_id   ON analysis_results(job_id);
CREATE INDEX IF NOT EXISTS idx_metrics_service  ON model_metrics(service, metric_name);
