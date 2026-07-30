-- Migration: bank_connection_project_scope
-- Adds project scope, connection type, institution metadata, denormalized account
-- info, and webhook_url to BankConnection.
-- All new columns are nullable or have defaults — zero data loss for existing rows.

-- Existing rows will get:
--   projectId       = NULL      (portfolio-wide connection)
--   connectionType  = 'rent_deposits'  (safe default)
--   institutionName = NULL
--   institutionId   = NULL
--   accountId       = NULL
--   accountName     = NULL
--   accountMask     = NULL
--   webhookUrl      = NULL
--   itemId          = NULL

ALTER TABLE "BankConnection"
  ADD COLUMN IF NOT EXISTS "projectId"       TEXT,
  ADD COLUMN IF NOT EXISTS "itemId"          TEXT,
  ADD COLUMN IF NOT EXISTS "connectionType"  TEXT NOT NULL DEFAULT 'rent_deposits',
  ADD COLUMN IF NOT EXISTS "institutionName" TEXT,
  ADD COLUMN IF NOT EXISTS "institutionId"   TEXT,
  ADD COLUMN IF NOT EXISTS "accountId"       TEXT,
  ADD COLUMN IF NOT EXISTS "accountName"     TEXT,
  ADD COLUMN IF NOT EXISTS "accountMask"     TEXT,
  ADD COLUMN IF NOT EXISTS "webhookUrl"      TEXT;

-- Unique constraint on itemId (nullable — only enforced when non-NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "BankConnection_itemId_key"
  ON "BankConnection"("itemId")
  WHERE "itemId" IS NOT NULL;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "BankConnection_projectId_idx"
  ON "BankConnection"("projectId");

CREATE INDEX IF NOT EXISTS "BankConnection_connectionType_idx"
  ON "BankConnection"("connectionType");

CREATE INDEX IF NOT EXISTS "BankConnection_userId_status_idx"
  ON "BankConnection"("userId", "status");

-- Extend status comment (documentation only — no SQL change needed):
-- Valid values: 'active' | 'paused' | 'error'
-- 'paused' means sync is skipped; connection remains credentialed.
