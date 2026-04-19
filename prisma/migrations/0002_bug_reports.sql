-- Bug reports filed by analysts directly from chart cards in the workbench.
CREATE TABLE IF NOT EXISTS bug_reports (
  id               TEXT PRIMARY KEY,
  user_email       TEXT NOT NULL,
  indicator_ids    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  date_range_start TEXT,
  date_range_end   TEXT,
  note             TEXT NOT NULL,
  resolved         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bug_reports_user_email_idx ON bug_reports(user_email);
CREATE INDEX IF NOT EXISTS bug_reports_resolved_idx   ON bug_reports(resolved);
