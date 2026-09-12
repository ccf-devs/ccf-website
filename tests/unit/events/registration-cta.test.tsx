import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventRegistrationCta } from "@/components/events/event-registration-cta";
import { type CcfEvent } from "@/lib/data/events";

describe("EventRegistrationCta Component Unit Tests", () => {
  const baseEvent: CcfEvent = {
    id: "evt-test-1",
    slug: "symposium-2026",
    name: "Finance Symposium 2026",
    status: "UPCOMING",
    statusVariant: "warning",
    dateText: "Oct 2026",
    description: "Annual CCF finance symposium.",
    shortDescription: "Annual CCF finance symposium.",
  };

  describe("Case A — INTERNAL + REGISTRATION OPEN", () => {
    it("renders 'Registration is Open' with active Register Now button linking to /events/[slug]/register", () => {
      const event: CcfEvent = {
        ...baseEvent,
        registrationMode: "INTERNAL",
        registrationMethod: "BUILT_IN",
        registrationOpensAt: null,
        registrationClosesAt: null,
      };

      const html = renderToStaticMarkup(<EventRegistrationCta event={event} />);
      expect(html).toContain("Registration is Open");
      expect(html).toContain("Register Now");
      expect(html).toContain('href="/events/symposium-2026/register"');
      expect(html).not.toContain("Registration Closed");
      expect(html).not.toContain("Registration Opens Soon");
      expect(html).not.toContain("No registration is required");
    });
  });

  describe("Case B — INTERNAL + OPENS SOON", () => {
    it("renders 'Registration Opens Soon' with opening datetime and NO active Register Now button", () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const event: CcfEvent = {
        ...baseEvent,
        registrationMode: "INTERNAL",
        registrationMethod: "BUILT_IN",
        registrationOpensAt: futureDate,
        registrationClosesAt: null,
      };

      const html = renderToStaticMarkup(<EventRegistrationCta event={event} />);
      expect(html).toContain("Registration Opens Soon");
      expect(html).not.toContain('href="/events/symposium-2026/register"');
      expect(html).not.toContain("Registration is Open");
      expect(html).not.toContain("Registration Closed");
    });
  });

  describe("Case C — INTERNAL + REGISTRATION CLOSED", () => {
    it("renders 'Registration Closed' when registrationClosesAt is in the past and NO active registration link", () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const event: CcfEvent = {
        ...baseEvent,
        registrationMode: "INTERNAL",
        registrationMethod: "BUILT_IN",
        registrationOpensAt: null,
        registrationClosesAt: pastDate,
      };

      const html = renderToStaticMarkup(<EventRegistrationCta event={event} />);
      expect(html).toContain("Registration Closed");
      expect(html).toContain("Registration for Finance Symposium 2026 has concluded.");
      expect(html).not.toContain('href="/events/symposium-2026/register"');
      expect(html).not.toContain("Register Now");
    });

    it("renders 'Registration Closed' when event status is PREVIOUS EVENT", () => {
      const event: CcfEvent = {
        ...baseEvent,
        status: "PREVIOUS EVENT",
        registrationMode: "INTERNAL",
        registrationMethod: "BUILT_IN",
      };

      const html = renderToStaticMarkup(<EventRegistrationCta event={event} />);
      expect(html).toContain("Registration Closed");
      expect(html).not.toContain('href="/events/symposium-2026/register"');
    });
  });

  describe("Case D — EXTERNAL REGISTRATION", () => {
    it("renders 'Registration' with explanatory text and safe external link", () => {
      const event: CcfEvent = {
        ...baseEvent,
        registrationMode: "EXTERNAL",
        externalRegistrationUrl: "https://forms.crescent.education/event-2026",
      };

      const html = renderToStaticMarkup(<EventRegistrationCta event={event} />);
      expect(html).toContain("Registration");
      expect(html).toContain(
        "Registration is handled through the official registration link."
      );
      expect(html).toContain('href="https://forms.crescent.education/event-2026"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });
  });

  describe("Case E — NO REGISTRATION REQUIRED / NOT CONFIGURED", () => {
    it("renders informational notice when registrationMode is NONE without misleading buttons", () => {
      const event: CcfEvent = {
        ...baseEvent,
        registrationMode: "NONE",
      };

      const html = renderToStaticMarkup(<EventRegistrationCta event={event} />);
      expect(html).toContain("No registration is required for this event.");
      expect(html).toContain(
        "This event is open to attendees without prior registration or credentials."
      );
      expect(html).not.toContain("Register Now");
      expect(html).not.toContain("<a");
    });

    it("renders informational notice when registrationMode is not configured", () => {
      const event: CcfEvent = {
        ...baseEvent,
      };

      const html = renderToStaticMarkup(<EventRegistrationCta event={event} />);
      expect(html).toContain("No registration is required for this event.");
      expect(html).not.toContain("Register Now");
    });
  });
});
