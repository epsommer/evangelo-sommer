-- AlterTable
ALTER TABLE "CalendarIntegration" ADD COLUMN "calendarEmail" TEXT;
ALTER TABLE "CalendarIntegration" ADD COLUMN "calendarName" TEXT;
ALTER TABLE "CalendarIntegration" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "CalendarIntegration" ADD COLUMN "lastSyncError" TEXT;

-- CreateTable
CREATE TABLE "ConflictResolution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conflictId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "userId" TEXT,
    "resolutionType" TEXT NOT NULL,
    "affectedEventIds" TEXT NOT NULL,
    "resolutionData" JSONB,
    "conflictMessage" TEXT,
    "resolvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "BillingDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentNumber" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT,
    "serviceType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillingDocument_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ConflictResolution_conflictType_idx" ON "ConflictResolution"("conflictType");

-- CreateIndex
CREATE INDEX "ConflictResolution_resolvedAt_idx" ON "ConflictResolution"("resolvedAt");

-- CreateIndex
CREATE INDEX "ConflictResolution_conflictId_resolutionType_idx" ON "ConflictResolution"("conflictId", "resolutionType");

-- CreateIndex
CREATE UNIQUE INDEX "ConflictResolution_conflictId_key" ON "ConflictResolution"("conflictId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingDocument_documentNumber_key" ON "BillingDocument"("documentNumber");

-- CreateIndex
CREATE INDEX "BillingDocument_clientId_idx" ON "BillingDocument"("clientId");

-- CreateIndex
CREATE INDEX "BillingDocument_conversationId_idx" ON "BillingDocument"("conversationId");

-- CreateIndex
CREATE INDEX "BillingDocument_status_idx" ON "BillingDocument"("status");

-- CreateIndex
CREATE INDEX "BillingDocument_documentType_idx" ON "BillingDocument"("documentType");

-- CreateIndex
CREATE INDEX "BillingDocument_date_idx" ON "BillingDocument"("date");

-- CreateIndex
CREATE INDEX "CalendarIntegration_participantId_idx" ON "CalendarIntegration"("participantId");

-- CreateIndex
CREATE INDEX "CalendarIntegration_isActive_idx" ON "CalendarIntegration"("isActive");
