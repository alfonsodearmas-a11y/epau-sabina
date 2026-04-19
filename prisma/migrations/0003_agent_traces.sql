-- Agent layer: sessions, traces, and search_catalog FTS support.
-- Paste into Supabase Dashboard → SQL Editor → Run.

-- ================================================================
-- 1. Agent sessions and traces
-- ================================================================

-- CreateEnum
CREATE TYPE "AgentTraceRole" AS ENUM ('user', 'assistant', 'tool_call', 'tool_result', 'system_event');

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_turn_at" TIMESTAMP(3),
    "turn_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_sessions_user_email_idx" ON "agent_sessions"("user_email");
CREATE INDEX "agent_sessions_started_at_idx" ON "agent_sessions"("started_at");
CREATE INDEX "agent_sessions_last_turn_at_idx" ON "agent_sessions"("last_turn_at");

-- CreateTable
CREATE TABLE "agent_traces" (
    "id" BIGSERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "turn_index" INTEGER NOT NULL,
    "step_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "AgentTraceRole" NOT NULL,
    "tool_name" TEXT,
    "tool_call_id" TEXT,
    "content" JSONB NOT NULL,
    "latency_ms" INTEGER,
    "token_count_input" INTEGER,
    "token_count_output" INTEGER,
    "model_id" TEXT,
    "prompt_cache_hit" BOOLEAN,
    "stop_reason" TEXT,
    "error_code" TEXT,
    "error_detail" TEXT,

    CONSTRAINT "agent_traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_traces_session_id_turn_index_step_index_idx" ON "agent_traces"("session_id", "turn_index", "step_index");
CREATE INDEX "agent_traces_user_email_created_at_idx" ON "agent_traces"("user_email", "created_at");
CREATE INDEX "agent_traces_tool_name_idx" ON "agent_traces"("tool_name");
CREATE INDEX "agent_traces_role_idx" ON "agent_traces"("role");

-- AddForeignKey
ALTER TABLE "agent_traces"
  ADD CONSTRAINT "agent_traces_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "agent_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ================================================================
-- 2. Full-text search + trigram support for search_catalog
-- ================================================================

-- Trigram extension (FTS is built-in)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Generated FTS columns. STORED so they survive restarts and index scans are free.
ALTER TABLE "indicators"
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("id", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("subcategory", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("source", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("caveat", '')), 'D')
  ) STORED;

ALTER TABLE "comparison_tables"
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("id", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("source", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("source_tab", '')), 'D')
  ) STORED;

-- GIN indexes for FTS
CREATE INDEX IF NOT EXISTS indicators_search_tsv_idx ON "indicators" USING gin(search_tsv);
CREATE INDEX IF NOT EXISTS comparison_tables_search_tsv_idx ON "comparison_tables" USING gin(search_tsv);

-- Trigram indexes for fuzzy / prefix matching on id + name
CREATE INDEX IF NOT EXISTS indicators_id_trgm_idx ON "indicators" USING gin ("id" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS indicators_name_trgm_idx ON "indicators" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comparison_tables_id_trgm_idx ON "comparison_tables" USING gin ("id" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comparison_tables_name_trgm_idx ON "comparison_tables" USING gin ("name" gin_trgm_ops);
