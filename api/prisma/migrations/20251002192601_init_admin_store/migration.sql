-- CreateTable
CREATE TABLE "admin_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "admin_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "title" TEXT,
    "url" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "meta" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "admin_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "admin_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_events_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "admin_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "admin_items_status_created_at_idx" ON "admin_items"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_items_source_id_created_at_idx" ON "admin_items"("source_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_events_item_id_created_at_idx" ON "admin_events"("item_id", "created_at" DESC);
