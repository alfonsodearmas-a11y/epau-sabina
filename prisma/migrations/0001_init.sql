-- CreateEnum
CREATE TYPE "IndicatorCategory" AS ENUM ('real_economy', 'external', 'prices', 'monetary', 'fiscal', 'debt', 'social');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('annual', 'quarterly', 'monthly');

-- CreateEnum
CREATE TYPE "Scenario" AS ENUM ('actual', 'budget', 'revised', 'projection');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('info', 'warning', 'error');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "indicators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IndicatorCategory" NOT NULL,
    "subcategory" TEXT,
    "unit" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "source" TEXT NOT NULL,
    "source_tab" TEXT NOT NULL,
    "caveat" TEXT,
    "latest_observation_date" DATE,
    "earliest_observation_date" DATE,
    "last_ingested_at" TIMESTAMP(3),

    CONSTRAINT "indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" BIGSERIAL NOT NULL,
    "indicator_id" TEXT NOT NULL,
    "period_date" DATE NOT NULL,
    "period_label" TEXT NOT NULL,
    "value" DECIMAL(24,6),
    "is_estimate" BOOLEAN NOT NULL DEFAULT false,
    "scenario" "Scenario" NOT NULL DEFAULT 'actual',

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IndicatorCategory",
    "source" TEXT,
    "source_tab" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_table_rows" (
    "id" BIGSERIAL NOT NULL,
    "table_id" TEXT NOT NULL,
    "row_label" TEXT NOT NULL,
    "group_label" TEXT,
    "column_label" TEXT NOT NULL,
    "value" DECIMAL(24,6),
    "value_text" TEXT,
    "unit" TEXT,
    "note" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "comparison_table_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "workbook_filename" TEXT NOT NULL,
    "workbook_size_bytes" BIGINT,
    "indicators_upserted" INTEGER NOT NULL DEFAULT 0,
    "observations_upserted" INTEGER NOT NULL DEFAULT 0,
    "comparison_tables_upserted" INTEGER NOT NULL DEFAULT 0,
    "issues_count" INTEGER NOT NULL DEFAULT 0,
    "status" "IngestionStatus" NOT NULL DEFAULT 'running',
    "notes" TEXT,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_issues" (
    "id" BIGSERIAL NOT NULL,
    "run_id" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "row" INTEGER,
    "col" INTEGER,
    "cell_ref" TEXT,
    "raw_value" TEXT,
    "reason" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'warning',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_sheet_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "run_id" TEXT NOT NULL,
    "sheet_name" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "col_count" INTEGER NOT NULL,
    "cells" JSONB NOT NULL,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_sheet_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_queries" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query_text" TEXT NOT NULL,
    "indicator_ids" TEXT[],
    "config" JSONB,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "indicators_category_idx" ON "indicators"("category");

-- CreateIndex
CREATE INDEX "indicators_frequency_idx" ON "indicators"("frequency");

-- CreateIndex
CREATE INDEX "indicators_source_idx" ON "indicators"("source");

-- CreateIndex
CREATE INDEX "indicators_source_tab_idx" ON "indicators"("source_tab");

-- CreateIndex
CREATE INDEX "observations_period_date_idx" ON "observations"("period_date");

-- CreateIndex
CREATE INDEX "observations_indicator_id_period_date_idx" ON "observations"("indicator_id", "period_date");

-- CreateIndex
CREATE UNIQUE INDEX "observations_indicator_id_period_date_scenario_key" ON "observations"("indicator_id", "period_date", "scenario");

-- CreateIndex
CREATE INDEX "comparison_tables_source_tab_idx" ON "comparison_tables"("source_tab");

-- CreateIndex
CREATE INDEX "comparison_table_rows_table_id_order_index_idx" ON "comparison_table_rows"("table_id", "order_index");

-- CreateIndex
CREATE INDEX "ingestion_issues_run_id_idx" ON "ingestion_issues"("run_id");

-- CreateIndex
CREATE INDEX "ingestion_issues_severity_idx" ON "ingestion_issues"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "raw_sheet_snapshots_run_id_sheet_name_key" ON "raw_sheet_snapshots"("run_id", "sheet_name");

-- CreateIndex
CREATE INDEX "saved_queries_user_email_idx" ON "saved_queries"("user_email");

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "indicators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_table_rows" ADD CONSTRAINT "comparison_table_rows_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "comparison_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_issues" ADD CONSTRAINT "ingestion_issues_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ingestion_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_sheet_snapshots" ADD CONSTRAINT "raw_sheet_snapshots_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ingestion_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

