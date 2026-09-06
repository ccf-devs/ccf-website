import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HOMEPAGE_FEATURED_EVENTS,
  HOMEPAGE_DEPARTMENTS,
  HOMEPAGE_LEADERSHIP,
  HOMEPAGE_VALUE_PROPS,
} from "@/lib/data/homepage";
import {
  Hero,
  ClubIntro,
  FeaturedEvents,
  ValuePropositionSection,
  DepartmentsPreview,
  LeadershipPreview,
  JoinCta,
} from "@/components/home";
import { CCF_EYEBROW } from "@/components/site/navigation-data";

describe("Homepage Data & Components (Phase 5 Task 1)", () => {
  describe("Static & Mock Data Integrity", () => {
    it("contains verified CCF events without invented values or stale registration claims", () => {
      expect(HOMEPAGE_FEATURED_EVENTS.length).toBe(3);
      const names = HOMEPAGE_FEATURED_EVENTS.map((e) => e.name);
      expect(names).toContain("Magnora’26");
      expect(names).toContain("FinRise’25");
      expect(names).toContain("FinVibe Fiesta Season 02");

      for (const event of HOMEPAGE_FEATURED_EVENTS) {
        expect(event.name).toBeTruthy();
        expect(event.slug).toBeTruthy();
        expect(event.dateText).toBeTruthy();
        expect(event.shortDescription).toBeTruthy();
        // Superlative and unverified claims must be absent
        const desc = event.shortDescription.toLowerCase();
        expect(desc).not.toContain("flagship");
        expect(desc).not.toContain("premier");
        expect(desc).not.toContain("annual");
        expect(desc).not.toContain("international-edition");
      }
    });

    it("does not mark historical 2025 events as registration open or upcoming", () => {
      const finrise = HOMEPAGE_FEATURED_EVENTS.find((e) => e.name === "FinRise’25");
      expect(finrise).toBeDefined();
      expect(finrise?.dateText).not.toContain("Upcoming");
      expect(finrise?.status).not.toBe("REGISTRATION OPEN");
      expect(finrise?.status).toBe("PREVIOUS EVENT");

      const finvibe = HOMEPAGE_FEATURED_EVENTS.find((e) => e.name === "FinVibe Fiesta Season 02");
      expect(finvibe).toBeDefined();
      expect(finvibe?.status).not.toBe("REGISTRATION OPEN");
      expect(finvibe?.status).toBe("PREVIOUS EVENT");
    });

    it("contains exactly the 5 verified CCF departments with simplified descriptions", () => {
      expect(HOMEPAGE_DEPARTMENTS.length).toBe(5);
      const names = HOMEPAGE_DEPARTMENTS.map((d) => d.name);
      expect(names).toEqual([
        "Finance Management",
        "IT & Media",
        "Marketing & PR",
        "Project Department",
        "Event Management",
      ]);

      for (const dept of HOMEPAGE_DEPARTMENTS) {
        expect(dept.slug).toBeTruthy();
        expect(dept.shortDescription).toBeTruthy();
        expect(dept.iconName).toBeTruthy();
        // Unverified operational claims must not appear
        const desc = dept.shortDescription.toLowerCase();
        expect(desc).not.toContain("treasury operations");
        expect(desc).not.toContain("investment modeling");
        expect(desc).not.toContain("institutional relations");
        expect(desc).not.toContain("research publications");
        expect(desc).not.toContain("competitive trading simulations");
      }
    });

    it("contains the confirmed executive leadership board", () => {
      expect(HOMEPAGE_LEADERSHIP.length).toBe(3);
      expect(HOMEPAGE_LEADERSHIP).toEqual([
        {
          id: "lead-president",
          name: "Remi Kayalvizhi",
          role: "President",
          initials: "RK",
        },
        {
          id: "lead-vp",
          name: "Fizza Fathima",
          role: "Vice President",
          initials: "FF",
        },
        {
          id: "lead-md",
          name: "Zayan Ahmed",
          role: "Managing Director",
          initials: "ZA",
        },
      ]);
    });

    it("defines the 4 core value proposition themes with defensible wording", () => {
      expect(HOMEPAGE_VALUE_PROPS.length).toBe(4);
      const titles = HOMEPAGE_VALUE_PROPS.map((vp) => vp.title);
      expect(titles).toContain("Financial Literacy & Learning");
      expect(titles).toContain("Practical Market Exposure");
      expect(titles).toContain("Events & Competitions");
      expect(titles).toContain("Collaborative Finance Community");

      for (const vp of HOMEPAGE_VALUE_PROPS) {
        const desc = vp.description.toLowerCase();
        expect(desc).not.toContain("simulated trading environments");
        expect(desc).not.toContain("portfolio exercises");
        expect(desc).not.toContain("keynote seminars with industry guests");
        expect(desc).not.toContain("competitive hackathons");
      }
    });
  });

  describe("Section Component Rendering & Regressions", () => {
    it("renders Hero with verified label and without unverified Department of Student Affairs", () => {
      const html = renderToStaticMarkup(<Hero />);
      expect(html).toContain(CCF_EYEBROW);
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).not.toContain("Department of Student Affairs");
      expect(html).not.toContain("CCF / 2026 // CRESCENT FINANCE SOCIETY");
      expect(html).toContain("Investing in Knowledge");
      expect(html).toContain("Compounding Success");
      expect(html).toContain("The student-led finance society of B.S. Abdur Rahman Crescent Institute of Science and Technology. Dedicated to financial literacy, market awareness, and practical learning.");
      expect(html).not.toContain("The premier student-led finance society");
      expect(html).toContain('href="/events"');
      expect(html).toContain('href="/join-us"');
    });

    it("renders ClubIntro with Crescent College affiliation", () => {
      const html = renderToStaticMarkup(<ClubIntro />);
      expect(html).toContain("Crescent Club of Finance");
      expect(html).toContain("B.S. Abdur Rahman Crescent Institute of Science and Technology");
    });

    it("renders FeaturedEvents with conservative description and without stale registration claims", () => {
      const html = renderToStaticMarkup(<FeaturedEvents />);
      expect(html).toContain("Explore finance events and activities organized by CCF.");
      expect(html).not.toContain("Flagship symposiums");
      expect(html).toContain("Magnora’26");
      expect(html).toContain("FinRise’25");
      expect(html).toContain("FinVibe Fiesta Season 02");
      expect(html).toContain("PREVIOUS EVENT");
      expect(html).not.toContain("Upcoming • 2025");
      expect(html).not.toContain("REGISTRATION OPEN");
      expect(html).toContain('href="/events/magnora-26"');
      expect(html).toContain('href="/events/finrise-25"');
      expect(html).toContain('href="/events/finvibe-fiesta-s2"');
    });

    it("renders ValuePropositionSection with all 4 themes", () => {
      const html = renderToStaticMarkup(<ValuePropositionSection />);
      expect(html).toContain("Financial Literacy &amp; Learning");
      expect(html).toContain("Practical Market Exposure");
      expect(html).toContain("Events &amp; Competitions");
      expect(html).toContain("Collaborative Finance Community");
    });

    it("renders DepartmentsPreview with all 5 operational divisions", () => {
      const html = renderToStaticMarkup(<DepartmentsPreview />);
      expect(html).toContain("Finance Management");
      expect(html).toContain("IT &amp; Media");
      expect(html).toContain("Marketing &amp; PR");
      expect(html).toContain("Project Department");
      expect(html).toContain("Event Management");
      expect(html).toContain('href="/departments"');
    });

    it("renders LeadershipPreview with confirmed board and neutral description", () => {
      const html = renderToStaticMarkup(<LeadershipPreview />);
      expect(html).toContain("Remi Kayalvizhi");
      expect(html).toContain("President");
      expect(html).toContain("RK");
      expect(html).toContain("Fizza Fathima");
      expect(html).toContain("Vice President");
      expect(html).toContain("FF");
      expect(html).toContain("Zayan Ahmed");
      expect(html).toContain("Managing Director");
      expect(html).toContain("ZA");
      expect(html).toContain("Meet the student leadership team of Crescent Club of Finance.");
      expect(html).toContain('href="/members"');
    });

    it("renders JoinCta with link to /join-us", () => {
      const html = renderToStaticMarkup(<JoinCta />);
      expect(html).toContain('href="/join-us"');
      expect(html).toContain("Ready to Compound Your Potential in Finance?");
    });
  });
});
