import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RegistrationSuccess } from "@/components/registration/registration-success";
import {
  PaymentVerificationDialog,
  PaymentDetail,
} from "@/components/admin/registrations/payment-verification-dialog";
import {
  RegistrationListTable,
  AdminRegistrationItem,
} from "@/components/admin/registrations/registration-list-table";
import {
  PaymentStatus,
  PaymentMethod,
  RegistrationStatus,
  RegistrationType,
  ParticipantType,
} from "@prisma/client";
import { RegistrationConfirmation } from "@/lib/registrations/types";

describe("Phase 10: Payment UI Components & State Machine", () => {
  describe("RegistrationSuccess - Payment Presentation", () => {
    it("renders manual UPI payment section with QR code and UTR form for PENDING paid registration", () => {
      const confirmation: RegistrationConfirmation = {
        id: "reg-1",
        registrationCode: "CCF-MAG-9876",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "John Doe",
        createdAt: "2026-09-07T12:00:00Z",
        event: {
          id: "ev-1",
          name: "Magnora ’26",
          slug: "magnora-26",
        },
        payment: {
          status: PaymentStatus.PENDING,
          method: PaymentMethod.MANUAL_UPI,
          amount: "250.00",
          currency: "INR",
          upiId: "crescentclub@okaxis",
          payeeName: "Crescent Club of Finance",
          userReference: null,
          paymentUri:
            "upi://pay?pa=crescentclub%40okaxis&pn=Crescent%20Club%20of%20Finance&am=250.00&cu=INR",
        },
      };

      const html = renderToStaticMarkup(
        <RegistrationSuccess confirmation={confirmation} />
      );

      // Amount and Payee details
      expect(html).toContain("Payment Required");
      expect(html).toContain("250.00");
      expect(html).toContain("crescentclub@okaxis");
      expect(html).toContain("Crescent Club of Finance");

      // UPI QR and Intent Link
      expect(html).toContain("Pay with UPI App");
      expect(html).toContain("upi://pay?");

      // UTR Reference submission input
      expect(html).toContain("Submit Payment Reference (UTR)");
      expect(html).toContain("Submit UTR");
      expect(html).toContain("placeholder=\"e.g. 408112345678 (12-digit UTR)\"");

      // Status badge shows PENDING
      expect(html).toContain("PENDING");

      // Public UI strictly must NOT render any admin verification action
      expect(html).not.toContain("Verify Payment");
      expect(html).not.toContain("Reject Payment");
    });

    it("renders submitted UTR reference and awaiting admin verification notice when reference is present", () => {
      const confirmation: RegistrationConfirmation = {
        id: "reg-1",
        registrationCode: "CCF-MAG-9876",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "John Doe",
        createdAt: "2026-09-07T12:00:00Z",
        event: {
          id: "ev-1",
          name: "Magnora ’26",
          slug: "magnora-26",
        },
        payment: {
          status: PaymentStatus.PENDING,
          method: PaymentMethod.MANUAL_UPI,
          amount: "250.00",
          currency: "INR",
          upiId: "crescentclub@okaxis",
          payeeName: "Crescent Club of Finance",
          userReference: "408112345678",
          paymentUri: "upi://pay?pa=crescentclub%40okaxis&am=250.00",
        },
      };

      const html = renderToStaticMarkup(
        <RegistrationSuccess confirmation={confirmation} />
      );

      // Shows submitted UTR in input and Update UTR button
      expect(html).toContain("408112345678");
      expect(html).toContain("Payment reference on file.");
      expect(html).toContain("Update UTR");
    });

    it("renders verified status badge and disables reference update when payment is VERIFIED", () => {
      const confirmation: RegistrationConfirmation = {
        id: "reg-1",
        registrationCode: "CCF-MAG-9876",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "John Doe",
        createdAt: "2026-09-07T12:00:00Z",
        event: {
          id: "ev-1",
          name: "Magnora ’26",
          slug: "magnora-26",
        },
        payment: {
          status: PaymentStatus.VERIFIED,
          method: PaymentMethod.MANUAL_UPI,
          amount: "250.00",
          currency: "INR",
          upiId: "crescentclub@okaxis",
          payeeName: "Crescent Club of Finance",
          userReference: "408112345678",
          paymentUri: "upi://pay?pa=crescentclub%40okaxis&am=250.00",
        },
      };

      const html = renderToStaticMarkup(
        <RegistrationSuccess confirmation={confirmation} />
      );

      expect(html).toContain("VERIFIED");
      expect(html).toContain("408112345678");
      // Reference input is disabled
      expect(html).toContain("disabled=\"\"");
    });

    it("renders rejected status badge when payment is REJECTED", () => {
      const confirmation: RegistrationConfirmation = {
        id: "reg-1",
        registrationCode: "CCF-MAG-9876",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "John Doe",
        createdAt: "2026-09-07T12:00:00Z",
        event: {
          id: "ev-1",
          name: "Magnora ’26",
          slug: "magnora-26",
        },
        payment: {
          status: PaymentStatus.REJECTED,
          method: PaymentMethod.MANUAL_UPI,
          amount: "250.00",
          currency: "INR",
          upiId: "crescentclub@okaxis",
          payeeName: "Crescent Club of Finance",
          userReference: "INVALID-UTR",
          paymentUri: "upi://pay?pa=crescentclub%40okaxis&am=250.00",
        },
      };

      const html = renderToStaticMarkup(
        <RegistrationSuccess confirmation={confirmation} />
      );

      expect(html).toContain("REJECTED");
    });

    it("does not render any payment section for FREE events", () => {
      const confirmation: RegistrationConfirmation = {
        id: "reg-1",
        registrationCode: "CCF-FREE-1111",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "Jane Smith",
        createdAt: "2026-09-07T12:00:00Z",
        event: {
          id: "ev-2",
          name: "FinRise Free Workshop",
          slug: "finrise-free",
        },
        payment: null,
      };

      const html = renderToStaticMarkup(
        <RegistrationSuccess confirmation={confirmation} />
      );

      expect(html).not.toContain("Payment Required");
      expect(html).not.toContain("Pay with UPI App");
      expect(html).not.toContain("Submit Payment Reference (UTR)");
    });
  });

  describe("PaymentVerificationDialog - Admin State Machine Rules", () => {
    const basePayment: PaymentDetail = {
      id: "pay-1",
      status: PaymentStatus.PENDING,
      amount: "250",
      currency: "INR",
      upiId: "crescentclub@okaxis",
      payeeName: "Crescent Club of Finance",
      userReference: "408112345678",
      paymentUri: "upi://pay?pa=crescentclub%40okaxis&am=250",
      verifiedBy: null,
      verifierName: null,
      verifiedAt: null,
      createdAt: "2026-09-07T12:00:00Z",
    };

    it("PENDING state: renders BOTH Verify Payment and Reject buttons", () => {
      const html = renderToStaticMarkup(
        <PaymentVerificationDialog
          isOpen={true}
          onClose={() => {}}
          registrationId="reg-1"
          eventId="ev-1"
          eventName="Magnora ’26"
          registrationCode="CCF-MAG-1234"
          participantName="John Doe"
          payment={{
            ...basePayment,
            status: PaymentStatus.PENDING,
          }}
          onPaymentUpdated={() => {}}
        />
      );

      // Verify button visible
      expect(html).toContain("Verify Payment");
      // Reject button visible
      expect(html).toContain("Reject");
      // UTR reference displayed
      expect(html).toContain("408112345678");
      // Admin notes input rendered
      expect(html).toContain("admin-payment-notes");
    });

    it("REJECTED state: renders Verify Payment button, but strictly HIDES Reject button", () => {
      const html = renderToStaticMarkup(
        <PaymentVerificationDialog
          isOpen={true}
          onClose={() => {}}
          registrationId="reg-1"
          eventId="ev-1"
          eventName="Magnora ’26"
          registrationCode="CCF-MAG-1234"
          participantName="John Doe"
          payment={{
            ...basePayment,
            status: PaymentStatus.REJECTED,
          }}
          onPaymentUpdated={() => {}}
        />
      );

      // Verify button visible (re-verification allowed: REJECTED -> VERIFIED)
      expect(html).toContain("Verify Payment");
      // Reject button strictly forbidden & hidden
      expect(html).not.toContain(">Reject<");
      expect(html).not.toContain("Reject</button>");
    });

    it("VERIFIED state: strictly HIDES both Verify and Reject buttons, and displays verification audit info", () => {
      const html = renderToStaticMarkup(
        <PaymentVerificationDialog
          isOpen={true}
          onClose={() => {}}
          registrationId="reg-1"
          eventId="ev-1"
          eventName="Magnora ’26"
          registrationCode="CCF-MAG-1234"
          participantName="John Doe"
          payment={{
            ...basePayment,
            status: PaymentStatus.VERIFIED,
            verifiedBy: "admin-1",
            verifierName: "Lead Admin",
            verifiedAt: "2026-09-07T14:30:00Z",
          }}
          onPaymentUpdated={() => {}}
        />
      );

      // Both action buttons strictly hidden
      expect(html).not.toContain("Verify Payment");
      expect(html).not.toContain(">Reject<");

      // Verification audit details displayed
      expect(html).toContain("Verified Payment");
      expect(html).toContain("Lead Admin");
      expect(html).toContain("Verified on:");
    });

    it("REFUNDED state: strictly hides Reject button and prevents invalid transitions", () => {
      const html = renderToStaticMarkup(
        <PaymentVerificationDialog
          isOpen={true}
          onClose={() => {}}
          registrationId="reg-1"
          eventId="ev-1"
          eventName="Magnora ’26"
          registrationCode="CCF-MAG-1234"
          participantName="John Doe"
          payment={{
            ...basePayment,
            status: PaymentStatus.REFUNDED,
          }}
          onPaymentUpdated={() => {}}
        />
      );

      expect(html).not.toContain(">Reject<");
    });

    it("does not render when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <PaymentVerificationDialog
          isOpen={false}
          onClose={() => {}}
          registrationId="reg-1"
          eventId="ev-1"
          eventName="Magnora ’26"
          registrationCode="CCF-MAG-1234"
          participantName="John Doe"
          payment={basePayment}
          onPaymentUpdated={() => {}}
        />
      );

      expect(html).toBe("");
    });
  });

  describe("RegistrationListTable - Payment Columns and Status Badges", () => {
    it("renders payment status badge, amount, and Payment action button for paid registrations", () => {
      const registrations: AdminRegistrationItem[] = [
        {
          id: "reg-1",
          eventId: "ev-1",
          eventName: "Magnora ’26",
          eventSlug: "magnora-26",
          registrationCode: "CCF-MAG-001",
          status: RegistrationStatus.ACTIVE,
          registrationType: "INDIVIDUAL",
          participantType: "CRESCENT",
          participantName: "Alice Walker",
          collegeNormalized: "Crescent",
          identifierNormalized: "210071601001",
          createdAt: "2026-09-07T10:00:00.000Z",
          paymentStatus: PaymentStatus.PENDING,
          paymentAmount: "250",
          payment: {
            id: "pay-1",
            status: PaymentStatus.PENDING,
            amount: "250",
            currency: "INR",
            upiId: "ccf@okaxis",
            payeeName: "CCF",
            paymentUri: "upi://pay?pa=ccf%40okaxis",
            userReference: "408112345678",
            verifiedAt: null,
            verifiedBy: null,
            verifierName: null,
            createdAt: "2026-09-07T10:00:00.000Z",
          },
          team: null,
        },
      ];

      const html = renderToStaticMarkup(
        <RegistrationListTable
          registrations={registrations}
          events={[{ id: "ev-1", name: "Magnora ’26" }]}
        />
      );

      expect(html).toContain("Alice Walker");
      expect(html).toContain("CCF-MAG-001");
      expect(html).toContain("PENDING");
      expect(html).toContain("UTR: 408112345678");
      expect(html).toContain("Payment");
    });
  });
});
