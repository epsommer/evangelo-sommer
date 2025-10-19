-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDateTime" TEXT NOT NULL,
    "endDateTime" TEXT,
    "duration" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "isMultiDay" BOOLEAN NOT NULL DEFAULT false,
    "notifications" JSONB,
    "recurrence" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "parentEventId" TEXT,
    "status" TEXT,
    "service" TEXT,
    "scheduledDate" TEXT,
    "goalTimeframe" TEXT,
    "progressTarget" REAL,
    "currentProgress" REAL,
    "deadline" TEXT,
    "dependencies" JSONB,
    "googleCalendarEventId" TEXT,
    "outlookCalendarEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Event_startDateTime_idx" ON "Event"("startDateTime");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_priority_idx" ON "Event"("priority");

-- CreateIndex
CREATE INDEX "Event_clientId_idx" ON "Event"("clientId");

-- CreateIndex
CREATE INDEX "Event_isRecurring_idx" ON "Event"("isRecurring");

-- CreateIndex
CREATE INDEX "Event_parentEventId_idx" ON "Event"("parentEventId");
