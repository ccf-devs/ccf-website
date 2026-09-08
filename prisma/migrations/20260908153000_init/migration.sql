-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('CCF_ADMIN', 'IT_ADMIN');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('INTERNAL', 'EXTERNAL', 'NONE');

-- CreateEnum
CREATE TYPE "RegistrationMethod" AS ENUM ('BUILT_IN', 'GOOGLE_FORM', 'NONE');

-- CreateEnum
CREATE TYPE "EventCapacityMode" AS ENUM ('PARTICIPANTS', 'TEAMS', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('CRESCENT', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FormVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'TIME', 'DATETIME', 'SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'FILE');

-- CreateEnum
CREATE TYPE "FieldScope" AS ENUM ('REGISTRATION', 'PARTICIPANT', 'TEAM', 'TEAM_MEMBER');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MANUAL_UPI', 'PROVIDER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RecruitmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "role" "AdminRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "position" VARCHAR(150),
    "department_id" UUID NOT NULL,
    "photo_media_id" UUID,
    "bio" TEXT,
    "social_url" TEXT,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "venue" VARCHAR(300),
    "capacity" INTEGER,
    "capacity_mode" "EventCapacityMode" NOT NULL DEFAULT 'UNLIMITED',
    "registration_method" "RegistrationMethod" NOT NULL DEFAULT 'NONE',
    "registration_mode" "RegistrationMode" NOT NULL DEFAULT 'NONE',
    "eligibility_crescent" BOOLEAN NOT NULL DEFAULT false,
    "eligibility_external" BOOLEAN NOT NULL DEFAULT false,
    "registration_opens_at" TIMESTAMPTZ,
    "registration_closes_at" TIMESTAMPTZ,
    "active_form_version_id" UUID,
    "payment_mode" "PaymentMode" NOT NULL DEFAULT 'FREE',
    "payment_method" "PaymentMethod",
    "fee_amount" DECIMAL(10,2),
    "upi_id" VARCHAR(255),
    "payee_name" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_content" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "description_rich" TEXT,
    "rules_rich" TEXT,
    "instructions_rich" TEXT,
    "eligibility_rich" TEXT,
    "notes_rich" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_fields" (
    "id" UUID NOT NULL,
    "form_version_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(250) NOT NULL,
    "type" "FieldType" NOT NULL,
    "field_scope" "FieldScope" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "validation" JSONB,
    "conditional_logic" JSONB,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "event_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "form_version_id" UUID NOT NULL,
    "registration_type" "RegistrationType" NOT NULL,
    "participant_type" "ParticipantType" NOT NULL,
    "participant_name" VARCHAR(200) NOT NULL,
    "college_normalized" VARCHAR(250),
    "identifier_normalized" VARCHAR(100),
    "status" "RegistrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "registration_code" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_responses" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "event_field_id" UUID NOT NULL,
    "value_text" TEXT,
    "value_json" JSONB,

    CONSTRAINT "registration_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "name" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "participant_type" "ParticipantType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "college_normalized" VARCHAR(250),
    "identifier_normalized" VARCHAR(100),
    "phone" VARCHAR(30),
    "academic_department" VARCHAR(150),
    "year" VARCHAR(50),
    "position" VARCHAR(100),
    "is_leader" BOOLEAN NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "participant_type" "ParticipantType" NOT NULL,
    "college_normalized" VARCHAR(250),
    "identifier_normalized" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "upi_id" VARCHAR(255),
    "payee_name" VARCHAR(200),
    "payment_uri" TEXT,
    "user_reference" VARCHAR(200),
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_applications" (
    "id" UUID NOT NULL,
    "rrn_normalized" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "department_id" UUID NOT NULL,
    "academic_department" VARCHAR(150) NOT NULL,
    "year" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "status" "RecruitmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recruitment_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "event_id" UUID,
    "object_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "alt_text" VARCHAR(300),
    "width" INTEGER,
    "height" INTEGER,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "target_admin_id" UUID,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" VARCHAR(150) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_verification_tokens" (
    "identifier" VARCHAR(320) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "admin_totp_secrets" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_totp_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_recovery_codes" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_slug_key" ON "departments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "members_department_id_idx" ON "members"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "idx_events_reg_opens_at" ON "events"("registration_opens_at");

-- CreateIndex
CREATE INDEX "idx_events_reg_closes_at" ON "events"("registration_closes_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_content_event_id_key" ON "event_content"("event_id");

-- CreateIndex
CREATE INDEX "form_versions_event_id_idx" ON "form_versions"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_event_id_version_number_key" ON "form_versions"("event_id", "version_number");

-- CreateIndex
CREATE INDEX "event_fields_form_version_id_idx" ON "event_fields"("form_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_fields_form_version_id_key_key" ON "event_fields"("form_version_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_registration_code_key" ON "registrations"("registration_code");

-- CreateIndex
CREATE INDEX "idx_registrations_event_created" ON "registrations"("event_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_registrations_form_version" ON "registrations"("form_version_id");

-- CreateIndex
CREATE INDEX "idx_registrations_status" ON "registrations"("status");

-- CreateIndex
CREATE INDEX "idx_reg_responses_reg_id" ON "registration_responses"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_responses_registration_id_event_field_id_key" ON "registration_responses"("registration_id", "event_field_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_registration_id_key" ON "teams"("registration_id");

-- CreateIndex
CREATE INDEX "idx_teams_registration_id" ON "teams"("registration_id");

-- CreateIndex
CREATE INDEX "idx_team_members_team_id" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "idx_event_participants_event_id" ON "event_participants"("event_id");

-- CreateIndex
CREATE INDEX "idx_event_participants_reg_id" ON "event_participants"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_registration_id_key" ON "payments"("registration_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_recruitment_apps_status" ON "recruitment_applications"("status");

-- CreateIndex
CREATE INDEX "idx_media_event_id" ON "media"("event_id");

-- CreateIndex
CREATE INDEX "idx_notifications_admin_read" ON "notifications"("target_admin_id", "read_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_verification_tokens_token_key" ON "admin_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_verification_tokens_identifier_token_key" ON "admin_verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_totp_secrets_admin_id_key" ON "admin_totp_secrets"("admin_id");

-- CreateIndex
CREATE INDEX "idx_recovery_codes_admin_id" ON "admin_recovery_codes"("admin_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_photo_media_id_fkey" FOREIGN KEY ("photo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_content" ADD CONSTRAINT "event_content_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (Circular FK ordering per prisma/migrations/README.md)
-- Added after form_versions table creation and form_versions_event_id_fkey constraint
ALTER TABLE "events" ADD CONSTRAINT "events_active_form_version_id_fkey" FOREIGN KEY ("active_form_version_id") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_fields" ADD CONSTRAINT "event_fields_form_version_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_form_version_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_responses" ADD CONSTRAINT "registration_responses_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_responses" ADD CONSTRAINT "registration_responses_event_field_id_fkey" FOREIGN KEY ("event_field_id") REFERENCES "event_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_applications" ADD CONSTRAINT "recruitment_applications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_admin_id_fkey" FOREIGN KEY ("target_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_totp_secrets" ADD CONSTRAINT "admin_totp_secrets_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_recovery_codes" ADD CONSTRAINT "admin_recovery_codes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- RAW SQL CONSTRAINTS & INDEXES (from prisma/migrations/README.md)
-- =============================================================================

-- Partial Unique Indexes
-- 1. event_participants — Crescent identity uniqueness: one active registration per event
CREATE UNIQUE INDEX "ep_crescent_unique"
  ON "event_participants"("event_id", "identifier_normalized")
  WHERE "participant_type" = 'CRESCENT';

-- 2. event_participants — External identity uniqueness: one active registration per event
CREATE UNIQUE INDEX "ep_external_unique"
  ON "event_participants"("event_id", "college_normalized", "identifier_normalized")
  WHERE "participant_type" = 'EXTERNAL';

-- 3. recruitment_applications — Active RRN uniqueness: one active application per student
CREATE UNIQUE INDEX "ra_active_rrn_unique"
  ON "recruitment_applications"("rrn_normalized")
  WHERE "status" = 'ACTIVE';

-- CHECK Constraints
-- 1. events: capacity must be positive when not null
ALTER TABLE "events"
  ADD CONSTRAINT "chk_events_capacity" CHECK ("capacity" IS NULL OR "capacity" > 0);

-- 2. payments: amount must be positive
ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_amount" CHECK ("amount" > 0);

-- 3. payments: currency must be INR
ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_currency" CHECK ("currency" = 'INR');

-- 4. event_fields: display_order must be non-negative
ALTER TABLE "event_fields"
  ADD CONSTRAINT "chk_event_fields_display_order" CHECK ("display_order" >= 0);

-- 5. members: display_order must be non-negative
ALTER TABLE "members"
  ADD CONSTRAINT "chk_members_display_order" CHECK ("display_order" >= 0);

-- 6. media: display_order must be non-negative
ALTER TABLE "media"
  ADD CONSTRAINT "chk_media_display_order" CHECK ("display_order" >= 0);

-- 7. form_versions: version_number must be positive
ALTER TABLE "form_versions"
  ADD CONSTRAINT "chk_form_versions_version_number" CHECK ("version_number" > 0);
