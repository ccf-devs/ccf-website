import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  EventStatusBadge,
  EventListTable,
  EventDetailView,
  EventForm,
} from "@/components/admin/events";
import {
  EventStatus,
  EventCapacityMode,
  RegistrationMode,
  RegistrationMethod,
  PaymentMode,
  PaymentMethod,
} from "@prisma/client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Admin Event Management UI Components (Phase 6)", () => {
  const sampleEvent = {
    id: "evt-test-1",
    name: "Magnora’26 Finance Symposium",
    slug: "magnora-26",
    status: EventStatus.PUBLISHED,
    startsAt: new Date("2026-10-15T09:00:00.000Z"),
    endsAt: new Date("2026-10-15T17:00:00.000Z"),
    venue: "Crescent Campus, Vandalur",
    capacityMode: EventCapacityMode.PARTICIPANTS,
    capacity: 250,
    registrationMode: RegistrationMode.INTERNAL,
    registrationMethod: RegistrationMethod.BUILT_IN,
    eligibilityCrescent: true,
    eligibilityExternal: true,
    registrationOpensAt: new Date("2026-09-01T00:00:00.000Z"),
    registrationClosesAt: new Date("2026-10-10T23:59:59.000Z"),
    activeFormVersionId: null,
    paymentMode: PaymentMode.PAID,
    paymentMethod: PaymentMethod.MANUAL_UPI,
    feeAmount: 150.0,
    upiId: "crescent@upi",
    payeeName: "Crescent Club of Finance",
    createdAt: new Date("2026-08-15T10:00:00.000Z"),
    updatedAt: new Date("2026-08-16T12:00:00.000Z"),
    content: {
      descriptionRich: "Official annual finance symposium of CCF.",
      rulesRich: "Rule 1: Academic honesty required.",
      instructionsRich: "Bring your laptop and college ID.",
      eligibilityRich: "Open to all enrolled undergraduate students.",
      notesRich: "Audio-visual team confirmed.",
    },
  };

  describe("1. EventStatusBadge", () => {
    it("renders distinct accessible badges for all four lifecycle states", () => {
      const publishedHtml = renderToStaticMarkup(
        <EventStatusBadge status={EventStatus.PUBLISHED} />
      );
      expect(publishedHtml).toContain("Published");

      const draftHtml = renderToStaticMarkup(
        <EventStatusBadge status={EventStatus.DRAFT} />
      );
      expect(draftHtml).toContain("Draft");

      const closedHtml = renderToStaticMarkup(
        <EventStatusBadge status={EventStatus.CLOSED} />
      );
      expect(closedHtml).toContain("Closed");

      const archivedHtml = renderToStaticMarkup(
        <EventStatusBadge status={EventStatus.ARCHIVED} />
      );
      expect(archivedHtml).toContain("Archived");
    });
  });

  describe("2. EventListTable & Database Boundary Distinction (Correction 4)", () => {
    it("renders events table with name, slug, status, dates, and actions when data is present", () => {
      const html = renderToStaticMarkup(
        <EventListTable events={[sampleEvent]} dbError={null} />
      );

      expect(html).toContain("Magnora’26 Finance Symposium");
      expect(html).toContain("/magnora-26");
      expect(html).toContain("Published");
      expect(html).toContain("Crescent Campus, Vandalur");
      expect(html).toContain('href="/admin/events/evt-test-1"');
      expect(html).toContain('href="/admin/events/evt-test-1/edit"');
    });

    it("renders normal empty state when query succeeds with 0 rows (dbError is null)", () => {
      const html = renderToStaticMarkup(
        <EventListTable events={[]} dbError={null} />
      );

      expect(html).toContain("No events created yet");
      expect(html).toContain("Create First Event");
      expect(html).not.toContain("Database Connection Unavailable");
    });

    it("renders explicit database error banner and NEVER normal empty state when dbError occurs (Correction 4)", () => {
      const html = renderToStaticMarkup(
        <EventListTable
          events={[]}
          dbError="Unable to reach PostgreSQL at localhost:5432"
        />
      );

      // Must display explicit database error
      expect(html).toContain("Database Connection Unavailable");
      expect(html).toContain("Unable to reach PostgreSQL at localhost:5432");
      expect(html).toContain("DATABASE_URL");

      // Must NOT pretend that normal empty state occurred!
      expect(html).not.toContain("No events created yet");
    });
  });

  describe("3. EventDetailView", () => {
    it("renders full configuration across all 4 operational cards and 5 canonical content sections", () => {
      const html = renderToStaticMarkup(<EventDetailView event={sampleEvent} />);

      // Top identity & actions
      expect(html).toContain("Back to Events");
      expect(html).toContain('href="/admin/events/evt-test-1/edit"');

      // Card 1: Schedule & Venue
      expect(html).toContain("Schedule &amp; Venue");
      expect(html).toContain("Crescent Campus, Vandalur");

      // Card 2: Registration
      expect(html).toContain("Registration Mode &amp; Method");
      expect(html).toContain("INTERNAL");
      expect(html).toContain("BUILT_IN");

      // Card 3: Eligibility & Capacity
      expect(html).toContain("Eligibility &amp; Capacity");
      expect(html).toContain("Eligible");
      expect(html).toContain("250");

      // Card 4: Payment & Accounting
      expect(html).toContain("Payment &amp; Accounting");
      expect(html).toContain("PAID");
      expect(html).toContain("MANUAL_UPI");
      expect(html).toContain("150.00");
      expect(html).toContain("crescent@upi");
      expect(html).toContain("Crescent Club of Finance");

      // 5 Canonical EventContent fields (Correction 6)
      expect(html).toContain("description_rich");
      expect(html).toContain("Official annual finance symposium of CCF.");
      expect(html).toContain("rules_rich");
      expect(html).toContain("Rule 1: Academic honesty required.");
      expect(html).toContain("instructions_rich");
      expect(html).toContain("Bring your laptop and college ID.");
      expect(html).toContain("eligibility_rich");
      expect(html).toContain("Open to all enrolled undergraduate students.");
      expect(html).toContain("notes_rich");
      expect(html).toContain("Audio-visual team confirmed.");

      // System identifiers
      expect(html).toContain("evt-test-1");
    });

    it("prohibits fabricated operational metrics in detail view", () => {
      const html = renderToStaticMarkup(
        <EventDetailView event={sampleEvent} />
      ).toLowerCase();

      expect(html).not.toContain("total revenue");
      expect(html).not.toContain("tickets sold");
      expect(html).not.toContain("conversion rate");
      expect(html).not.toContain("attendance percentage");
    });
  });

  describe("4. EventForm", () => {
    it("renders all form fieldsets and accessible inputs in create mode", () => {
      const html = renderToStaticMarkup(<EventForm mode="create" />);

      expect(html).toContain("Event Core Identity");
      expect(html).toContain("Event Name");
      expect(html).toContain("URL Slug");
      expect(html).toContain("Auto-generate from name");
      expect(html).toContain("Date, Time &amp; Venue");
      expect(html).toContain("Registration Settings");
      expect(html).toContain("Eligibility &amp; Capacity Limits");
      expect(html).toContain("Payment &amp; Registration Fees");
      expect(html).toContain("Event Documentation &amp; Content");

      // 5 canonical content inputs
      expect(html).toContain("description_rich");
      expect(html).toContain("rules_rich");
      expect(html).toContain("instructions_rich");
      expect(html).toContain("eligibility_rich");
      expect(html).toContain("notes_rich");

      expect(html).toContain("Create Event");
    });

    it("pre-populates inputs with initial data in edit mode", () => {
      const html = renderToStaticMarkup(
        <EventForm
          mode="edit"
          eventId="evt-test-1"
          initialData={{
            name: "Magnora’26 Finance Symposium",
            slug: "magnora-26",
            status: EventStatus.DRAFT,
            venue: "Auditorium Hall",
            descriptionRich: "Prepopulated overview",
          }}
        />
      );

      expect(html).toContain('value="Magnora’26 Finance Symposium"');
      expect(html).toContain('value="magnora-26"');
      expect(html).toContain('value="Auditorium Hall"');
      expect(html).toContain("Prepopulated overview");
      expect(html).toContain("Update Event");
    });
  });
});
