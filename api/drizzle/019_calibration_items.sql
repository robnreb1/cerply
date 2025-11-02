-- Migration: 019_calibration_items
-- Description: Add calibration_items table for Build Workspace micro-lessons and assessments
-- Date: 2025-11-01

-- Create calibration_items table
CREATE TABLE IF NOT EXISTS "calibration_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module_id" uuid NOT NULL,
  "item_type" text NOT NULL,
  "difficulty" integer DEFAULT 5 NOT NULL,
  "item_data" jsonb NOT NULL,
  "order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "calibration_items_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE,
  CONSTRAINT "calibration_items_type_check" CHECK (item_type IN ('lesson', 'quiz')),
  CONSTRAINT "calibration_items_difficulty_check" CHECK (difficulty >= 1 AND difficulty <= 10)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_calibration_items_module" ON "calibration_items" USING btree ("module_id" ASC NULLS LAST);

-- Add comment
COMMENT ON TABLE "calibration_items" IS 'Build Workspace: Generated micro-lessons and assessments displayed in Calibration pane before module deployment';

