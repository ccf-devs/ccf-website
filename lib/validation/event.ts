import { z } from "zod";
import {
  EventStatus,
  EventCapacityMode,
  RegistrationMode,
  RegistrationMethod,
  PaymentMode,
  PaymentMethod,
} from "@prisma/client";

/**
 * Canonical CCF Event Status Lifecycle Transitions.
 * Source of Truth: CCF Product Engineering Handbook v0.5 & DB Constraints.
 *
 * Rules:
 * - DRAFT: Initial state. Can be published once complete, or archived.
 * - PUBLISHED: Active event. Can be closed (registration/event ended), reverted to draft, or archived.
 * - CLOSED: Registrations or event completed. Can be reopened (re-published) or archived.
 * - ARCHIVED: Terminal non-destructive state. Once archived, no transitions are permitted.
 * - Events are NEVER hard-deleted.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.ARCHIVED],
  [EventStatus.PUBLISHED]: [EventStatus.CLOSED, EventStatus.DRAFT, EventStatus.ARCHIVED],
  [EventStatus.CLOSED]: [EventStatus.PUBLISHED, EventStatus.ARCHIVED],
  [EventStatus.ARCHIVED]: [], // Terminal state
} as const;

/**
 * Validates whether a requested lifecycle transition is permitted.
 * Transitioning to the same status is always a no-op (permitted).
 */
export function isValidEventStatusTransition(
  currentStatus: EventStatus,
  nextStatus: EventStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}

/**
 * Helper to coerce and validate ISO date string or Date object into a valid Date.
 */
const dateCoerceSchema = z
  .union([z.string().datetime(), z.string().min(1), z.date()])
  .transform((val) => (val instanceof Date ? val : new Date(val)))
  .refine((date) => !isNaN(date.getTime()), {
    message: "Invalid date format",
  });

const nullableDateCoerceSchema = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || val === "") return null;
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d.getTime()) ? null : d;
  });

/**
 * Base field schemas for CCF events.
 */
export const eventBaseFields = {
  name: z
    .string({ required_error: "Event name is required" })
    .trim()
    .min(1, "Event name cannot be empty")
    .max(200, "Event name cannot exceed 200 characters"),

  slug: z
    .string({ required_error: "Event slug is required" })
    .trim()
    .min(1, "Event slug cannot be empty")
    .max(150, "Event slug cannot exceed 150 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must consist of lowercase alphanumeric characters separated by hyphens (e.g., magnora-26)"
    ),

  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),

  startsAt: dateCoerceSchema,

  endsAt: nullableDateCoerceSchema.optional(),

  venue: z
    .string()
    .trim()
    .max(300, "Venue cannot exceed 300 characters")
    .nullable()
    .optional(),

  capacityMode: z.nativeEnum(EventCapacityMode).default(EventCapacityMode.UNLIMITED),

  capacity: z
    .union([z.number().int(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const parsed = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(parsed) ? null : parsed;
    })
    .optional(),

  registrationMode: z.nativeEnum(RegistrationMode).default(RegistrationMode.NONE),

  registrationMethod: z.nativeEnum(RegistrationMethod).default(RegistrationMethod.NONE),

  externalUrl: z
    .string()
    .trim()
    .max(500, "External registration URL cannot exceed 500 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),

  eligibilityCrescent: z.boolean().default(false),

  eligibilityExternal: z.boolean().default(false),

  registrationOpensAt: nullableDateCoerceSchema.optional(),

  registrationClosesAt: nullableDateCoerceSchema.optional(),

  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.FREE),

  paymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),

  feeAmount: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const parsed = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(parsed) ? null : parsed;
    })
    .optional(),

  upiId: z
    .string()
    .trim()
    .max(255, "UPI ID cannot exceed 255 characters")
    .nullable()
    .optional(),

  payeeName: z
    .string()
    .trim()
    .max(200, "Payee name cannot exceed 200 characters")
    .nullable()
    .optional(),

  // The 5 canonical EventContent fields from the frozen Prisma schema
  descriptionRich: z.string().trim().nullable().optional(),
  rulesRich: z.string().trim().nullable().optional(),
  instructionsRich: z.string().trim().nullable().optional(),
  eligibilityRich: z.string().trim().nullable().optional(),
  notesRich: z.string().trim().nullable().optional(),
};

function isValidHttpUrl(stringUrl: string): boolean {
  try {
    const url = new URL(stringUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Cross-field consistency validation for complete event configurations.
 * Applied during creation AND after merging patch updates.
 */
export function applyCrossFieldEventRules<T extends z.ZodTypeAny>(schema: T) {
  return schema
    // 1. Date consistency: endsAt must be after startsAt
    .refine(
      (data) => {
        if (data.startsAt && data.endsAt) {
          return data.endsAt.getTime() > data.startsAt.getTime();
        }
        return true;
      },
      {
        message: "End date and time must be after the start date and time",
        path: ["endsAt"],
      }
    )
    // 2. Registration window consistency
    .refine(
      (data) => {
        if (data.registrationOpensAt && data.registrationClosesAt) {
          return (
            data.registrationClosesAt.getTime() >
            data.registrationOpensAt.getTime()
          );
        }
        return true;
      },
      {
        message: "Registration closing date must be after opening date",
        path: ["registrationClosesAt"],
      }
    )
    // 3. Capacity consistency
    .refine(
      (data) => {
        if (
          data.capacityMode === EventCapacityMode.PARTICIPANTS ||
          data.capacityMode === EventCapacityMode.TEAMS
        ) {
          return typeof data.capacity === "number" && data.capacity > 0;
        }
        return true;
      },
      {
        message: "Capacity must be a positive number when mode is PARTICIPANTS or TEAMS",
        path: ["capacity"],
      }
    )
    // 4. Registration mode and method consistency
    .refine(
      (data) => {
        if (data.registrationMode === RegistrationMode.NONE) {
          return data.registrationMethod === RegistrationMethod.NONE;
        }
        if (data.registrationMode === RegistrationMode.INTERNAL) {
          return data.registrationMethod === RegistrationMethod.BUILT_IN;
        }
        if (data.registrationMode === RegistrationMode.EXTERNAL) {
          return (
            data.registrationMethod === RegistrationMethod.GOOGLE_FORM ||
            data.registrationMethod === RegistrationMethod.EXTERNAL_LINK
          );
        }
        return false;
      },
      {
        message:
          "Invalid registration configuration: NONE requires NONE method; INTERNAL requires BUILT_IN method; EXTERNAL requires GOOGLE_FORM or EXTERNAL_LINK method",
        path: ["registrationMethod"],
      }
    )
    // 4.5. External registration URL consistency
    .refine(
      (data) => {
        if (data.registrationMode === RegistrationMode.EXTERNAL) {
          if (
            !data.externalUrl ||
            typeof data.externalUrl !== "string" ||
            data.externalUrl.trim().length === 0
          ) {
            return false;
          }
          return isValidHttpUrl(data.externalUrl.trim());
        }
        return (
          data.externalUrl === null ||
          data.externalUrl === undefined ||
          (typeof data.externalUrl === "string" && data.externalUrl.trim().length === 0)
        );
      },
      {
        message:
          "External registration URL is required and must be a valid HTTP or HTTPS URL when mode is EXTERNAL; external URL must not be provided when mode is INTERNAL or NONE",
        path: ["externalUrl"],
      }
    )
    // 5. Eligibility consistency when registration is enabled
    .refine(
      (data) => {
        if (data.registrationMode !== RegistrationMode.NONE) {
          return data.eligibilityCrescent || data.eligibilityExternal;
        }
        return true;
      },
      {
        message: "At least one eligibility group (Crescent or External) must be selected when registration is active",
        path: ["eligibilityCrescent"],
      }
    )
    // 6. Payment consistency
    .refine(
      (data) => {
        if (data.paymentMode === PaymentMode.FREE) {
          return !data.feeAmount || data.feeAmount === 0;
        }
        if (data.paymentMode === PaymentMode.PAID) {
          return typeof data.feeAmount === "number" && data.feeAmount > 0;
        }
        return true;
      },
      {
        message: "Paid events must have a positive registration fee amount",
        path: ["feeAmount"],
      }
    )
    .refine(
      (data) => {
        if (data.paymentMode === PaymentMode.PAID) {
          return !!data.paymentMethod;
        }
        return true;
      },
      {
        message: "Paid events must specify a payment method",
        path: ["paymentMethod"],
      }
    )
    .refine(
      (data) => {
        if (
          data.paymentMode === PaymentMode.PAID &&
          data.paymentMethod === PaymentMethod.MANUAL_UPI
        ) {
          return !!data.upiId && data.upiId.trim().length > 0;
        }
        return true;
      },
      {
        message: "UPI ID is required for Manual UPI payment method",
        path: ["upiId"],
      }
    )
    .refine(
      (data) => {
        if (
          data.paymentMode === PaymentMode.PAID &&
          data.paymentMethod === PaymentMethod.MANUAL_UPI
        ) {
          return !!data.payeeName && data.payeeName.trim().length > 0;
        }
        return true;
      },
      {
        message: "Payee Name is required for Manual UPI payment method",
        path: ["payeeName"],
      }
    )
    // 7. Publication validation (Correction 1): cannot publish incomplete event
    .refine(
      (data) => {
        if (data.status === EventStatus.PUBLISHED) {
          return !isNaN(data.startsAt?.getTime());
        }
        return true;
      },
      {
        message: "Event must have a valid start date before it can be published",
        path: ["status"],
      }
    );
}

/**
 * Complete Event Validation Schema.
 * Validates a fully-hydrated event object (used for creation and post-merge patch validation).
 */
export const completeEventSchema = applyCrossFieldEventRules(z.object(eventBaseFields));

export type CompleteEventInput = z.infer<typeof completeEventSchema>;

/**
 * Helper to validate that date fields are not set to past timestamps.
 * Allows a 60-second grace threshold to tolerate minor clock drift.
 */
export function validateEventDateUpdates(
  existing: Record<string, any>,
  patch: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const threshold = Date.now() - 60_000;

  const effectiveRegistrationMode =
    patch.registrationMode !== undefined
      ? patch.registrationMode
      : existing.registrationMode;
  const isHistoricalAllowed =
    effectiveRegistrationMode === RegistrationMode.NONE;

  const checkField = (
    field: "startsAt" | "endsAt" | "registrationOpensAt" | "registrationClosesAt",
    label: string
  ) => {
    // startsAt and endsAt are allowed to be in the past when registrationMode === NONE
    if (isHistoricalAllowed && (field === "startsAt" || field === "endsAt")) {
      return;
    }

    if (patch[field] !== undefined && patch[field] !== null && patch[field] !== "") {
      const newDate = new Date(patch[field]);
      if (!isNaN(newDate.getTime())) {
        const newTime = newDate.getTime();
        const existingVal = existing[field];
        const existingDate = existingVal ? new Date(existingVal) : null;
        const existingTime =
          existingDate && !isNaN(existingDate.getTime())
            ? existingDate.getTime()
            : null;

        // If the date is changed or newly added, it cannot be in the past
        if (existingTime === null || newTime !== existingTime) {
          if (newTime < threshold) {
            errors[field] = `${label} cannot be set to a past date and time`;
          }
        }
      }
    }
  };

  checkField("startsAt", "Event start date");
  checkField("endsAt", "Event end date");
  checkField("registrationOpensAt", "Registration opening date");
  checkField("registrationClosesAt", "Registration closing date");

  // If registration is being newly switched from NONE to enabled on an event whose startsAt is in the past, reject
  if (
    !isHistoricalAllowed &&
    existing.registrationMode === RegistrationMode.NONE &&
    patch.registrationMode !== undefined &&
    patch.registrationMode !== RegistrationMode.NONE
  ) {
    const startsAtVal =
      patch.startsAt !== undefined ? patch.startsAt : existing.startsAt;
    if (startsAtVal) {
      const sTime = new Date(startsAtVal).getTime();
      if (!isNaN(sTime) && sTime < threshold) {
        errors.startsAt = "Event start date cannot be in the past when registration is enabled";
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Schema for creating a new event.
 * Enforces that date/time fields cannot be in the past, unless registrationMode === NONE (historical event).
 */
export const createEventSchema = completeEventSchema
  .refine(
    (data) =>
      data.registrationMode === RegistrationMode.NONE ||
      !data.startsAt ||
      data.startsAt.getTime() >= Date.now() - 60_000,
    {
      message: "Event start date cannot be in the past",
      path: ["startsAt"],
    }
  )
  .refine(
    (data) =>
      data.registrationMode === RegistrationMode.NONE ||
      !data.endsAt ||
      data.endsAt.getTime() >= Date.now() - 60_000,
    {
      message: "Event end date cannot be in the past",
      path: ["endsAt"],
    }
  )
  .refine(
    (data) =>
      !data.registrationOpensAt ||
      data.registrationOpensAt.getTime() >= Date.now() - 60_000,
    {
      message: "Registration opening date cannot be in the past",
      path: ["registrationOpensAt"],
    }
  )
  .refine(
    (data) =>
      !data.registrationClosesAt ||
      data.registrationClosesAt.getTime() >= Date.now() - 60_000,
    {
      message: "Registration closing date cannot be in the past",
      path: ["registrationClosesAt"],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Schema for incoming partial PATCH requests.
 * Validates field types/shapes without requiring all fields.
 * Cross-field relationships are validated AFTER merging with the existing event record.
 */
export const updateEventPatchSchema = z.object({
  name: eventBaseFields.name.optional(),
  slug: eventBaseFields.slug.optional(),
  status: z.nativeEnum(EventStatus).optional(),
  startsAt: nullableDateCoerceSchema.optional(),
  endsAt: nullableDateCoerceSchema.optional(),
  venue: eventBaseFields.venue,
  capacityMode: z.nativeEnum(EventCapacityMode).optional(),
  capacity: eventBaseFields.capacity,
  registrationMode: z.nativeEnum(RegistrationMode).optional(),
  registrationMethod: z.nativeEnum(RegistrationMethod).optional(),
  externalUrl: eventBaseFields.externalUrl,
  eligibilityCrescent: z.boolean().optional(),
  eligibilityExternal: z.boolean().optional(),
  registrationOpensAt: nullableDateCoerceSchema.optional(),
  registrationClosesAt: nullableDateCoerceSchema.optional(),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
  paymentMethod: eventBaseFields.paymentMethod,
  feeAmount: eventBaseFields.feeAmount,
  upiId: eventBaseFields.upiId,
  payeeName: eventBaseFields.payeeName,

  // EventContent fields
  descriptionRich: eventBaseFields.descriptionRich,
  rulesRich: eventBaseFields.rulesRich,
  instructionsRich: eventBaseFields.instructionsRich,
  eligibilityRich: eventBaseFields.eligibilityRich,
  notesRich: eventBaseFields.notesRich,
});

export type UpdateEventPatchInput = z.infer<typeof updateEventPatchSchema>;

/**
 * Merges an existing event database record with an incoming partial patch,
 * preparing a complete object for cross-field validation.
 */
export function mergeEventWithPatch(
  existing: Record<string, any>,
  patch: Record<string, any>
): Record<string, any> {
  const merged: Record<string, any> = { ...existing };

  for (const [key, val] of Object.entries(patch)) {
    if (val !== undefined) {
      merged[key] = val;
    }
  }

  // Ensure Date instances for timestamps
  if (merged.startsAt && !(merged.startsAt instanceof Date)) {
    merged.startsAt = new Date(merged.startsAt);
  }
  if (merged.endsAt && !(merged.endsAt instanceof Date)) {
    merged.endsAt = new Date(merged.endsAt);
  }
  if (merged.registrationOpensAt && !(merged.registrationOpensAt instanceof Date)) {
    merged.registrationOpensAt = new Date(merged.registrationOpensAt);
  }
  if (merged.registrationClosesAt && !(merged.registrationClosesAt instanceof Date)) {
    merged.registrationClosesAt = new Date(merged.registrationClosesAt);
  }

  return merged;
}

/**
 * Utility to extract user-friendly field-level error messages from a ZodError.
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ? String(issue.path[0]) : "_root";
    if (!formatted[key]) {
      formatted[key] = issue.message;
    }
  }
  return formatted;
}
