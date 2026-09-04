import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CCF_DEPARTMENTS,
  DEPARTMENTS_HERO,
  DEPARTMENTS_OVERVIEW,
} from "@/lib/data/departments";
import {
  DepartmentsHero,
  DepartmentsOverview,
  DepartmentsGrid,
  DepartmentsCta,
} from "@/components/departments";
import DepartmentsPage from "@/app/(public)/departments/page";

describe("Departments Page Data & Components (Phase 5 Task 3)", () => {
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

  const UNVERIFIED_CLAIMS = [
    "empowers",
    "transforms",
    "builds careers",
    "creates leaders",
    "industry exposure",
    "real-world opportunities",
    "connects students with professionals",
  ];

  const VERIFIED_DEPARTMENT_NAMES = [
    "Finance Management",
    "IT & Media",
    "Marketing & PR",
    "Project Department",
    "Event Management",
  ];

  const FAKE_DEPARTMENTS = [
    "Research & Analysis",
    "Trading & Quantitative",
    "Human Resources",
    "Corporate Relations",
    "Public Relations Division",
    "Alumni Relations",
    "Audit Committee",
  ];

  describe("Department Data Integrity & Canonical Definitions", () => {
    it("contains exactly the five verified CCF departments", () => {
      expect(CCF_DEPARTMENTS).toHaveLength(5);
      const names = CCF_DEPARTMENTS.map((d) => d.name);
      expect(names).toEqual(VERIFIED_DEPARTMENT_NAMES);
    });

    it("assigns unique ids and slugs to each department", () => {
      const ids = CCF_DEPARTMENTS.map((d) => d.id);
      const slugs = CCF_DEPARTMENTS.map((d) => d.slug);
      expect(new Set(ids).size).toBe(5);
      expect(new Set(slugs).size).toBe(5);
    });

    it("does not include any unverified or fabricated departments", () => {
      const names = CCF_DEPARTMENTS.map((d) => d.name);
      for (const fake of FAKE_DEPARTMENTS) {
        expect(names).not.toContain(fake);
      }
    });

    it("provides factual focus areas for each department", () => {
      for (const dept of CCF_DEPARTMENTS) {
        expect(dept.focusAreas.length).toBeGreaterThanOrEqual(2);
        for (const area of dept.focusAreas) {
          expect(area.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("adheres to strict factual copy in data without forbidden marketing superlatives or buzzwords", () => {
      const allText = JSON.stringify({
        CCF_DEPARTMENTS,
        DEPARTMENTS_HERO,
        DEPARTMENTS_OVERVIEW,
      }).toLowerCase();

      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(allText).not.toContain(word);
      }

      for (const claim of UNVERIFIED_CLAIMS) {
        expect(allText).not.toContain(claim);
      }
    });
  });

  describe("Section Component Rendering & Structure", () => {
    it("renders DepartmentsHero with CCF_EYEBROW and display title", () => {
      const html = renderToStaticMarkup(<DepartmentsHero />);
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).toContain("<h1");
      expect(html).toContain("Departments");
      expect(html).toContain('href="#directory"');
      expect(html).toContain('href="/join-us"');
    });

    it("renders DepartmentsOverview with structure heading and pillars", () => {
      const html = renderToStaticMarkup(<DepartmentsOverview />);
      expect(html).toContain("Organizational Structure");
      expect(html).toContain("Functional Roles");
      expect(html).toContain("Campus Community");
      expect(html).toContain("Practical Learning");
      expect(html).toContain("lucide-book-open");
    });

    it("renders DepartmentsGrid containing all five verified departments and '5 Departments' badge", () => {
      const html = renderToStaticMarkup(<DepartmentsGrid />);
      expect(html).toContain("5 Departments");
      expect(html).not.toContain("5 Active Divisions");

      for (const name of VERIFIED_DEPARTMENT_NAMES) {
        const htmlName = name.replace(/&/g, "&amp;");
        expect(html).toContain(htmlName);
      }

      for (const fake of FAKE_DEPARTMENTS) {
        expect(html).not.toContain(fake);
      }

      // Renders recruitment CTA links
      expect(html).toContain('href="/join-us"');
    });

    it("renders DepartmentsCta with links to /join-us and /events", () => {
      const html = renderToStaticMarkup(<DepartmentsCta />);
      expect(html).toContain("Join a CCF Department");
      expect(html).toContain('href="/join-us"');
      expect(html).toContain('href="/events"');
    });
  });

  describe("Full Page Assembly & Accessibility", () => {
    it("renders complete DepartmentsPage without placeholders, construction text, or invented workflows", () => {
      const html = renderToStaticMarkup(<DepartmentsPage />);

      // Prohibit construction placeholders
      expect(html).not.toContain("Content under construction");
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("Lorem ipsum");

      // Verify regression guard: removed cross-department workflow must not exist
      expect(html).not.toContain("Coordinated Execution");
      expect(html).not.toContain("Phase 01");
      expect(html).not.toContain("Phase 02");
      expect(html).not.toContain("Phase 03");

      // Verify all five departments are in the page output
      for (const name of VERIFIED_DEPARTMENT_NAMES) {
        const htmlName = name.replace(/&/g, "&amp;");
        expect(html).toContain(htmlName);
      }

      // Verify branding rules
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");

      // Verify semantic heading hierarchy
      const h1Count = (html.match(/<h1/g) || []).length;
      expect(h1Count).toBe(1);

      const h2Count = (html.match(/<h2/g) || []).length;
      expect(h2Count).toBeGreaterThanOrEqual(3);

      const h3Count = (html.match(/<h3/g) || []).length;
      expect(h3Count).toBeGreaterThanOrEqual(5);

      // Verify absence of forbidden superlatives across page text content
      const textOnly = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(textOnly).not.toContain(word);
      }

      for (const claim of UNVERIFIED_CLAIMS) {
        expect(textOnly).not.toContain(claim);
      }
    });
  });
});
