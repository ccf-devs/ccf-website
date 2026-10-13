-- CreateTable
CREATE TABLE "notification_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_notification_receipt" ON "notification_receipts"("notification_id", "admin_id");

-- CreateIndex
CREATE INDEX "idx_notification_receipts_admin_read" ON "notification_receipts"("admin_id", "read_at");

-- AddForeignKey
ALTER TABLE "notification_receipts" ADD CONSTRAINT "notification_receipts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_receipts" ADD CONSTRAINT "notification_receipts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: migrate existing historical read states for targeted notifications
INSERT INTO "notification_receipts" ("id", "notification_id", "admin_id", "read_at")
SELECT gen_random_uuid(), "id", "target_admin_id", "read_at"
FROM "notifications"
WHERE "target_admin_id" IS NOT NULL AND "read_at" IS NOT NULL
ON CONFLICT DO NOTHING;
