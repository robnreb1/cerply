-- Add content_versions table for track changes UI
CREATE TABLE IF NOT EXISTS "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"change_type" text NOT NULL,
	"change_prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	CONSTRAINT "content_versions_change_type_check" CHECK (change_type IN ('create', 'update', 'refine'))
);

CREATE INDEX IF NOT EXISTS "idx_content_versions_section" ON "content_versions" USING btree ("section_id");
CREATE INDEX IF NOT EXISTS "idx_content_versions_module" ON "content_versions" USING btree ("module_id");

ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "module_sections"("id") ON DELETE cascade;
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE cascade;

