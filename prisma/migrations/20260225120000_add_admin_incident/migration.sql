-- CreateTable
CREATE TABLE "AdminIncident" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminIncident_status_severity_createdAt_idx" ON "AdminIncident"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "AdminIncident_category_createdAt_idx" ON "AdminIncident"("category", "createdAt");

-- CreateIndex
CREATE INDEX "AdminIncident_sourceType_sourceId_idx" ON "AdminIncident"("sourceType", "sourceId");
