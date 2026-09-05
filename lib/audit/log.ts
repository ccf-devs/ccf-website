import { prisma } from "@/lib/db/client";
import { EventStatus, Prisma } from "@prisma/client";

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
