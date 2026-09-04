import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CCF_EVENTS,
  getEventBySlug,
} from "@/lib/data/events";
import {
  CCF_EVENT_CONTENTS,
  getEventContentBySlug,
  getEventMediaUrl,
  EVENT_NOTICES,
  type CcfEventMedia,
} from "@/lib/data/event-content";
import {
  EventDetailHero,
  EventDetails,
  EventContent,
  EventGallery,
  EventDetailCta,
} from "@/components/events";
import EventDetailPage, {
  generateStaticParams,
  generateMetadata,
} from "@/app/(public)/events/[slug]/page";
import { HOMEPAGE_FEATURED_EVENTS } from "@/lib/data/homepage";

// Mock next/navigation notFound
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Event Detail Page & Showcase Verification (Phase 5 Task 5 Revision)", () => {
  const FORBIDDEN_SUPERLATIVES = [
    "premier",
    "leading",
    "flagship",
    "largest",
    "renowned",
    "prestigious",
    "industry-leading",
    "award-winning",
    "globally recognized",
    "revolutionary",
    "world-class",
    "groundbreaking",
  ];

  const UNVERIFIED_CLAIMS = [
    "empowers",
    "transforms",
    "builds careers",
    "creates leaders",
    "industry exposure",
    "real-world opportunities",
    "connects students with professionals",
    "future leaders",
    "elite",
    "best minds",
  ];

  describe("1. Slug Resolution & Static Generation", () => {
    it("resolves all three canonical events by slug", () => {
      const magnora = getEventBySlug("magnora-26");
      expect(magnora).toBeDefined();
      expect(magnora?.name).toBe("Magnora’26");

      const finrise = getEventBySlug("finrise-25");
      expect(finrise).toBeDefined();
      expect(finrise?.name).toBe("FinRise’25");

      const finvibe = getEventBySlug("finvibe-fiesta-s2");
      expect(finvibe).toBeDefined();
      expect(finvibe?.name).toBe("FinVibe Fiesta Season 02");
    });

    it("returns undefined for an unknown slug", () => {
      const unknown = getEventBySlug("unknown-event-2099");
      expect(unknown).toBeUndefined();
    });

    it("generates static params for exactly the three canonical events", () => {
      const params = generateStaticParams();
      expect(params).toEqual([
        { slug: "magnora-26" },
        { slug: "finrise-25" },
        { slug: "finvibe-fiesta-s2" },
      ]);
    });
  });

  describe("2. Dynamic Metadata Resolution", () => {
    it("generates factual metadata for verified events without invented domains", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: "magnora-26" }),
      });
      expect(meta.title).toBe("Magnora’26 — Crescent Club of Finance | Crescent College");
      expect(meta.description).toBe(
        "Finance and business symposium organized by CCF at Crescent College."
      );
      expect((meta.openGraph as Record<string, unknown>)?.siteName).toBe(
        "Crescent Club of Finance"
      );
      expect((meta.openGraph as Record<string, unknown>)?.url).toBeUndefined();
    });

    it("returns fallback title for unknown slug in generateMetadata", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: "non-existent" }),
      });
      expect(meta.title).toBe("Event Not Found — Crescent Club of Finance");
    });
  });

  describe("3. Component Unit Rendering & Accessibility", () => {
    it("renders EventDetailHero with canonical eyebrow, h1 title, and back link", () => {
      const magnora = CCF_EVENTS[0];
      const html = renderToStaticMarkup(<EventDetailHero event={magnora} />);

      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).toContain("<h1");
      expect(html).toContain("Magnora’26");
      expect(html).toContain('href="/events"');
      expect(html).toContain("Back to Events");
      expect(html).toContain("UPCOMING");
      expect(html).toContain("Symposium");
      expect(html).toContain("Edition: 2026");
    });

    it("renders EventDetails with four key metadata cards for confirmed events", () => {
      const finrise = CCF_EVENTS[1];
      const html = renderToStaticMarkup(<EventDetails event={finrise} />);

      expect(html).toContain("Date");
      expect(html).toContain("2025");
      expect(html).toContain("Location");
      expect(html).toContain("Crescent Campus, Vandalur");
      expect(html).toContain("Category");
      expect(html).toContain("Convention");
      expect(html).toContain("Edition");
      expect(html).toContain("2025");
    });

    it("strictly omits fabricated metadata fallbacks (Annual, Finance Event, Crescent Campus) when fields are absent", () => {
      const minimalEvent = {
        id: "evt-test-minimal",
        slug: "test-minimal",
        name: "Minimal Test Event",
        status: "UPCOMING" as const,
        statusVariant: "warning" as const,
        dateText: "October 2026",
        description: "A test description.",
        shortDescription: "A test description.",
      };

      const html = renderToStaticMarkup(<EventDetails event={minimalEvent} />);

      // Only confirmed Date field should render
      expect(html).toContain("Date");
      expect(html).toContain("October 2026");

      // Fabricated default fallbacks must strictly NOT appear
      expect(html).not.toContain("Crescent Campus, Vandalur");
      expect(html).not.toContain("Finance Event");
      expect(html).not.toContain("Annual");
      expect(html).not.toContain("Location");
      expect(html).not.toContain("Category");
      expect(html).not.toContain("Edition");
    });

    it("renders EventContent for upcoming event with approved notice and empty highlights state", () => {
      const magnora = CCF_EVENTS[0];
      const content = getEventContentBySlug("magnora-26");
      const html = renderToStaticMarkup(
        <EventContent event={magnora} content={content} />
      );

      // Approved upcoming notice
      expect(html).toContain(
        "Additional event details will be published as they are confirmed."
      );
      expect(html).not.toContain(
        "Details and registration announcements will be posted closer to the event schedule."
      );

      // About section
      expect(html).toContain("About the Event");
      expect(html).toContain(magnora.description);

      // Empty highlights
      expect(html).toContain("Event Highlights");
      expect(html).toContain(EVENT_NOTICES.emptyHighlights);

      // No fake registration claims
      expect(html).not.toContain("Register Now");
      expect(html).not.toContain("Registration Open");
      expect(html).not.toContain("Ticket Price");
    });

    it("renders EventContent for past event with concluded notice", () => {
      const finrise = CCF_EVENTS[1];
      const content = getEventContentBySlug("finrise-25");
      const html = renderToStaticMarkup(
        <EventContent event={finrise} content={content} />
      );

      expect(html).toContain(
        "This event has concluded. Registrations and submissions are closed."
      );
      expect(html).toContain("About the Event");
      expect(html).toContain(finrise.description);
    });

    it("renders EventContent with highlights when highlights are provided", () => {
      const testEvent = CCF_EVENTS[0];
      const customContent = {
        slug: testEvent.slug,
        highlights: ["Symposium Opening Ceremony", "Finance Panel Session"],
      };
      const html = renderToStaticMarkup(
        <EventContent event={testEvent} content={customContent} />
      );

      expect(html).toContain("Symposium Opening Ceremony");
      expect(html).toContain("Finance Panel Session");
      expect(html).not.toContain(EVENT_NOTICES.emptyHighlights);
    });

    it("renders EventGallery empty state tastefully when no media exists", () => {
      const html = renderToStaticMarkup(<EventGallery media={[]} />);
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).toContain("Event Gallery");
      expect(html).toContain(EVENT_NOTICES.emptyGallery);
      expect(html).not.toContain("<img");
    });

    it("renders EventGallery with images, sorted by displayOrder, with proper altText", () => {
      const mockMedia: CcfEventMedia[] = [
        {
          id: "med-2",
          objectKey: "/images/event-2.jpg",
          altText: "Second event photo",
          displayOrder: 2,
          caption: "Panel discussion",
        },
        {
          id: "med-1",
          objectKey: "/images/event-1.jpg",
          altText: "First event photo",
          displayOrder: 1,
          caption: "Opening ceremony",
        },
      ];

      const html = renderToStaticMarkup(<EventGallery media={mockMedia} />);
      expect(html).toContain("Second event photo");
      expect(html).toContain("First event photo");
      expect(html).toContain("Panel discussion");
      expect(html).toContain("Opening ceremony");

      // Verify displayOrder: item 1 must appear before item 2
      const firstIndex = html.indexOf("First event photo");
      const secondIndex = html.indexOf("Second event photo");
      expect(firstIndex).toBeGreaterThan(-1);
      expect(secondIndex).toBeGreaterThan(firstIndex);
    });

    it("EventDetailCta renders appropriate actions for upcoming vs past events", () => {
      const upcomingHtml = renderToStaticMarkup(
        <EventDetailCta event={CCF_EVENTS[0]} />
      );
      expect(upcomingHtml).toContain("Interested in CCF Initiatives?");
      expect(upcomingHtml).toContain('href="/join-us"');
      expect(upcomingHtml).toContain('href="/events"');

      const pastHtml = renderToStaticMarkup(
        <EventDetailCta event={CCF_EVENTS[1]} />
      );
      expect(pastHtml).toContain("Explore More CCF Events");
      expect(pastHtml).toContain(
        "Explore other events and activities organized by Crescent Club of Finance."
      );
      expect(pastHtml).not.toContain("workshops");
      expect(pastHtml).toContain('href="/events"');
      expect(pastHtml).toContain('href="/join-us"');
    });
  });

  describe("4. Full Dynamic Route Page Execution", () => {
    it("renders complete EventDetailPage for Magnora'26 without placeholders or forbidden text", async () => {
      const page = await EventDetailPage({
        params: Promise.resolve({ slug: "magnora-26" }),
      });
      const html = renderToStaticMarkup(page);

      expect(html).toContain("Magnora’26");
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).toContain("Event Gallery");
      expect(html).toContain(EVENT_NOTICES.emptyGallery);
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("Lorem ipsum");

      // Exactly 1 h1
      const h1Count = (html.match(/<h1/g) || []).length;
      expect(h1Count).toBe(1);

      // Section headings as h2
      const h2Count = (html.match(/<h2/g) || []).length;
      expect(h2Count).toBeGreaterThanOrEqual(3);

      // Verify absence of forbidden marketing superlatives or unverified claims
      const textOnly = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(textOnly).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(textOnly).not.toContain(claim);
      }
    });

    it("renders complete EventDetailPage for FinRise'25 and FinVibe Fiesta Season 02", async () => {
      const finrisePage = await EventDetailPage({
        params: Promise.resolve({ slug: "finrise-25" }),
      });
      const finriseHtml = renderToStaticMarkup(finrisePage);
      expect(finriseHtml).toContain("FinRise’25");
      expect(finriseHtml).toContain("PREVIOUS EVENT");

      const finvibePage = await EventDetailPage({
        params: Promise.resolve({ slug: "finvibe-fiesta-s2" }),
      });
      const finvibeHtml = renderToStaticMarkup(finvibePage);
      expect(finvibeHtml).toContain("FinVibe Fiesta Season 02");
      expect(finvibeHtml).toContain("PREVIOUS EVENT");
    });

    it("invokes notFound() for an unknown event slug", async () => {
      mockNotFound.mockClear();
      try {
        await EventDetailPage({
          params: Promise.resolve({ slug: "unknown-slug" }),
        });
      } catch (err: unknown) {
        expect((err as Error).message).toBe("NEXT_NOT_FOUND");
      }
      expect(mockNotFound).toHaveBeenCalled();
    });
  });

  describe("5. Architecture, Media URL Safety & Regression Invariants", () => {
    it("getEventMediaUrl safely handles root-relative and absolute URLs without inventing domains", () => {
      expect(getEventMediaUrl("/images/test.png")).toBe("/images/test.png");
      expect(getEventMediaUrl("https://example.com/test.png")).toBe(
        "https://example.com/test.png"
      );
      // Unresolved bare key without configured env URL safely returns null
      expect(getEventMediaUrl("bare-key-123.jpg")).toBeNull();
      expect(getEventMediaUrl(undefined)).toBeNull();
      expect(getEventMediaUrl("")).toBeNull();
    });

    it("ensures event-content.ts does not duplicate or redefine event identity data", () => {
      for (const content of CCF_EVENT_CONTENTS) {
        // Must only contain slug, about, highlights, notes, media
        expect((content as unknown as Record<string, unknown>).name).toBeUndefined();
        expect((content as unknown as Record<string, unknown>).dateText).toBeUndefined();
        expect((content as unknown as Record<string, unknown>).venue).toBeUndefined();
        expect((content as unknown as Record<string, unknown>).category).toBeUndefined();
        expect((content as unknown as Record<string, unknown>).status).toBeUndefined();
        expect((content as unknown as Record<string, unknown>).edition).toBeUndefined();
      }
    });

    it("verifies homepage still consumes canonical CCF_EVENTS without regression", () => {
      expect(HOMEPAGE_FEATURED_EVENTS).toBe(CCF_EVENTS);
      expect(HOMEPAGE_FEATURED_EVENTS).toHaveLength(3);
    });
  });
});
