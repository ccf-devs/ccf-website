import { prisma } from "@/lib/db/client";
import {
  PaymentStatus,
  PaymentMode,
  RegistrationMode,
} from "@prisma/client";
import {
  createAuditLog,
  PAYMENT_AUDIT_ACTIONS,
  buildPaymentAuditMetadata,
} from "@/lib/audit/log";
import {
  PaymentErrorCode,
  PaymentDomainError,
  PaymentPublicView,
  PaymentAdminView,
} from "./types";
import { normalizeAndValidatePaymentReference } from "./upi";

/**
 * Public participant submission or update of their payment UTR / reference.
 *
 * Rules:
 * - Registration must exist and match registrationCode or registration UUID.
 * - Event must be INTERNAL and PAID.
 * - Payment must exist.
 * - Reference must be valid (exactly 12 numeric digits).
 * - Status strictly remains/resets to PENDING awaiting verification (public users can NEVER verify payments).
 * - Allows resubmission if payment was previously REJECTED.
 * - Prevents unsafe overwrite if payment is already VERIFIED.
 */
export async function submitPaymentReference(
  registrationCodeOrId: string,
  userReference: string
): Promise<PaymentPublicView> {
  const cleanIdOrCode = (registrationCodeOrId || "").trim();
  if (!cleanIdOrCode) {
    throw new PaymentDomainError(
      "Registration identifier is required.",
      PaymentErrorCode.INVALID_REQUEST,
      400
    );
  }

  const cleanReference = normalizeAndValidatePaymentReference(userReference);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanIdOrCode);

  const registration = await prisma.registration.findUnique({
    where: isUuid
      ? { id: cleanIdOrCode }
      : { registrationCode: cleanIdOrCode.toUpperCase() },
    include: {
      event: {
        select: {
          id: true,
          registrationMode: true,
          paymentMode: true,
        },
      },
      payment: true,
    },
  });

  if (!registration) {
    throw new PaymentDomainError(
      "Registration not found.",
      PaymentErrorCode.REGISTRATION_NOT_FOUND,
      404
    );
  }

  if (registration.event.registrationMode === RegistrationMode.EXTERNAL) {
    throw new PaymentDomainError(
      "External registrations do not use internal payment management.",
      PaymentErrorCode.EXTERNAL_REGISTRATION,
      400
    );
  }

  if (
    registration.event.paymentMode === PaymentMode.FREE ||
    !registration.payment
  ) {
    throw new PaymentDomainError(
      "This registration is for a free event and does not require payment.",
      PaymentErrorCode.REGISTRATION_NOT_PAID,
      400
    );
  }

  if (registration.payment.status === PaymentStatus.VERIFIED) {
    throw new PaymentDomainError(
      "Payment has already been verified and its reference cannot be overwritten.",
      PaymentErrorCode.ALREADY_VERIFIED,
      400
    );
  }

  if (
    registration.payment.status !== PaymentStatus.PENDING &&
    registration.payment.status !== PaymentStatus.REJECTED
  ) {
    throw new PaymentDomainError(
      `Cannot submit payment reference for a payment in ${registration.payment.status} state. Only PENDING or REJECTED payments accept reference submissions.`,
      PaymentErrorCode.INVALID_PAYMENT_STATE,
      400
    );
  }

  const updated = await prisma.payment.update({
    where: { id: registration.payment.id },
    data: {
      userReference: cleanReference,
      status: PaymentStatus.PENDING,
      verifiedBy: null,
      verifiedAt: null,
    },
  });

  return {
    id: updated.id,
    status: updated.status,
    method: updated.method,
    amount: String(updated.amount),
    currency: updated.currency,
    upiId: updated.upiId,
    payeeName: updated.payeeName,
    paymentUri: updated.paymentUri,
    userReference: updated.userReference,
  };
}

/**
 * Authoritative admin verification of a manual UPI payment.
 *
 * Rules:
 * - Requires authenticated CCF_ADMIN or IT_ADMIN.
 * - Validates registration and associated payment existence.
 * - Transitions status: PENDING (or REJECTED) -> VERIFIED.
 * - Records verifiedBy (admin ID) and verifiedAt timestamp.
 * - Emits auditable PAYMENT_VERIFIED audit log inside the transaction.
 * - Idempotent: re-verifying an already VERIFIED payment succeeds safely without re-logging.
 */
export async function verifyPaymentByAdmin(
  registrationId: string,
  adminId: string,
  notes?: string
): Promise<PaymentAdminView> {
  if (!registrationId) {
    throw new PaymentDomainError(
      "Registration ID is required.",
      PaymentErrorCode.INVALID_REQUEST,
      400
    );
  }

  if (!adminId) {
    throw new PaymentDomainError(
      "Admin ID is required for verification.",
      PaymentErrorCode.UNAUTHORIZED,
      401
    );
  }

  return await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            paymentMode: true,
          },
        },
        payment: {
          include: {
            verifiedByAdmin: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!registration) {
      throw new PaymentDomainError(
        "Registration not found.",
        PaymentErrorCode.REGISTRATION_NOT_FOUND,
        404
      );
    }

    if (
      registration.event.paymentMode === PaymentMode.FREE ||
      !registration.payment
    ) {
      throw new PaymentDomainError(
        "Registration does not have an associated payment record.",
        PaymentErrorCode.REGISTRATION_NOT_PAID,
        400
      );
    }

    // Idempotent check: if already VERIFIED by this admin or another, return safely
    if (registration.payment.status === PaymentStatus.VERIFIED) {
      return {
        id: registration.payment.id,
        status: registration.payment.status,
        method: registration.payment.method,
        amount: String(registration.payment.amount),
        currency: registration.payment.currency,
        upiId: registration.payment.upiId,
        payeeName: registration.payment.payeeName,
        paymentUri: registration.payment.paymentUri,
        userReference: registration.payment.userReference,
        verifiedBy: registration.payment.verifiedBy,
        verifierName: registration.payment.verifiedByAdmin?.name || null,
        verifiedAt: registration.payment.verifiedAt
          ? registration.payment.verifiedAt.toISOString()
          : null,
        createdAt: registration.payment.createdAt.toISOString(),
        updatedAt: registration.payment.updatedAt.toISOString(),
      };
    }

    if (
      registration.payment.status === PaymentStatus.REFUNDED ||
      registration.payment.status === PaymentStatus.EXPIRED
    ) {
      throw new PaymentDomainError(
        `Cannot verify a payment in ${registration.payment.status} state.`,
        PaymentErrorCode.INVALID_PAYMENT_STATE,
        400
      );
    }

    if (!registration.payment.userReference || !registration.payment.userReference.trim()) {
      throw new PaymentDomainError(
        "Cannot verify payment: no payment reference (UTR) has been submitted by the registrant.",
        PaymentErrorCode.INVALID_PAYMENT_STATE,
        400
      );
    }

    const now = new Date();

    const updated = await tx.payment.update({
      where: { id: registration.payment.id },
      data: {
        status: PaymentStatus.VERIFIED,
        verifiedBy: adminId,
        verifiedAt: now,
      },
      include: {
        verifiedByAdmin: {
          select: { id: true, name: true },
        },
      },
    });

    // Write audit log inside the transaction
    await createAuditLog(
      {
        actorId: adminId,
        action: PAYMENT_AUDIT_ACTIONS.VERIFIED,
        entityType: "Payment",
        entityId: updated.id,
        metadata: buildPaymentAuditMetadata({
          paymentId: updated.id,
          registrationId: registration.id,
          registrationCode: registration.registrationCode,
          amount: String(updated.amount),
          currency: updated.currency,
          status: updated.status,
          userReference: updated.userReference,
          notes: notes || null,
        }),
      },
      tx
    );

    return {
      id: updated.id,
      status: updated.status,
      method: updated.method,
      amount: String(updated.amount),
      currency: updated.currency,
      upiId: updated.upiId,
      payeeName: updated.payeeName,
      paymentUri: updated.paymentUri,
      userReference: updated.userReference,
      verifiedBy: updated.verifiedBy,
      verifierName: updated.verifiedByAdmin?.name || null,
      verifiedAt: updated.verifiedAt ? updated.verifiedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}

/**
 * Authoritative admin rejection of a manual UPI payment.
 *
 * Rules:
 * - Requires authenticated CCF_ADMIN or IT_ADMIN.
 * - Transitions status to REJECTED.
 * - Strictly does NOT populate verifiedBy or verifiedAt.
 * - Emits auditable PAYMENT_REJECTED audit log inside the transaction.
 */
export async function rejectPaymentByAdmin(
  registrationId: string,
  adminId: string,
  reason?: string
): Promise<PaymentAdminView> {
  if (!registrationId) {
    throw new PaymentDomainError(
      "Registration ID is required.",
      PaymentErrorCode.INVALID_REQUEST,
      400
    );
  }

  if (!adminId) {
    throw new PaymentDomainError(
      "Admin ID is required for rejection.",
      PaymentErrorCode.UNAUTHORIZED,
      401
    );
  }

  return await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            paymentMode: true,
          },
        },
        payment: {
          include: {
            verifiedByAdmin: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!registration) {
      throw new PaymentDomainError(
        "Registration not found.",
        PaymentErrorCode.REGISTRATION_NOT_FOUND,
        404
      );
    }

    if (
      registration.event.paymentMode === PaymentMode.FREE ||
      !registration.payment
    ) {
      throw new PaymentDomainError(
        "Registration does not have an associated payment record.",
        PaymentErrorCode.REGISTRATION_NOT_PAID,
        400
      );
    }

    if (registration.payment.status === PaymentStatus.VERIFIED) {
      throw new PaymentDomainError(
        "Cannot reject an already verified payment.",
        PaymentErrorCode.INVALID_PAYMENT_STATE,
        400
      );
    }

    if (
      registration.payment.status === PaymentStatus.REFUNDED ||
      registration.payment.status === PaymentStatus.EXPIRED
    ) {
      throw new PaymentDomainError(
        `Cannot reject a payment in ${registration.payment.status} state.`,
        PaymentErrorCode.INVALID_PAYMENT_STATE,
        400
      );
    }

    const updated = await tx.payment.update({
      where: { id: registration.payment.id },
      data: {
        status: PaymentStatus.REJECTED,
        // Rejection must NOT set verifiedBy or verifiedAt
      },
      include: {
        verifiedByAdmin: {
          select: { id: true, name: true },
        },
      },
    });

    // Write audit log inside the transaction
    await createAuditLog(
      {
        actorId: adminId,
        action: PAYMENT_AUDIT_ACTIONS.REJECTED,
        entityType: "Payment",
        entityId: updated.id,
        metadata: buildPaymentAuditMetadata({
          paymentId: updated.id,
          registrationId: registration.id,
          registrationCode: registration.registrationCode,
          amount: String(updated.amount),
          currency: updated.currency,
          status: updated.status,
          userReference: updated.userReference,
          notes: reason || null,
        }),
      },
      tx
    );

    return {
      id: updated.id,
      status: updated.status,
      method: updated.method,
      amount: String(updated.amount),
      currency: updated.currency,
      upiId: updated.upiId,
      payeeName: updated.payeeName,
      paymentUri: updated.paymentUri,
      userReference: updated.userReference,
      verifiedBy: updated.verifiedBy,
      verifierName: updated.verifiedByAdmin?.name || null,
      verifiedAt: updated.verifiedAt ? updated.verifiedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}
