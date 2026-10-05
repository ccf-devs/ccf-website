import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RegistrationSuccess } from "@/components/registration/registration-success";
import { RegistrationConfirmation } from "@/lib/registrations/types";
import {
  RegistrationStatus,
  RegistrationType,
  ParticipantType,
} from "@prisma/client";

describe("RegistrationSuccess Public UI Simplification", () => {
  const sampleConfirmation: RegistrationConfirmation = {
    id: "reg-uuid-1",
    registrationCode: "CCF-MAG-2026-X99",
    status: RegistrationStatus.ACTIVE,
    registrationType: RegistrationType.INDIVIDUAL,
    participantType: ParticipantType.CRESCENT,
    participantName: "Amina Khan",
    createdAt: "2026-09-12T10:00:00Z",
    event: {
      id: "evt-uuid-1",
      name: "Magnora ’26",
      slug: "magnora-26",
    },
  };

  it("renders simplified, participant-oriented success state", () => {
    const html = renderToStaticMarkup(
      <RegistrationSuccess confirmation={sampleConfirmation} />
    );

    // Essential participant content
    expect(html).toContain("You&#x27;re Registered!");
    expect(html).toContain("Magnora ’26");
    expect(html).toContain("Your registration for");
    expect(html).toContain("has been confirmed.");
    expect(html).toContain("Registration Code");
    expect(html).toContain("CCF-MAG-2026-X99");
    expect(html).toContain(
      "Save this code for event check-in and future correspondence."
    );
    expect(html).toContain("Back to Event");
    expect(html).toContain("Explore More Events");
    expect(html).toContain('href="/events/magnora-26"');
    expect(html).toContain('href="/events"');

    // Strictly excludes internal/administrative metadata
    expect(html).not.toContain("Format");
    expect(html).not.toContain("Category");
    expect(html).not.toContain("Crescent Student");
    expect(html).not.toContain("External Participant");
  });

  it("renders PAYMENT REQUIRED and withholds registration code when UTR has not been submitted", () => {
    const paidConfirmation: RegistrationConfirmation = {
      ...sampleConfirmation,
      registrationCode: null,
      payment: {
        status: "PENDING",
        method: "MANUAL_UPI",
        amount: "250",
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club of Finance",
        userReference: null,
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
      },
    };

    const html = renderToStaticMarkup(
      <RegistrationSuccess confirmation={paidConfirmation} />
    );

    expect(html).toContain("PAYMENT REQUIRED");
    expect(html).toContain("Complete Your Payment");
    expect(html).toContain(
      "After completing the payment, enter your 12-digit UTR below. Your payment will be verified by the CCF team."
    );
    expect(html).not.toContain("Initiation is not proof of payment");
    expect(html).not.toContain("Registration Code");
    expect(html).not.toContain("CCF-MAG-2026-X99");
  });

  it("renders PAYMENT SUBMITTED and reveals registration code when UTR is present", () => {
    const paidSubmittedConfirmation: RegistrationConfirmation = {
      ...sampleConfirmation,
      registrationCode: "CCF-MAG-2026-X99",
      payment: {
        status: "PENDING",
        method: "MANUAL_UPI",
        amount: "250",
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club of Finance",
        userReference: "408112345678",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
      },
    };

    const html = renderToStaticMarkup(
      <RegistrationSuccess confirmation={paidSubmittedConfirmation} />
    );

    expect(html).toContain("PAYMENT SUBMITTED");
    expect(html).toContain("Payment Submitted");
    expect(html).toContain(
      "Your payment details have been submitted and are awaiting verification by the CCF team."
    );
    expect(html).toContain("Registration Code");
    expect(html).toContain("CCF-MAG-2026-X99");
    expect(html).toContain("SUBMITTED");
  });

  it("renders REGISTRATION CONFIRMED when payment status is VERIFIED", () => {
    const paidVerifiedConfirmation: RegistrationConfirmation = {
      ...sampleConfirmation,
      registrationCode: "CCF-MAG-2026-X99",
      payment: {
        status: "VERIFIED",
        method: "MANUAL_UPI",
        amount: "250",
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club of Finance",
        userReference: "408112345678",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
      },
    };

    const html = renderToStaticMarkup(
      <RegistrationSuccess confirmation={paidVerifiedConfirmation} />
    );

    expect(html).toContain("REGISTRATION CONFIRMED");
    expect(html).toContain("Registration Confirmed");
    expect(html).toContain("Your payment has been verified and your registration");
    expect(html).toContain("VERIFIED");
    expect(html).toContain("CCF-MAG-2026-X99");
  });

  it("renders PAYMENT REJECTED and enables resubmission when payment status is REJECTED", () => {
    const paidRejectedConfirmation: RegistrationConfirmation = {
      ...sampleConfirmation,
      registrationCode: null,
      payment: {
        status: "REJECTED",
        method: "MANUAL_UPI",
        amount: "250",
        currency: "INR",
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club of Finance",
        userReference: "408112345678",
        paymentUri: "upi://pay?pa=ccf%40okaxis&am=250",
      },
    };

    const html = renderToStaticMarkup(
      <RegistrationSuccess confirmation={paidRejectedConfirmation} />
    );

    expect(html).toContain("PAYMENT REJECTED");
    expect(html).toContain("Payment Rejected");
    expect(html).toContain("resubmit your 12-digit UTR below");
    expect(html).toContain("REJECTED");
  });
});
