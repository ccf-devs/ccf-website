import crypto from "crypto";
import { RegistrationErrorCode, RegistrationDomainError } from "./types";

/**
 * Regex pattern for Crescent RRN: exactly 12 digits starting with '2'
 */
export const CRESCENT_RRN_REGEX = /^2\d{11}$/;

/**
 * Validates whether a given string is a syntactically valid Crescent RRN
 */
export function isValidCrescentRrn(rrn: unknown): boolean {
  if (typeof rrn !== "string") {
    return false;
  }
  return CRESCENT_RRN_REGEX.test(rrn.trim());
}

/**
 * Normalizes a Crescent RRN.
 * Trims leading/trailing whitespace.
 * Throws RegistrationDomainError if invalid.
 */
export function normalizeCrescentRrn(rrn: unknown): string {
  if (typeof rrn !== "string") {
    throw new RegistrationDomainError(
      "Crescent RRN is required and must be a string.",
      RegistrationErrorCode.INVALID_RRN,
      400
    );
  }

  const trimmed = rrn.trim();
  if (!CRESCENT_RRN_REGEX.test(trimmed)) {
    throw new RegistrationDomainError(
      "Crescent RRN must be exactly 12 digits starting with 2.",
      RegistrationErrorCode.INVALID_RRN,
      400
    );
  }

  return trimmed;
}

/**
 * Normalizes an external college or university name.
 * Trims whitespace, collapses internal whitespace, and converts to uppercase.
 */
export function normalizeCollege(college: unknown): string {
  if (typeof college !== "string" || !college.trim()) {
    throw new RegistrationDomainError(
      "College or institution name is required for external participants.",
      RegistrationErrorCode.INVALID_PARTICIPANT,
      400
    );
  }

  return college.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Normalizes an external roll or register number.
 * Trims whitespace, collapses internal spaces, and converts to uppercase.
 */
export function normalizeExternalRoll(roll: unknown): string {
  if (typeof roll !== "string" || !roll.trim()) {
    throw new RegistrationDomainError(
      "College roll or register number is required for external participants.",
      RegistrationErrorCode.INVALID_PARTICIPANT,
      400
    );
  }

  return roll.trim().replace(/\s+/g, "").toUpperCase();
}

/**
 * Normalizes a participant's full name.
 * Trims whitespace and collapses multiple consecutive spaces.
 */
export function normalizeName(name: unknown): string {
  if (typeof name !== "string" || !name.trim()) {
    throw new RegistrationDomainError(
      "Participant name is required.",
      RegistrationErrorCode.INVALID_PARTICIPANT,
      400
    );
  }

  return name.trim().replace(/\s+/g, " ");
}

/**
 * Generates a clean, canonical public registration code.
 * Format: CCF-<EVENT_PREFIX>-<HEX8>
 * Fits securely within VARCHAR(50).
 * Example: CCF-MAGNORA2-8F1A2D3C
 */
export function generateRegistrationCode(eventSlug: string): string {
  const cleanSlug = eventSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const prefix = cleanSlug || "EVENT";
  const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `CCF-${prefix}-${randomHex}`;
}
