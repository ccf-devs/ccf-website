import { prisma } from "@/lib/db/client";
import { EventStatus, PaymentStatus, Prisma } from "@prisma/client";

/**
 * Standard audit actions for event management operations.
 */
export const EVENT_AUDIT_ACTIONS = {
  CREATED: "EVENT_CREATED",
  UPDATED: "EVENT_UPDATED",
  STATUS_CHANGED: "EVENT_STATUS_CHANGED",
} as const;

export type EventAuditAction =
  (typeof EVENT_AUDIT_ACTIONS)[keyof typeof EVENT_AUDIT_ACTIONS];

/**
 * Standard audit actions for payment operations.
 */
export const PAYMENT_AUDIT_ACTIONS = {
  VERIFIED: "PAYMENT_VERIFIED",
  REJECTED: "PAYMENT_REJECTED",
} as const;

export type PaymentAuditAction =
  (typeof PAYMENT_AUDIT_ACTIONS)[keyof typeof PAYMENT_AUDIT_ACTIONS];

export interface PaymentAuditMetadata {
  [key: string]: unknown;
  paymentId: string;
  registrationId: string;
  registrationCode: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  userReference?: string | null;
  notes?: string | null;
}

export function buildPaymentAuditMetadata(params: {
  paymentId: string;
  registrationId: string;
  registrationCode: string;
  amount: string | number;
  currency?: string;
  status: PaymentStatus;
  userReference?: string | null;
  notes?: string | null;
}): PaymentAuditMetadata {
  return {
    paymentId: params.paymentId,
    registrationId: params.registrationId,
    registrationCode: params.registrationCode,
    amount: String(params.amount),
    currency: params.currency || "INR",
    status: params.status,
    userReference: params.userReference ? params.userReference.trim() : null,
    notes: params.notes ? params.notes.trim() : null,
  };
}

/**
 * Standard audit actions for recruitment operations.
 */
export const RECRUITMENT_AUDIT_ACTIONS = {
  SETTINGS_UPDATED: "RECRUITMENT_SETTINGS_UPDATED",
  STATUS_CHANGED: "RECRUITMENT_STATUS_CHANGED",
  APPLICATION_DELETED: "RECRUITMENT_APPLICATION_DELETED",
} as const;

export type RecruitmentAuditAction =
  (typeof RECRUITMENT_AUDIT_ACTIONS)[keyof typeof RECRUITMENT_AUDIT_ACTIONS];

export interface RecruitmentAuditMetadata {
  [key: string]: unknown;
  applicationId?: string;
  departmentId?: string;
  departmentName?: string;
  fromStatus?: string;
  toStatus?: string;
  isOpen?: boolean;
  notes?: string | null;
}

export function buildRecruitmentAuditMetadata(params: {
  applicationId?: string;
  departmentId?: string;
  departmentName?: string;
  fromStatus?: string;
  toStatus?: string;
  isOpen?: boolean;
  notes?: string | null;
}): RecruitmentAuditMetadata {
  return {
    applicationId: params.applicationId,
    departmentId: params.departmentId,
    departmentName: params.departmentName,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    isOpen: params.isOpen,
    notes: params.notes ? params.notes.trim() : null,
  };
}

/**
 * Standard audit actions for department management operations.
 */
export const DEPARTMENT_AUDIT_ACTIONS = {
  INITIALIZED: "DEPARTMENT_INITIALIZED",
  UPDATED: "DEPARTMENT_UPDATED",
  STATUS_CHANGED: "DEPARTMENT_STATUS_CHANGED",
} as const;

export type DepartmentAuditAction =
  (typeof DEPARTMENT_AUDIT_ACTIONS)[keyof typeof DEPARTMENT_AUDIT_ACTIONS];

export interface DepartmentAuditMetadata {
  [key: string]: unknown;
  departmentId?: string;
  departmentName?: string;
  slug?: string;
  fromActive?: boolean;
  toActive?: boolean;
  createdCount?: number;
  initializedSlugs?: string[];
  changedFields?: string[];
}

/**
 * Standard audit actions for member directory operations.
 */
export const MEMBER_AUDIT_ACTIONS = {
  CREATED: "MEMBER_CREATED",
  UPDATED: "MEMBER_UPDATED",
  TRANSFERRED: "MEMBER_TRANSFERRED",
  STATUS_CHANGED: "MEMBER_STATUS_CHANGED",
  DEACTIVATED: "MEMBER_DEACTIVATED",
} as const;

export type MemberAuditAction =
  (typeof MEMBER_AUDIT_ACTIONS)[keyof typeof MEMBER_AUDIT_ACTIONS];

export interface MemberAuditMetadata {
  [key: string]: unknown;
  memberId?: string;
  memberName?: string;
  position?: string | null;
  departmentId?: string;
  departmentName?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  fromVisibility?: boolean;
  toVisibility?: boolean;
  changedFields?: string[];
}

/**
 * Standard audit actions for media management operations.
 */
export const MEDIA_AUDIT_ACTIONS = {
  UPLOADED: "MEDIA_UPLOADED",
  UPDATED: "MEDIA_UPDATED",
  VISIBILITY_CHANGED: "MEDIA_VISIBILITY_CHANGED",
  DELETED: "MEDIA_DELETED",
} as const;

export type MediaAuditAction =
  (typeof MEDIA_AUDIT_ACTIONS)[keyof typeof MEDIA_AUDIT_ACTIONS];

export interface MediaAuditMetadata {
  [key: string]: unknown;
  mediaId?: string;
  objectKey?: string;
  mimeType?: string;
  eventId?: string | null;
  eventName?: string | null;
  fromVisibility?: boolean;
  toVisibility?: boolean;
  changedFields?: string[];
}

/**
 * Explicit safe allowlist metadata interfaces for event operations.
 * Strictly guarantees that no sensitive fields (RRNs, phone numbers,
 * auth tokens, secrets) are ever stored in audit metadata.
 */
export interface EventCreatedAuditMetadata {
  [key: string]: unknown;
  eventId: string;
  eventName: string;
  slug: string;
  status: EventStatus;
}

export interface EventStatusChangedAuditMetadata {
  [key: string]: unknown;
  eventId: string;
  fromStatus: EventStatus;
  toStatus: EventStatus;
}

export interface EventUpdatedAuditMetadata {
  [key: string]: unknown;
  eventId: string;
  changedFields: string[];
}

/**
 * Explicit safe metadata builders conforming to allowlist requirements.
 */
export function buildEventCreatedMetadata(params: {
  eventId: string;
  eventName: string;
  slug: string;
  status: EventStatus;
}): EventCreatedAuditMetadata {
  return {
    eventId: params.eventId,
    eventName: params.eventName,
    slug: params.slug,
    status: params.status,
  };
}

export function buildEventStatusChangedMetadata(params: {
  eventId: string;
  fromStatus: EventStatus;
  toStatus: EventStatus;
}): EventStatusChangedAuditMetadata {
  return {
    eventId: params.eventId,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
  };
}

export function buildEventUpdatedMetadata(params: {
  eventId: string;
  changedFields: string[];
}): EventUpdatedAuditMetadata {
  // Allowlist of field names only; strictly no values or sensitive properties
  const safeFieldNames = params.changedFields
    .map((f) => String(f).trim())
    .filter((f) => !/secret|token|password|rrn|phone|code/i.test(f));

  return {
    eventId: params.eventId,
    changedFields: safeFieldNames,
  };
}

/**
 * Forbidden sensitive substrings for defense-in-depth sanitization.
 */
const FORBIDDEN_METADATA_KEYS = [
  "password",
  "secret",
  "token",
  "totp",
  "recovery",
  "rrn",
  "phone",
  "phonenumber",
  "rawresponse",
  "key",
  "auth",
  "cookie",
];

/**
 * Defense-in-depth sanitization: strips any key that matches forbidden sensitive patterns.
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, any> | null | undefined
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null;

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isForbidden = FORBIDDEN_METADATA_KEYS.some((f) => lowerKey.includes(f));
    if (!isForbidden) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        sanitized[key] = sanitizeAuditMetadata(val as Record<string, any>);
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
}

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Persists an audit log record to the database.
 * Accepts an optional Prisma transaction client for atomic execution.
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
  dbClient?: Prisma.TransactionClient
) {
  const client = dbClient || prisma;

  // Defense-in-depth sanitization applied to whatever metadata was passed
  const safeMetadata = params.metadata
    ? (sanitizeAuditMetadata(params.metadata) as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  return await client.auditLog.create({
    data: {
      actorId: params.actorId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      metadata: safeMetadata,
    },
  });
}
