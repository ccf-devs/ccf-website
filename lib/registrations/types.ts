import {
  RegistrationStatus,
  RegistrationType,
  ParticipantType,
  PaymentMode,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";

/**
 * Standard Handbook-defined Error Codes for the Registration System
 */
export const RegistrationErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  REGISTRATION_NOT_OPEN: "REGISTRATION_NOT_OPEN",
  REGISTRATION_CLOSED: "REGISTRATION_CLOSED",
  REGISTRATION_NOT_ALLOWED: "REGISTRATION_NOT_ALLOWED",
  REGISTRATION_MODE_NOT_INTERNAL: "REGISTRATION_MODE_NOT_INTERNAL",
  EXTERNAL_REGISTRATION_MODE: "EXTERNAL_REGISTRATION_MODE",
  NO_ACTIVE_FORM_VERSION: "NO_ACTIVE_FORM_VERSION",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  INVALID_PARTICIPANT: "INVALID_PARTICIPANT",
  INVALID_RRN: "INVALID_RRN",
  DUPLICATE_REGISTRATION: "DUPLICATE_REGISTRATION",
  PARTICIPATION_LOCKED: "PARTICIPATION_LOCKED",
  EVENT_FULL: "EVENT_FULL",
  INVALID_FIELD: "INVALID_FIELD",
  UNAUTHORIZED: "UNAUTHORIZED",
  REGISTRATION_NOT_FOUND: "REGISTRATION_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type RegistrationErrorCode =
  (typeof RegistrationErrorCode)[keyof typeof RegistrationErrorCode];

/**
 * Custom application error for Registration domain operations
 */
export class RegistrationDomainError extends Error {
  public readonly code: RegistrationErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: RegistrationErrorCode,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "RegistrationDomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Raw team member input from registration form
 */
export interface TeamMemberInput {
  name: string;
  participantType: ParticipantType;
  identifierNormalized?: string;
  collegeNormalized?: string;
  phone?: string;
  academicDepartment?: string;
  year?: string;
  position?: string;
  isLeader?: boolean;
}

/**
 * Public registration submission payload
 */
export interface RegistrationSubmissionInput {
  participantType: ParticipantType;
  registrationType?: RegistrationType;
  responses: Record<string, any>;
  team?: {
    name?: string;
    members?: TeamMemberInput[];
  };
  payment?: {
    userReference?: string;
  };
}

/**
 * Public safe registration confirmation returned to the client
 */
export interface RegistrationConfirmation {
  id: string;
  registrationCode: string;
  status: RegistrationStatus;
  registrationType: RegistrationType;
  participantType: ParticipantType;
  participantName: string;
  createdAt: string;
  event: {
    id: string;
    slug: string;
    name: string;
  };
  payment?: {
    status: PaymentStatus;
    method: PaymentMethod;
    amount: string;
    currency: string;
    upiId?: string | null;
    payeeName?: string | null;
    paymentUri?: string | null;
    userReference?: string | null;
  } | null;
}

/**
 * Admin registration detail view
 */
export interface AdminRegistrationView {
  id: string;
  registrationCode: string;
  status: RegistrationStatus;
  registrationType: RegistrationType;
  participantType: ParticipantType;
  participantName: string;
  collegeNormalized: string | null;
  identifierNormalized: string | null;
  formVersionId: string;
  formVersionNumber: number;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    fieldId: string;
    fieldKey: string;
    fieldLabel: string;
    valueText: string | null;
    valueJson: any | null;
  }>;
  team?: {
    id: string;
    name: string | null;
    members: Array<{
      id: string;
      name: string;
      participantType: ParticipantType;
      identifierNormalized: string | null;
      collegeNormalized: string | null;
      phone: string | null;
      academicDepartment: string | null;
      year: string | null;
      position: string | null;
      isLeader: boolean;
    }>;
  } | null;
  payment?: {
    id: string;
    status: PaymentStatus;
    method: PaymentMethod;
    amount: string;
    currency: string;
    upiId: string | null;
    payeeName: string | null;
    paymentUri: string | null;
    userReference: string | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
  } | null;
}
