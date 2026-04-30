-- AddTable: JobRecord
-- Additive migration — no existing tables or columns modified.

CREATE TABLE "JobRecord" (
    "id"          TEXT        NOT NULL,
    "type"        TEXT        NOT NULL,
    "status"      TEXT        NOT NULL DEFAULT 'pending',
    "payload"     TEXT        NOT NULL,
    "attempts"    INTEGER     NOT NULL DEFAULT 0,
    "error"       TEXT,
    "enqueuedAt"  TIMESTAMP(3) NOT NULL,
    "startedAt"   TIMESTAMP(3),
    "finishedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobRecord_type_status_idx" ON "JobRecord"("type", "status");
CREATE INDEX "JobRecord_enqueuedAt_idx"  ON "JobRecord"("enqueuedAt");
