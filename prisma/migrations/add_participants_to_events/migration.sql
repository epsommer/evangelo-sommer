-- Migration: Add participants field to Event model
-- This migration adds support for tracking event participants separately from clients

-- Add participants column to Event table
-- participants is a JSON array of strings (email addresses or names)
ALTER TABLE "Event" ADD COLUMN "participants" JSONB;

-- Add a comment to clarify the distinction
COMMENT ON COLUMN "Event"."clientId" IS 'CRM contact this event is FOR';
COMMENT ON COLUMN "Event"."clientName" IS 'Name of the CRM contact this event is FOR';
COMMENT ON COLUMN "Event"."participants" IS 'JSON array of people ATTENDING the event (can include emails or names)';
