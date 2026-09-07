import { PaymentStatus, PaymentMethod, PaymentMode } from "@prisma/client";

/**
 * Standard Handbook-defined Error Codes for the Payment System
 */
export const PaymentErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  REGISTRATION_NOT_FOUND: "REGISTRATION_NOT_FOUND",
  REGISTRATION_NOT_PAID: "REGISTRATION_NOT_PAID",
  EXTERNAL_REGISTRATION: "EXTERNAL_REGISTRATION",
  ALREADY_VERIFIED: "ALREADY_VERIFIED",
  INVALID_PAYMENT_STATE: "INVALID_PAYMENT_STATE",
  INVALID_REFERENCE: "INVALID_REFERENCE",
  UNAUTHORIZED: "UNAUTHORIZED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type PaymentErrorCode =
  (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];

/**
 * Custom application domain error for Payment operations
 */
export class PaymentDomainError extends Error {
  public readonly code: PaymentErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: PaymentErrorCode,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "PaymentDomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Payment Verification Actions supported by Admin
 */
export type PaymentAdminAction = "VERIFY" | "REJECT";

export interface PaymentVerificationInput {
  action: PaymentAdminAction;
  notes?: string;
  reason?: string;
}

export interface PaymentReferenceSubmissionInput {
  userReference: string;
}

/**
 * Non-sensitive public payment view returned to clients
 */
export interface PaymentPublicView {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: string;
  currency: string;
  upiId: string | null;
  payeeName: string | null;
  paymentUri: string | null;
  userReference: string | null;
}

/**
 * Detailed admin payment view
 */
export interface PaymentAdminView extends PaymentPublicView {
  verifiedBy: string | null;
  verifierName: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export { PaymentStatus, PaymentMethod, PaymentMode };
