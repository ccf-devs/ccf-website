import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitPaymentReference,
  verifyPaymentByAdmin,
  rejectPaymentByAdmin,
} from "@/lib/payments/service";
import { PaymentErrorCode } from "@/lib/payments/types";
import {
  PaymentStatus,
  PaymentMode,
  PaymentMethod,
  RegistrationMode,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import * as auditLogModule from "@/lib/audit/log";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    registration: {
      findUnique: vi.fn(),
    },
    payment: {
      update: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return await cb(prisma);
    }),
  },
}));

vi.mock("@/lib/audit/log", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit/log")>();
  return {
    ...actual,
    createAuditLog: vi.fn().mockResolvedValue({ id: "audit-1" }),
  };
});

describe("Payment Service Layer (Phase 10)", () => {
  const mockDate = new Date("2026-09-07T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitPaymentReference", () => {
    it("successfully submits and updates UTR reference for a PENDING paid registration", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-MAG-1234",
        event: {
          id: "ev-1",
          registrationMode: RegistrationMode.INTERNAL,
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.PENDING,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
          currency: "INR",
          upiId: "ccf@okaxis",
          payeeName: "Crescent Club",
          paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
          userReference: null,
        },
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: "pay-1",
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MANUAL_UPI,
        amount: 250,
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
        userReference: "408112345678",
      });

      const result = await submitPaymentReference(
        "CCF-MAG-1234",
        "  408112345678  "
      );

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "pay-1" },
        data: { userReference: "408112345678" },
      });
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.userReference).toBe("408112345678");
    });

    it("throws REGISTRATION_NOT_FOUND when registration code does not exist", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue(null);

      await expect(
        submitPaymentReference("NON-EXISTENT", "408112345678")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.REGISTRATION_NOT_FOUND,
        statusCode: 404,
      });
    });

    it("throws EXTERNAL_REGISTRATION for external event registrations", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-EXT-1234",
        event: {
          id: "ev-1",
          registrationMode: RegistrationMode.EXTERNAL,
          paymentMode: PaymentMode.PAID,
        },
        payment: null,
      });

      await expect(
        submitPaymentReference("CCF-EXT-1234", "408112345678")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.EXTERNAL_REGISTRATION,
        statusCode: 400,
      });
    });

    it("throws REGISTRATION_NOT_PAID for FREE events", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-FREE-1234",
        event: {
          id: "ev-1",
          registrationMode: RegistrationMode.INTERNAL,
          paymentMode: PaymentMode.FREE,
        },
        payment: null,
      });

      await expect(
        submitPaymentReference("CCF-FREE-1234", "408112345678")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.REGISTRATION_NOT_PAID,
        statusCode: 400,
      });
    });

    it("throws ALREADY_VERIFIED to protect already verified payments from overwrite", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-PAID-1234",
        event: {
          id: "ev-1",
          registrationMode: RegistrationMode.INTERNAL,
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.VERIFIED,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
          currency: "INR",
          userReference: "ORIGINAL-UTR-123",
        },
      });

      await expect(
        submitPaymentReference("CCF-PAID-1234", "NEW-UTR-999999")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.ALREADY_VERIFIED,
        statusCode: 400,
      });
    });

    it("throws INVALID_PAYMENT_STATE when submitting UTR on a REJECTED payment and does not call payment.update", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-REJ-1234",
        event: {
          id: "ev-1",
          registrationMode: RegistrationMode.INTERNAL,
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.REJECTED,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
        },
      });

      await expect(
        submitPaymentReference("CCF-REJ-1234", "408112345678")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_PAYMENT_STATE,
        statusCode: 400,
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_PAYMENT_STATE when submitting UTR on a REFUNDED payment", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-REF-1234",
        event: {
          id: "ev-1",
          registrationMode: RegistrationMode.INTERNAL,
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.REFUNDED,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
        },
      });

      await expect(
        submitPaymentReference("CCF-REF-1234", "408112345678")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_PAYMENT_STATE,
        statusCode: 400,
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_REFERENCE on malformed/short UTR input", async () => {
      await expect(
        submitPaymentReference("CCF-PAID-1234", "123")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_REFERENCE,
        statusCode: 400,
      });
    });
  });

  describe("verifyPaymentByAdmin", () => {
    it("transitions PENDING payment to VERIFIED and records verifiedBy/verifiedAt", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-MAG-1234",
        event: {
          id: "ev-1",
          name: "Magnora’26",
          slug: "magnora-26",
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.PENDING,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
          currency: "INR",
          upiId: "ccf@okaxis",
          payeeName: "Crescent Club",
          paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
          userReference: "408112345678",
          verifiedByAdmin: null,
          verifiedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: "pay-1",
        status: PaymentStatus.VERIFIED,
        method: PaymentMethod.MANUAL_UPI,
        amount: 250,
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
        userReference: "408112345678",
        verifiedBy: "admin-1",
        verifiedByAdmin: { id: "admin-1", name: "Lead Admin" },
        verifiedAt: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await verifyPaymentByAdmin(
        "reg-1",
        "admin-1",
        "Verified bank statement"
      );

      expect(result.status).toBe(PaymentStatus.VERIFIED);
      expect(result.verifiedBy).toBe("admin-1");
      expect(result.verifierName).toBe("Lead Admin");

      expect(auditLogModule.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "admin-1",
          action: "PAYMENT_VERIFIED",
          entityType: "Payment",
          entityId: "pay-1",
          metadata: expect.objectContaining({
            paymentId: "pay-1",
            registrationId: "reg-1",
            registrationCode: "CCF-MAG-1234",
            amount: "250",
            status: PaymentStatus.VERIFIED,
            notes: "Verified bank statement",
          }),
        }),
        expect.anything()
      );
    });

    it("is safe and idempotent when re-verifying an already VERIFIED payment", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-MAG-1234",
        event: {
          id: "ev-1",
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.VERIFIED,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
          currency: "INR",
          upiId: "ccf@okaxis",
          payeeName: "Crescent Club",
          paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
          userReference: "408112345678",
          verifiedBy: "admin-1",
          verifiedByAdmin: { id: "admin-1", name: "Lead Admin" },
          verifiedAt: mockDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      });

      const result = await verifyPaymentByAdmin("reg-1", "admin-1");

      expect(result.status).toBe(PaymentStatus.VERIFIED);
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(auditLogModule.createAuditLog).not.toHaveBeenCalled();
    });

    it("throws REGISTRATION_NOT_FOUND if registration does not exist", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue(null);

      await expect(
        verifyPaymentByAdmin("non-existent-reg", "admin-1")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.REGISTRATION_NOT_FOUND,
        statusCode: 404,
      });
    });

    it("throws REGISTRATION_NOT_PAID if registration has no payment record", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: {
          paymentMode: PaymentMode.FREE,
        },
        payment: null,
      });

      await expect(
        verifyPaymentByAdmin("reg-1", "admin-1")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.REGISTRATION_NOT_PAID,
        statusCode: 400,
      });
    });

    it("throws INVALID_PAYMENT_STATE when trying to verify a REFUNDED payment", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: {
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.REFUNDED,
        },
      });

      await expect(
        verifyPaymentByAdmin("reg-1", "admin-1")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_PAYMENT_STATE,
        statusCode: 400,
      });
    });

    it("transitions REJECTED payment to VERIFIED (REJECTED -> VERIFIED)", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-MAG-1234",
        event: {
          id: "ev-1",
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.REJECTED,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
          currency: "INR",
          upiId: "ccf@okaxis",
          payeeName: "Crescent Club",
          paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
          userReference: "408112345678",
          verifiedByAdmin: null,
          verifiedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: "pay-1",
        status: PaymentStatus.VERIFIED,
        method: PaymentMethod.MANUAL_UPI,
        amount: 250,
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
        userReference: "408112345678",
        verifiedBy: "admin-1",
        verifiedByAdmin: { id: "admin-1", name: "Lead Admin" },
        verifiedAt: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await verifyPaymentByAdmin("reg-1", "admin-1", "Re-verified with proof");

      expect(result.status).toBe(PaymentStatus.VERIFIED);
      expect(result.verifiedBy).toBe("admin-1");
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-1" },
          data: expect.objectContaining({
            status: PaymentStatus.VERIFIED,
            verifiedBy: "admin-1",
          }),
        })
      );
    });

    it("throws INVALID_PAYMENT_STATE when trying to verify an EXPIRED payment", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: {
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.EXPIRED,
        },
      });

      await expect(
        verifyPaymentByAdmin("reg-1", "admin-1")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_PAYMENT_STATE,
        statusCode: 400,
      });
    });
  });

  describe("rejectPaymentByAdmin", () => {
    it("transitions PENDING payment to REJECTED and creates audit record without setting verifiedBy", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-MAG-1234",
        event: {
          id: "ev-1",
          name: "Magnora’26",
          slug: "magnora-26",
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.PENDING,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
          currency: "INR",
          upiId: "ccf@okaxis",
          payeeName: "Crescent Club",
          paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
          userReference: "FAKE-UTR-12345",
          verifiedByAdmin: null,
          verifiedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: "pay-1",
        status: PaymentStatus.REJECTED,
        method: PaymentMethod.MANUAL_UPI,
        amount: 250,
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
        userReference: "FAKE-UTR-12345",
        verifiedBy: null,
        verifiedByAdmin: null,
        verifiedAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await rejectPaymentByAdmin(
        "reg-1",
        "admin-1",
        "Invalid UTR number"
      );

      expect(result.status).toBe(PaymentStatus.REJECTED);
      expect(result.verifiedBy).toBeNull();
      expect(result.verifiedAt).toBeNull();

      expect(auditLogModule.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "admin-1",
          action: "PAYMENT_REJECTED",
          entityType: "Payment",
          entityId: "pay-1",
          metadata: expect.objectContaining({
            paymentId: "pay-1",
            registrationId: "reg-1",
            registrationCode: "CCF-MAG-1234",
            amount: "250",
            status: PaymentStatus.REJECTED,
            notes: "Invalid UTR number",
          }),
        }),
        expect.anything()
      );
    });

    it("throws INVALID_PAYMENT_STATE when trying to reject an already VERIFIED payment and does not call update or audit log", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        registrationCode: "CCF-VER-1234",
        event: {
          id: "ev-1",
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.VERIFIED,
          method: PaymentMethod.MANUAL_UPI,
          amount: 250,
          currency: "INR",
          userReference: "408112345678",
        },
      });

      await expect(
        rejectPaymentByAdmin("reg-1", "admin-1", "Attempted rejection of verified payment")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_PAYMENT_STATE,
        statusCode: 400,
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(auditLogModule.createAuditLog).not.toHaveBeenCalled();
    });

    it("throws INVALID_PAYMENT_STATE when trying to reject a REFUNDED payment", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: {
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.REFUNDED,
        },
      });

      await expect(
        rejectPaymentByAdmin("reg-1", "admin-1", "Reason")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_PAYMENT_STATE,
        statusCode: 400,
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(auditLogModule.createAuditLog).not.toHaveBeenCalled();
    });

    it("throws INVALID_PAYMENT_STATE when trying to reject an EXPIRED payment", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: {
          paymentMode: PaymentMode.PAID,
        },
        payment: {
          id: "pay-1",
          status: PaymentStatus.EXPIRED,
        },
      });

      await expect(
        rejectPaymentByAdmin("reg-1", "admin-1", "Reason")
      ).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_PAYMENT_STATE,
        statusCode: 400,
      });

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(auditLogModule.createAuditLog).not.toHaveBeenCalled();
    });
  });
});
