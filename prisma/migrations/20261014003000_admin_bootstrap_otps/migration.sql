-- CreateTable
CREATE TABLE "admin_bootstrap_otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "purpose" VARCHAR(50) NOT NULL DEFAULT 'INITIAL_BOOTSTRAP',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "redeemed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_bootstrap_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_admin_bootstrap_otp_admin" ON "admin_bootstrap_otps"("admin_id", "purpose");

-- AddForeignKey
ALTER TABLE "admin_bootstrap_otps" ADD CONSTRAINT "admin_bootstrap_otps_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
