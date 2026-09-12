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
});
