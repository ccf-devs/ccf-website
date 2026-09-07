import { z } from "zod";
import { ParticipantType, RegistrationType } from "@prisma/client";
import { EventFieldDomain } from "@/lib/forms/types";
import { validateFormSubmission } from "@/lib/forms/validation";
import {
  normalizeCrescentRrn,
  normalizeCollege,
  normalizeExternalRoll,
  normalizeName,
} from "./normalization";
import { RegistrationDomainError, RegistrationErrorCode } from "./types";

/**
 * Team member input schema for team-mode events
 */
export const TeamMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  participantType: z.nativeEnum(ParticipantType),
  identifierNormalized: z.string().optional(),
  collegeNormalized: z.string().optional(),
  rrn: z.string().optional(),
  college: z.string().optional(),
  rollNumber: z.string().optional(),
  phone: z.string().max(30).optional(),
  academicDepartment: z.string().max(150).optional(),
  year: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
  isLeader: z.boolean().default(false),
});

/**
 * Registration submission request schema
 */
export const RegistrationSubmissionSchema = z.object({
  participantType: z.nativeEnum(ParticipantType, {
    errorMap: () => ({ message: "Participant type must be CRESCENT or EXTERNAL" }),
  }),
  registrationType: z.nativeEnum(RegistrationType).default(RegistrationType.INDIVIDUAL),
  responses: z.record(z.any(), {
    errorMap: () => ({ message: "Responses must be provided as a key-value object" }),
  }),
  team: z
    .object({
      name: z.string().min(2).max(200).optional(),
      members: z.array(TeamMemberSchema).optional(),
    })
    .optional(),
  payment: z
    .object({
      userReference: z.string().max(200).optional(),
    })
    .optional(),
});

export type RegistrationSubmissionParsed = z.infer<typeof RegistrationSubmissionSchema>;

/**
 * Extracted and normalized participant identity
 */
export interface NormalizedParticipantIdentity {
  participantType: ParticipantType;
  participantName: string;
  collegeNormalized: string | null;
  identifierNormalized: string;
}

/**
 * Extracts and normalizes participant identity from dynamic responses and submission payload.
 * Looks for platform system fields (participant_name, crescent_rrn, college_name, external_roll_number)
 * or falls back to standard keys.
 */
export function extractAndNormalizeIdentity(
  participantType: ParticipantType,
  responses: Record<string, any>,
  fields: EventFieldDomain[]
): NormalizedParticipantIdentity {
  // Find system field keys if configured
  const nameField = fields.find(
    (f) => f.key === "participant_name" || (f.config?.isSystem && f.config.systemKey === "name")
  );
  const rrnField = fields.find(
    (f) =>
      f.key === "crescent_rrn" ||
      (f.config?.isSystem && f.config.systemKey === "crescent_rrn")
  );
  const collegeField = fields.find(
    (f) =>
      f.key === "college_name" ||
      (f.config?.isSystem && f.config.systemKey === "college")
  );
  const rollField = fields.find(
    (f) =>
      f.key === "external_roll_number" ||
      (f.config?.isSystem && f.config.systemKey === "external_roll")
  );

  const rawName =
    responses[nameField?.key || "participant_name"] ??
    responses["name"] ??
    responses["fullName"];
  const participantName = normalizeName(rawName);

  if (participantType === ParticipantType.CRESCENT) {
    const rawRrn =
      responses[rrnField?.key || "crescent_rrn"] ??
      responses["rrn"] ??
      responses["student_id"];
    const identifierNormalized = normalizeCrescentRrn(rawRrn);

    return {
      participantType: ParticipantType.CRESCENT,
      participantName,
      collegeNormalized: null,
      identifierNormalized,
    };
  } else {
    const rawCollege =
      responses[collegeField?.key || "college_name"] ??
      responses["college"] ??
      responses["institution"];
    const rawRoll =
      responses[rollField?.key || "external_roll_number"] ??
      responses["roll_number"] ??
      responses["register_number"];

    const collegeNormalized = normalizeCollege(rawCollege);
    const identifierNormalized = normalizeExternalRoll(rawRoll);

    return {
      participantType: ParticipantType.EXTERNAL,
      participantName,
      collegeNormalized,
      identifierNormalized,
    };
  }
}

/**
 * Validates dynamic form responses against the active FormVersion and returns validated values.
 * Throws RegistrationDomainError if validation fails.
 */
export function validateDynamicResponses(
  fields: EventFieldDomain[],
  responses: Record<string, any>
): Record<string, any> {
  const result = validateFormSubmission(fields, responses);

  if (!result.isValid && result.errors && Object.keys(result.errors).length > 0) {
    const firstKey = Object.keys(result.errors)[0];
    const errorMessage = result.errors[firstKey];
    throw new RegistrationDomainError(
      errorMessage,
      RegistrationErrorCode.INVALID_FIELD,
      400,
      result.errors
    );
  }

  return result.validatedValues;
}
