import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CCF_EVENTS,
  CCF_UPCOMING_EVENTS,
  CCF_PAST_EVENTS,
  EVENTS_HERO,
  EVENTS_DIRECTORY_INFO,
  EVENTS_CTA,
} from "@/lib/data/events";
import {
  EventsHero,
  EventsOverview,
  EventsList,
  EventCard,
  EventsCta,
} from "@/components/events";
import EventsPage, { metadata } from "@/app/(public)/events/page";

describe("Events Page Comprehensive Verification (Phase 5 Task 5)", () => {
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

  describe("1. Canonical Event Dataset Integrity & Classification", () => {
    it("contains exactly the three confirmed CCF events", () => {
      expect(CCF_EVENTS).toHaveLength(3);
      const names = CCF_EVENTS.map((e) => e.name);
      expect(names).toEqual([
        "Magnora’26",
        "FinRise’25",
        "FinVibe Fiesta Season 02",
      ]);
    });

    it("ensures all event IDs and slugs are unique", () => {
      const ids = CCF_EVENTS.map((e) => e.id);
      expect(new Set(ids).size).toBe(3);

      const slugs = CCF_EVENTS.map((e) => e.slug);
      expect(new Set(slugs).size).toBe(3);
    });

    it("ensures all events have valid non-empty names, dates, descriptions, and statuses", () => {
      for (const event of CCF_EVENTS) {
        expect(event.name.trim().length).toBeGreaterThan(0);
        expect(event.slug.trim().length).toBeGreaterThan(0);
        expect(event.dateText.trim().length).toBeGreaterThan(0);
        expect(event.description.trim().length).toBeGreaterThan(0);
        expect(["UPCOMING", "PREVIOUS EVENT"]).toContain(event.status);
      }
    });

    it("correctly classifies Magnora'26 as UPCOMING", () => {
      const magnora = CCF_EVENTS.find((e) => e.name === "Magnora’26");
      expect(magnora).toBeDefined();
      expect(magnora?.status).toBe("UPCOMING");
      expect(magnora?.edition).toBe("2026");
      expect(magnora?.category).toBe("Symposium");
    });

    it("correctly classifies FinRise'25 as PREVIOUS EVENT (not upcoming)", () => {
      const finrise = CCF_EVENTS.find((e) => e.name === "FinRise’25");
      expect(finrise).toBeDefined();
      expect(finrise?.status).toBe("PREVIOUS EVENT");
      expect(finrise?.status).not.toBe("UPCOMING");
      expect(finrise?.edition).toBe("2025");
    });

    it("correctly classifies FinVibe Fiesta Season 02 as PREVIOUS EVENT (not upcoming)", () => {
      const finvibe = CCF_EVENTS.find((e) => e.name === "FinVibe Fiesta Season 02");
      expect(finvibe).toBeDefined();
      expect(finvibe?.status).toBe("PREVIOUS EVENT");
      expect(finvibe?.status).not.toBe("UPCOMING");
      expect(finvibe?.edition).toBe("Season 02");
    });

    it("verifies upcoming and past events partitioning", () => {
      expect(CCF_UPCOMING_EVENTS).toHaveLength(1);
      expect(CCF_UPCOMING_EVENTS[0].name).toBe("Magnora’26");

      expect(CCF_PAST_EVENTS).toHaveLength(2);
      expect(CCF_PAST_EVENTS.map((e) => e.name)).toEqual([
        "FinRise’25",
        "FinVibe Fiesta Season 02",
      ]);
    });

    it("omits fabricated registration states, unverified capacity, and fees", () => {
      for (const event of CCF_EVENTS) {
        expect(event.registrationState).toBeUndefined();
        expect((event as unknown as Record<string, unknown>).capacity).toBeUndefined();
        expect((event as unknown as Record<string, unknown>).fee).toBeUndefined();
        expect((event as unknown as Record<string, unknown>).speakers).toBeUndefined();
        expect((event as unknown as Record<string, unknown>).sponsors).toBeUndefined();
      }
    });

    it("strictly omits forbidden marketing superlatives and unverified promotional claims from data", () => {
      const allText = JSON.stringify({
        CCF_EVENTS,
        EVENTS_HERO,
        EVENTS_DIRECTORY_INFO,
        EVENTS_CTA,
      }).toLowerCase();

      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(allText).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(allText).not.toContain(claim);
      }
    });
  });

  describe("2. Section Component Rendering", () => {
    it("renders EventsHero with canonical CCF eyebrow, title, and action links", () => {
      const html = renderToStaticMarkup(<EventsHero />);
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).toContain("<h1");
      expect(html).toContain("Events");
      expect(html).toContain('href="#events-list"');
      expect(html).toContain("Explore Events");
      expect(html).toContain('href="/join-us"');
      expect(html).toContain("Join CCF");
    });

    it("renders EventsOverview with factual summaries without fake statistics or unsupported outcome claims", () => {
      const html = renderToStaticMarkup(<EventsOverview />);
      expect(html).toContain("1 Upcoming Event");
      expect(html).toContain("2 Concluded Events");
      expect(html).toContain("Campus Location");
      expect(html).toContain("Magnora’26");
      expect(html).toContain("FinRise’25 and FinVibe Fiesta Season 02 are past CCF events.");
      expect(html).not.toContain("successfully");
    });

    it("renders EventCard with event name, date, venue, description, status, and navigation action", () => {
      const magnora = CCF_EVENTS[0];
      const html = renderToStaticMarkup(<EventCard event={magnora} />);
      expect(html).toContain("Magnora’26");
      expect(html).toContain("2026");
      expect(html).toContain("Crescent Campus, Vandalur");
      expect(html).toContain(magnora.description);
      expect(html).toContain("UPCOMING");
      expect(html).toContain("Symposium");
      // Links to detail route with "View Details"
      expect(html).toContain('href="/events/magnora-26"');
      expect(html).toContain("View Details");
      // Unsupported claim removed
      expect(html).not.toContain("Official CCF 2026 Initiative");
      // No fake registration availability claim
      expect(html).not.toContain("Register Now");
      expect(html).not.toContain("Registration Open");
      expect(html).not.toContain("Seats Available");

      // Past event renders "View Event"
      const finrise = CCF_EVENTS[1];
      const pastHtml = renderToStaticMarkup(<EventCard event={finrise} />);
      expect(pastHtml).toContain('href="/events/finrise-25"');
      expect(pastHtml).toContain("View Event");
    });

    it("renders EventsList with distinct Upcoming and Past Events sections", () => {
      const html = renderToStaticMarkup(<EventsList />);
      expect(html).toContain("Upcoming Events");
      expect(html).toContain("Past Events");
      expect(html).toContain("Magnora’26");
      expect(html).toContain("FinRise’25");
      expect(html).toContain("FinVibe Fiesta Season 02");
      expect(html).toContain('id="directory"');
      expect(html).toContain('id="events-list"');
    });

    it("renders EventsCta with links to /join-us and /members", () => {
      const html = renderToStaticMarkup(<EventsCta />);
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).toContain("Interested in CCF Initiatives?");
      expect(html).toContain('href="/join-us"');
      expect(html).toContain("Join CCF");
      expect(html).toContain('href="/members"');
      expect(html).toContain("Meet the Team");
    });
  });

  describe("3. Full Page Assembly & Regression Safety", () => {
    it("renders complete EventsPage without placeholders or construction text", () => {
      const html = renderToStaticMarkup(<EventsPage />);

      // Prohibit construction text
      expect(html).not.toContain("Content under construction");
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("Lorem ipsum");

      // Canonical eyebrow present, old label strictly forbidden
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");

      // All 3 events rendered
      expect(html).toContain("Magnora’26");
      expect(html).toContain("FinRise’25");
      expect(html).toContain("FinVibe Fiesta Season 02");

      // Heading hierarchy: exactly 1 h1
      const h1Count = (html.match(/<h1/g) || []).length;
      expect(h1Count).toBe(1);

      // Section headings as h2
      const h2Count = (html.match(/<h2/g) || []).length;
      expect(h2Count).toBeGreaterThanOrEqual(3);

      // Event card titles as h3
      const h3Count = (html.match(/<h3/g) || []).length;
      expect(h3Count).toBeGreaterThanOrEqual(3);

      // Absence of forbidden words
      const textOnly = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(textOnly).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(textOnly).not.toContain(claim);
      }

      // No fake registration claims
      expect(textOnly).not.toContain("register now");
      expect(textOnly).not.toContain("registration open");
      expect(textOnly).not.toContain("seats available");
    });

    it("verifies metadata is factual and does not invent unverified production domains", () => {
      expect(metadata.title).toBe("Events — Crescent Club of Finance | Crescent College");
      expect(metadata.description).toBeTruthy();
      // No fake production URL in openGraph
      expect((metadata.openGraph as Record<string, unknown>)?.url).toBeUndefined();
    });

    it("verifies historical events are never rendered as upcoming", () => {
      const html = renderToStaticMarkup(<EventsList />);

      // FinRise'25 and FinVibe Fiesta Season 02 must have PREVIOUS EVENT status
      expect(html).toContain("PREVIOUS EVENT");

      // FinRise'25 and FinVibe Fiesta Season 02 must render inside Past Events section
      const pastIndex = html.indexOf("Past Events");
      const finriseIndex = html.indexOf("FinRise’25");
      const finvibeIndex = html.indexOf("FinVibe Fiesta Season 02");
      const magnoraIndex = html.indexOf("Magnora’26");
      const upcomingIndex = html.indexOf("Upcoming Events");

      expect(upcomingIndex).toBeGreaterThan(-1);
      expect(pastIndex).toBeGreaterThan(upcomingIndex);
      expect(magnoraIndex).toBeGreaterThan(upcomingIndex);
      expect(magnoraIndex).toBeLessThan(pastIndex);
      expect(finriseIndex).toBeGreaterThan(pastIndex);
      expect(finvibeIndex).toBeGreaterThan(pastIndex);
    });
  });
});
