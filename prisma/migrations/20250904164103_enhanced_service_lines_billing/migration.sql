-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "contactPreferences" JSONB,
    "services" JSONB,
    "bixbyContactId" TEXT,
    "googleContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "service" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "organizerId" TEXT NOT NULL,
    "googleCalendarEventId" TEXT,
    "outlookCalendarEventId" TEXT,
    "voiceCommandData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "responseStatus" TEXT NOT NULL DEFAULT 'NEEDS_ACTION',
    "role" TEXT NOT NULL DEFAULT 'ATTENDEE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppointmentParticipant_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "readAt" DATETIME,
    "content" TEXT NOT NULL,
    "templateUsed" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoiceCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transcript" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "participantName" TEXT,
    "participantPhone" TEXT,
    "service" TEXT,
    "requestedDateTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "appointmentId" TEXT,
    "errorMessage" TEXT,
    "voiceProvider" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VoiceCommand_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tags" JSONB,
    "notes" TEXT,
    "projectType" TEXT,
    "serviceTypes" JSONB,
    "budget" REAL,
    "timeline" TEXT,
    "seasonalContract" BOOLEAN NOT NULL DEFAULT false,
    "recurringService" TEXT,
    "address" JSONB,
    "metadata" JSONB,
    "contactPreferences" JSONB,
    "personalInfo" JSONB,
    "serviceProfile" JSONB,
    "billingInfo" JSONB,
    "relationshipData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "serviceLineId" TEXT,
    "serviceDate" DATETIME NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceArea" TEXT,
    "completionStatus" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "billingAmount" REAL,
    "billingDate" DATETIME,
    "billingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClientServiceContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "serviceLineId" TEXT,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceCategory" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "period" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "contractValue" REAL,
    "frequency" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "billingDetails" JSONB,
    "seasonalInfo" JSONB,
    "nextScheduled" DATETIME,
    "lastCompleted" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientServiceContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientServiceContract_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "participantId" TEXT,
    "timestamp" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "actionItems" JSONB,
    "sentiment" TEXT NOT NULL,
    "subject" TEXT,
    "attachments" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Communication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Communication_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "content" TEXT NOT NULL,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "dueDate" DATETIME,
    "sentDate" DATETIME,
    "paidDate" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "nextActions" JSONB,
    "sentiment" TEXT,
    "priority" TEXT,
    "tags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "participants" JSONB,
    "relatedDocuments" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT,
    "scheduledDate" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "recurrencePattern" TEXT NOT NULL DEFAULT 'NONE',
    "recurrenceData" JSONB,
    "customInterval" INTEGER,
    "customIntervalUnit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "title" TEXT,
    "notes" TEXT,
    "outcome" TEXT,
    "actionItems" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "notificationsSent" JSONB,
    "nextReminderAt" DATETIME,
    "googleCalendarEventId" TEXT,
    "outlookCalendarEventId" TEXT,
    "parentFollowUpId" TEXT,
    "sourceAppointmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_parentFollowUpId_fkey" FOREIGN KEY ("parentFollowUpId") REFERENCES "FollowUp" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followUpId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "readAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "templateUsed" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUpNotification_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "businessHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "workingDays" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "defaultReminderDays" JSONB,
    "serviceConfigurations" JSONB,
    "enableSMSReminders" BOOLEAN NOT NULL DEFAULT true,
    "enableEmailReminders" BOOLEAN NOT NULL DEFAULT true,
    "googleCalendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "outlookCalendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CalendarIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarIntegration_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "serviceLineId" TEXT NOT NULL,
    "serviceRecordId" TEXT,
    "contractId" TEXT,
    "invoiceNumber" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "billingPeriod" TEXT NOT NULL,
    "billingDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "paidDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BillingRecord_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BillingRecord_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BillingRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ClientServiceContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Participant_phone_idx" ON "Participant"("phone");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_phone_key" ON "Participant"("phone");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_service_idx" ON "Appointment"("service");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentParticipant_appointmentId_participantId_key" ON "AppointmentParticipant"("appointmentId", "participantId");

-- CreateIndex
CREATE INDEX "NotificationLog_appointmentId_idx" ON "NotificationLog"("appointmentId");

-- CreateIndex
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "VoiceCommand_intent_idx" ON "VoiceCommand"("intent");

-- CreateIndex
CREATE INDEX "VoiceCommand_status_idx" ON "VoiceCommand"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRecord_participantId_key" ON "ClientRecord"("participantId");

-- CreateIndex
CREATE INDEX "ClientRecord_serviceId_idx" ON "ClientRecord"("serviceId");

-- CreateIndex
CREATE INDEX "ClientRecord_status_idx" ON "ClientRecord"("status");

-- CreateIndex
CREATE INDEX "ServiceRecord_clientId_idx" ON "ServiceRecord"("clientId");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceLineId_idx" ON "ServiceRecord"("serviceLineId");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceType_idx" ON "ServiceRecord"("serviceType");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceDate_idx" ON "ServiceRecord"("serviceDate");

-- CreateIndex
CREATE INDEX "ServiceRecord_billingStatus_idx" ON "ServiceRecord"("billingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceLine_slug_key" ON "ServiceLine"("slug");

-- CreateIndex
CREATE INDEX "ServiceLine_slug_idx" ON "ServiceLine"("slug");

-- CreateIndex
CREATE INDEX "ServiceLine_isActive_idx" ON "ServiceLine"("isActive");

-- CreateIndex
CREATE INDEX "ClientServiceContract_clientId_idx" ON "ClientServiceContract"("clientId");

-- CreateIndex
CREATE INDEX "ClientServiceContract_serviceId_idx" ON "ClientServiceContract"("serviceId");

-- CreateIndex
CREATE INDEX "ClientServiceContract_serviceLineId_idx" ON "ClientServiceContract"("serviceLineId");

-- CreateIndex
CREATE INDEX "ClientServiceContract_status_idx" ON "ClientServiceContract"("status");

-- CreateIndex
CREATE INDEX "ClientServiceContract_isActive_idx" ON "ClientServiceContract"("isActive");

-- CreateIndex
CREATE INDEX "Communication_clientId_idx" ON "Communication"("clientId");

-- CreateIndex
CREATE INDEX "Communication_timestamp_idx" ON "Communication"("timestamp");

-- CreateIndex
CREATE INDEX "Communication_purpose_idx" ON "Communication"("purpose");

-- CreateIndex
CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Conversation_clientId_idx" ON "Conversation"("clientId");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Conversation_priority_idx" ON "Conversation"("priority");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_timestamp_idx" ON "Message"("timestamp");

-- CreateIndex
CREATE INDEX "FollowUp_clientId_idx" ON "FollowUp"("clientId");

-- CreateIndex
CREATE INDEX "FollowUp_scheduledDate_idx" ON "FollowUp"("scheduledDate");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "FollowUp_category_idx" ON "FollowUp"("category");

-- CreateIndex
CREATE INDEX "FollowUp_nextReminderAt_idx" ON "FollowUp"("nextReminderAt");

-- CreateIndex
CREATE INDEX "FollowUpNotification_followUpId_idx" ON "FollowUpNotification"("followUpId");

-- CreateIndex
CREATE INDEX "FollowUpNotification_scheduledAt_idx" ON "FollowUpNotification"("scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUpNotification_status_idx" ON "FollowUpNotification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarIntegration_participantId_provider_key" ON "CalendarIntegration"("participantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRecord_invoiceNumber_key" ON "BillingRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingRecord_clientId_idx" ON "BillingRecord"("clientId");

-- CreateIndex
CREATE INDEX "BillingRecord_serviceLineId_idx" ON "BillingRecord"("serviceLineId");

-- CreateIndex
CREATE INDEX "BillingRecord_status_idx" ON "BillingRecord"("status");

-- CreateIndex
CREATE INDEX "BillingRecord_billingDate_idx" ON "BillingRecord"("billingDate");

-- CreateIndex
CREATE INDEX "BillingRecord_invoiceNumber_idx" ON "BillingRecord"("invoiceNumber");
