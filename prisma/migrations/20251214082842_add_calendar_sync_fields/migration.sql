-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('BIDIRECTIONAL', 'EXPORT_ONLY', 'IMPORT_ONLY');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'ERROR', 'CONFLICT');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('CREATE_EVENT', 'UPDATE_EVENT', 'DELETE_EVENT', 'PULL_CHANGES', 'PUSH_CHANGES', 'RESOLVE_CONFLICT');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "CalendarProvider" ADD VALUE 'NOTION';

-- AlterTable
ALTER TABLE "CalendarIntegration" ADD COLUMN     "syncDirection" "SyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
ADD COLUMN     "syncToken" TEXT,
ADD COLUMN     "webhookExpiry" TIMESTAMP(3),
ADD COLUMN     "webhookId" TEXT;

-- CreateTable
CREATE TABLE "EventSync" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "localVersion" TIMESTAMP(3) NOT NULL,
    "remoteVersion" TIMESTAMP(3),
    "conflictData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncQueue" (
    "id" TEXT NOT NULL,
    "operation" "SyncOperation" NOT NULL,
    "eventId" TEXT,
    "integrationId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSync_eventId_idx" ON "EventSync"("eventId");

-- CreateIndex
CREATE INDEX "EventSync_integrationId_idx" ON "EventSync"("integrationId");

-- CreateIndex
CREATE INDEX "EventSync_provider_idx" ON "EventSync"("provider");

-- CreateIndex
CREATE INDEX "EventSync_syncStatus_idx" ON "EventSync"("syncStatus");

-- CreateIndex
CREATE INDEX "EventSync_externalId_idx" ON "EventSync"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSync_eventId_integrationId_key" ON "EventSync"("eventId", "integrationId");

-- CreateIndex
CREATE INDEX "SyncQueue_status_idx" ON "SyncQueue"("status");

-- CreateIndex
CREATE INDEX "SyncQueue_scheduledFor_idx" ON "SyncQueue"("scheduledFor");

-- CreateIndex
CREATE INDEX "SyncQueue_priority_idx" ON "SyncQueue"("priority");

-- AddForeignKey
ALTER TABLE "EventSync" ADD CONSTRAINT "EventSync_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSync" ADD CONSTRAINT "EventSync_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "CalendarIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
