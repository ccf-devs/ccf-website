import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ABOUT_HERO,
  ABOUT_OVERVIEW,
  ABOUT_VISION_MISSION,
  ABOUT_PILLARS,
  ABOUT_ACTIVITIES,
  ABOUT_FOUNDATION,
  ABOUT_LEADERSHIP,
} from "@/lib/data/about";
import {
  AboutHero,
  AboutIntro,
  VisionMissionSection,
  PurposePillars,
  WhatCCFDoes,
  FoundationSection,
  AboutLeadership,
  AboutCta,
} from "@/components/about";
import { CcfLogo } from "@/components/site/logo";
import { Header } from "@/components/site/header";
import AboutPage from "@/app/(public)/about/page";

describe("About Page Data & Components (Phase 5 Task 2)", () => {
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
  ];

  const FORBIDDEN_BUZZWORDS = [
    "empowers",
    "transforms",
    "connects students with industry",
    "builds careers",
    "creates leaders",
    "industry exposure",
    "real-world opportunities",
  ];

  describe("Data Integrity & Fact Verification (lib/data/about.ts)", () => {
    it("contains the confirmed executive leadership board only with no invented bios", () => {
      expect(ABOUT_LEADERSHIP.length).toBe(3);
      expect(ABOUT_LEADERSHIP).toEqual([
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

    it("uses the verified vision and mission from Section 7 of the CCF handbook", () => {
      expect(ABOUT_VISION_MISSION.vision).toBe(
        "To create a financially literate community in which students from all backgrounds gain confidence to make informed financial decisions for life."
      );
      expect(ABOUT_VISION_MISSION.mission).toBe(
        "To equip students, including non-finance majors, with essential financial knowledge and money-management skills through interactive learning and practical experiences."
      );
      expect(ABOUT_VISION_MISSION.objectives.length).toBe(3);
    });

    it("defines the 4 core purpose pillars with conservative descriptions", () => {
      expect(ABOUT_PILLARS.length).toBe(4);
      const titles = ABOUT_PILLARS.map((p) => p.title);
      expect(titles).toContain("Financial Literacy");
      expect(titles).toContain("Market Awareness");
      expect(titles).toContain("Practical Learning");
      expect(titles).toContain("Student Initiatives");
    });

    it("defines the 4 verified activity types", () => {
      expect(ABOUT_ACTIVITIES.length).toBe(4);
      const titles = ABOUT_ACTIVITIES.map((a) => a.title);
      expect(titles).toContain("Finance & Business Symposiums");
      expect(titles).toContain("Finance & Investment Events");
      expect(titles).toContain("Student Activities & Competitions");
      expect(titles).toContain("Workshops & Learning Sessions");
    });

    it("ensures all data fields are completely free of forbidden marketing superlatives and buzzwords", () => {
      const allText = JSON.stringify({
        ABOUT_HERO,
        ABOUT_OVERVIEW,
        ABOUT_VISION_MISSION,
        ABOUT_PILLARS,
        ABOUT_ACTIVITIES,
        ABOUT_FOUNDATION,
        ABOUT_LEADERSHIP,
      }).toLowerCase();

      for (const forbidden of [...FORBIDDEN_SUPERLATIVES, ...FORBIDDEN_BUZZWORDS]) {
        expect(allText).not.toContain(forbidden);
      }
    });

    it("does not fabricate historical claims such as founding years, member counts, or awards", () => {
      const allText = JSON.stringify(ABOUT_FOUNDATION).toLowerCase();
      expect(allText).not.toContain("award-winning");
      expect(allText).not.toContain("500+ members");
      expect(allText).not.toContain("founded in");
      expect(allText).not.toContain("established in 20");
    });
  });

  describe("CCF Logo Presentation & Circular Treatment", () => {
    it("renders CcfLogo using transparent vector SVG without square background", () => {
      const html = renderToStaticMarkup(<CcfLogo size="lg" priority />);
      expect(html).toContain("ccf_logo_edited.svg");
      expect(html).toContain("rounded-full");
      expect(html).toContain("overflow-hidden");
      expect(html).toContain("border-ccf-gold/30");
      expect(html).toContain("bg-ccf-surface");
      expect(html).toContain('alt="Crescent Club of Finance Emblem"');
    });

    it("supports all required size variants with correct proportions", () => {
      const htmlSm = renderToStaticMarkup(<CcfLogo size="sm" />);
      expect(htmlSm).toContain("h-9");
      expect(htmlSm).toContain("w-9");

      const htmlMd = renderToStaticMarkup(<CcfLogo size="md" />);
      expect(htmlMd).toContain("h-10");
      expect(htmlMd).toContain("w-10");

      const htmlLg = renderToStaticMarkup(<CcfLogo size="lg" />);
      expect(htmlLg).toContain("h-20");
      expect(htmlLg).toContain("w-20");
    });

    it("renders circular logo treatment consistently in AboutHero and Header", () => {
      const heroHtml = renderToStaticMarkup(<AboutHero />);
      expect(heroHtml).toContain("ccf_logo_edited.svg");
      expect(heroHtml).toContain("overflow-hidden");
      expect(heroHtml).toContain("rounded-full");

      const headerHtml = renderToStaticMarkup(<Header />);
      expect(headerHtml).toContain("ccf_logo_edited.svg");
      expect(headerHtml).toContain("overflow-hidden");
      expect(headerHtml).toContain("rounded-full");
    });
  });

  describe("Component Rendering & Structure", () => {
    it("renders AboutHero with verified identity and without unverified superlatives", () => {
      const html = renderToStaticMarkup(<AboutHero />);
      expect(html).toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).toContain("Student-Led Finance at Crescent College");
      expect(html).toContain("B.S. Abdur Rahman Crescent Institute of Science and Technology");
      expect(html).not.toContain("Department of Student Affairs");
      expect(html).toContain('href="/events"');
      expect(html).toContain('href="/join-us"');
    });

    it("renders AboutIntro with verified institutional framing", () => {
      const html = renderToStaticMarkup(<AboutIntro />);
      expect(html).toContain("Crescent Club of Finance");
      expect(html).toContain("B.S. Abdur Rahman Crescent Institute of Science and Technology");
      expect(html).toContain("Vandalur");
    });

    it("renders VisionMissionSection with exact stated quotes and 3 objectives", () => {
      const html = renderToStaticMarkup(<VisionMissionSection />);
      expect(html).toContain(ABOUT_VISION_MISSION.vision);
      expect(html).toContain(ABOUT_VISION_MISSION.mission);
      expect(html).toContain("Holistic Skill Development");
      expect(html).toContain("Interdisciplinary Collaboration");
      expect(html).toContain("Lifelong Financial Learning Hub");
      expect(html).not.toContain("Empowering Every Student");
    });

    it("renders PurposePillars with 4 pillars", () => {
      const html = renderToStaticMarkup(<PurposePillars />);
      expect(html).toContain("Financial Literacy");
      expect(html).toContain("Market Awareness");
      expect(html).toContain("Practical Learning");
      expect(html).toContain("Student Initiatives");
    });

    it("renders WhatCCFDoes with 4 activity cards and link to /events", () => {
      const html = renderToStaticMarkup(<WhatCCFDoes />);
      expect(html).toContain("Finance &amp; Business Symposiums");
      expect(html).toContain("Finance &amp; Investment Events");
      expect(html).toContain("Student Activities &amp; Competitions");
      expect(html).toContain("Workshops &amp; Learning Sessions");
      expect(html).toContain('href="/events"');
    });

    it("renders FoundationSection with present-focused narrative", () => {
      const html = renderToStaticMarkup(<FoundationSection />);
      expect(html).toContain("Our Foundation &amp; Focus");
      expect(html).toContain("Campus Integration");
      expect(html).toContain("B.S. Abdur Rahman Crescent Institute");
    });

    it("renders AboutLeadership with verified leaders and no invented biographies", () => {
      const html = renderToStaticMarkup(<AboutLeadership />);
      expect(html).toContain("Remi Kayalvizhi");
      expect(html).toContain("President");
      expect(html).toContain("Fizza Fathima");
      expect(html).toContain("Vice President");
      expect(html).toContain("Zayan Ahmed");
      expect(html).toContain("Managing Director");
      expect(html).toContain('href="/members"');
      // Must not contain fabricated bio text
      expect(html).not.toContain("biography");
      expect(html).not.toContain("experienced trader");
    });

    it("renders AboutCta with active links to /events and /join-us", () => {
      const html = renderToStaticMarkup(<AboutCta />);
      expect(html).toContain("Participate in CCF Initiatives");
      expect(html).toContain('href="/events"');
      expect(html).toContain('href="/join-us"');
    });

    it("renders the entire AboutPage without placeholder content", () => {
      const html = renderToStaticMarkup(<AboutPage />);
      expect(html).not.toContain("Content under construction");
      expect(html).not.toContain("Lorem ipsum");
      expect(html).toContain("Student-Led Finance at Crescent College");
      expect(html).toContain("Remi Kayalvizhi");
      expect(html).toContain("Participate in CCF Initiatives");

      // Verify no forbidden superlatives in rendered page text
      const textOnly = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const forbidden of FORBIDDEN_SUPERLATIVES) {
        expect(textOnly).not.toContain(forbidden);
      }
    });
  });
});
