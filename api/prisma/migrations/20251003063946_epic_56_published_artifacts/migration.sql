-- AlterTable
ALTER TABLE "admin_items" ADD COLUMN "lock_hash" TEXT;

-- CreateTable
CREATE TABLE "published_artifacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "published_artifacts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "admin_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "published_artifacts_item_id_created_at_idx" ON "published_artifacts"("item_id", "created_at" DESC);
