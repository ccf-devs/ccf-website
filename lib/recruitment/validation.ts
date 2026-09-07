import { z } from "zod";
import { RecruitmentStatus } from "@prisma/client";
import { CRESCENT_RRN_REGEX } from "@/lib/registrations/normalization";
import { RecruitmentErrorCode, RecruitmentDomainError } from "./types";

/**
 * Normalizes a phone number to digits only (retains optional leading +)
 */
export function normalizePhone(rawPhone: unknown): string {
  if (typeof rawPhone !== "string") {
    throw new RecruitmentDomainError(
      "Phone number is required and must be a string.",
      RecruitmentErrorCode.INVALID_PHONE,
      400
    );
  }

  const trimmed = rawPhone.trim();
  // Strip spaces, dashes, parentheses
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, "");

  // Must be 10 to 15 digits, optionally prefixed with +
  const phonePattern = /^\+?[0-9]{10,15}$/;
  if (!phonePattern.test(cleaned)) {
    throw new RecruitmentDomainError(
      "Please enter a valid WhatsApp-enabled phone number (10 to 15 digits).",
      RecruitmentErrorCode.INVALID_PHONE,
      400
    );
  }

  return cleaned;
}

/**
 * Normalizes a Crescent student RRN specifically for the Recruitment domain
 */
export function normalizeRecruitmentRrn(rawRrn: unknown): string {
  if (typeof rawRrn !== "string") {
    throw new RecruitmentDomainError(
      "Crescent RRN is required and must be a string.",
      RecruitmentErrorCode.INVALID_RRN,
      400
    );
  }

  const trimmed = rawRrn.trim();
  if (!CRESCENT_RRN_REGEX.test(trimmed)) {
    throw new RecruitmentDomainError(
      "Crescent RRN must be exactly 12 digits starting with 2.",
      RecruitmentErrorCode.INVALID_RRN,
      400
    );
  }

  return trimmed;
}

/**
 * Zod schema for public recruitment application submission
 */
export const publicRecruitmentApplicationSchema = z.object({
  name: z
    .string({ required_error: "Full name is required." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(200, "Name must not exceed 200 characters."),
  rrn: z
    .string({ required_error: "Crescent RRN is required." })
    .trim()
    .regex(CRESCENT_RRN_REGEX, "Crescent RRN must be exactly 12 digits starting with 2."),
  departmentId: z
    .string({ required_error: "Desired CCF department is required." })
    .uuid("Invalid department identifier."),
  academicDepartment: z
    .string({ required_error: "Current academic department is required." })
    .trim()
    .min(1, "Current academic department is required.")
    .max(150, "Academic department must not exceed 150 characters."),
  year: z
    .string({ required_error: "Year of study is required." })
    .trim()
    .min(1, "Year of study is required.")
    .max(50, "Year of study must not exceed 50 characters."),
  phone: z
    .string({ required_error: "WhatsApp phone number is required." })
    .trim()
    .refine(
      (val) => {
        const cleaned = val.replace(/[\s\-\(\)]/g, "");
        return /^\+?[0-9]{10,15}$/.test(cleaned);
      },
      {
        message: "Please enter a valid 10 to 15 digit WhatsApp phone number.",
      }
    ),
});

/**
 * Zod schema for administrative status updates
 */
export const adminUpdateApplicationStatusSchema = z.object({
  status: z.nativeEnum(RecruitmentStatus, {
    required_error: "Application status is required.",
    invalid_type_error: "Invalid recruitment status value.",
  }),
  notes: z.string().max(500, "Notes must not exceed 500 characters.").optional(),
});

/**
 * Zod schema for administrative recruitment settings
 */
export const adminUpdateRecruitmentSettingsSchema = z.object({
  isOpen: z.boolean({ required_error: "isOpen boolean is required." }),
  whatsappGroupUrl: z
    .string()
    .trim()
    .refine(
      (val) =>
        !val ||
        /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/[A-Za-z0-9_-]+$/.test(val),
      {
        message:
          "WhatsApp group URL must be a valid WhatsApp invite link (e.g. https://chat.whatsapp.com/...).",
      }
    )
    .or(z.literal(""))
    .nullable()
    .optional(),
});
