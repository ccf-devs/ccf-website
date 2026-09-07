import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as publicPaymentRefHandler } from "@/app/api/events/[slug]/registrations/[code]/payment-reference/route";
import { PATCH as adminPaymentHandler } from "@/app/api/admin/events/[id]/registrations/[registrationId]/payment/route";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, PaymentStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import * as paymentService from "@/lib/payments/service";
import { PaymentDomainError, PaymentErrorCode } from "@/lib/payments/types";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    registration: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/payments/service", () => ({
  submitPaymentReference: vi.fn(),
  verifyPaymentByAdmin: vi.fn(),
  rejectPaymentByAdmin: vi.fn(),
}));

describe("Payment API Routes (Phase 10)", () => {
  const mockAdmin = {
    id: "admin-uuid-1",
    name: "Lead Admin",
    email: "lead@crescent.education",
    role: AdminRole.CCF_ADMIN,
    active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/events/[slug]/registrations/[code]/payment-reference", () => {
    it("returns 200 with updated payment on valid UTR submission", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: { slug: "magnora-26" },
      });

      const mockPaymentResult = {
        id: "pay-1",
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MANUAL_UPI,
        amount: "250",
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
        userReference: "408112345678",
      };

      (paymentService.submitPaymentReference as any).mockResolvedValue(
        mockPaymentResult
      );

      const req = new NextRequest(
        "http://localhost:3000/api/events/magnora-26/registrations/CCF-MAG-1234/payment-reference",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userReference: "408112345678" }),
        }
      );

      const res = await publicPaymentRefHandler(req, {
        params: Promise.resolve({ slug: "magnora-26", code: "CCF-MAG-1234" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.payment.userReference).toBe("408112345678");
    });

    it("returns 400 when request body contains invalid JSON", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/events/magnora-26/registrations/CCF-MAG-1234/payment-reference",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "invalid-json",
        }
      );

      const res = await publicPaymentRefHandler(req, {
        params: Promise.resolve({ slug: "magnora-26", code: "CCF-MAG-1234" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.INVALID_REQUEST);
    });

    it("returns 400 when userReference is missing from body", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/events/magnora-26/registrations/CCF-MAG-1234/payment-reference",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const res = await publicPaymentRefHandler(req, {
        params: Promise.resolve({ slug: "magnora-26", code: "CCF-MAG-1234" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.INVALID_REFERENCE);
    });

    it("returns 404 when registration does not match the URL slug", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: { slug: "other-event" },
      });

      const req = new NextRequest(
        "http://localhost:3000/api/events/magnora-26/registrations/CCF-MAG-1234/payment-reference",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userReference: "408112345678" }),
        }
      );

      const res = await publicPaymentRefHandler(req, {
        params: Promise.resolve({ slug: "magnora-26", code: "CCF-MAG-1234" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.REGISTRATION_NOT_FOUND);
    });

    it("returns domain error status and code when service rejects", async () => {
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        event: { slug: "magnora-26" },
      });

      (paymentService.submitPaymentReference as any).mockRejectedValue(
        new PaymentDomainError(
          "This registration is for a free event and does not require payment.",
          PaymentErrorCode.REGISTRATION_NOT_PAID,
          400
        )
      );

      const req = new NextRequest(
        "http://localhost:3000/api/events/magnora-26/registrations/CCF-MAG-1234/payment-reference",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userReference: "408112345678" }),
        }
      );

      const res = await publicPaymentRefHandler(req, {
        params: Promise.resolve({ slug: "magnora-26", code: "CCF-MAG-1234" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.REGISTRATION_NOT_PAID);
    });
  });

  describe("PATCH /api/admin/events/[id]/registrations/[registrationId]/payment", () => {
    it("returns 401 when unauthenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost:3000/api/admin/events/ev-1/registrations/reg-1/payment",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "VERIFY" }),
        }
      );

      const res = await adminPaymentHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.UNAUTHORIZED);
    });

    it("returns 403 when user is not CCF_ADMIN or IT_ADMIN", async () => {
      (getCurrentAdmin as any).mockResolvedValue({
        ...mockAdmin,
        role: "FACULTY" as any,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/events/ev-1/registrations/reg-1/payment",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "VERIFY" }),
        }
      );

      const res = await adminPaymentHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.UNAUTHORIZED);
    });

    it("returns 400 on malformed JSON", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);

      const req = new NextRequest(
        "http://localhost:3000/api/admin/events/ev-1/registrations/reg-1/payment",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "invalid-json",
        }
      );

      const res = await adminPaymentHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.INVALID_REQUEST);
    });

    it("returns 400 on invalid action (not VERIFY or REJECT)", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);

      const req = new NextRequest(
        "http://localhost:3000/api/admin/events/ev-1/registrations/reg-1/payment",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CANCEL" }),
        }
      );

      const res = await adminPaymentHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.INVALID_REQUEST);
    });

    it("returns 404 if registration does not belong to the event ID in the path", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        eventId: "different-event-id",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/events/ev-1/registrations/reg-1/payment",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "VERIFY" }),
        }
      );

      const res = await adminPaymentHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe(PaymentErrorCode.REGISTRATION_NOT_FOUND);
    });

    it("successfully calls verifyPaymentByAdmin and returns 200 on action: VERIFY", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        eventId: "ev-1",
      });

      const mockVerifiedPayment = {
        id: "pay-1",
        status: PaymentStatus.VERIFIED,
        method: PaymentMethod.MANUAL_UPI,
        amount: "250",
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
        userReference: "408112345678",
        verifiedBy: mockAdmin.id,
        verifierName: mockAdmin.name,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (paymentService.verifyPaymentByAdmin as any).mockResolvedValue(
        mockVerifiedPayment
      );

      const req = new NextRequest(
        "http://localhost:3000/api/admin/events/ev-1/registrations/reg-1/payment",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "VERIFY", notes: "Bank statement verified" }),
        }
      );

      const res = await adminPaymentHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.payment.status).toBe(PaymentStatus.VERIFIED);
      expect(paymentService.verifyPaymentByAdmin).toHaveBeenCalledWith(
        "reg-1",
        mockAdmin.id,
        "Bank statement verified"
      );
    });

    it("successfully calls rejectPaymentByAdmin and returns 200 on action: REJECT", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        eventId: "ev-1",
      });

      const mockRejectedPayment = {
        id: "pay-1",
        status: PaymentStatus.REJECTED,
        method: PaymentMethod.MANUAL_UPI,
        amount: "250",
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
        userReference: "FAKE-UTR",
        verifiedBy: null,
        verifierName: null,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (paymentService.rejectPaymentByAdmin as any).mockResolvedValue(
        mockRejectedPayment
      );

      const req = new NextRequest(
        "http://localhost:3000/api/admin/events/ev-1/registrations/reg-1/payment",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "REJECT", reason: "Invalid UTR" }),
        }
      );

      const res = await adminPaymentHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.payment.status).toBe(PaymentStatus.REJECTED);
      expect(paymentService.rejectPaymentByAdmin).toHaveBeenCalledWith(
        "reg-1",
        mockAdmin.id,
        "Invalid UTR"
      );
    });
  });
});
