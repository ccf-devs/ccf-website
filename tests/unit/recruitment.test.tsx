import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RECRUITMENT_STATUS,
  RECRUITMENT_HERO,
  RECRUITMENT_ELIGIBILITY,
  RECRUITMENT_DEPARTMENTS,
  RECRUITMENT_REQUIREMENTS,
  RECRUITMENT_PROCESS,
  RECRUITMENT_CTA,
} from "@/lib/data/recruitment";
import { CCF_DEPARTMENTS } from "@/lib/data/departments";
import {
  RecruitmentStatusBadge,
  RecruitmentHero,
  RecruitmentEligibility,
  RecruitmentDepartments,
  RecruitmentRequirements,
  RecruitmentProcess,
  RecruitmentCta,
} from "@/components/recruitment";
import JoinUsPage, { metadata } from "@/app/(public)/join-us/page";

describe("Recruitment & Join Us Page Comprehensive Verification (Phase 5 Task 7)", () => {
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
    "elite",
    "best minds",
  ];

  const UNVERIFIED_CLAIMS = [
    "empowers",
    "transforms",
    "builds careers",
    "creates leaders",
    "guaranteed selection",
    "guaranteed admission",
    "guaranteed membership",
    "stipend",
    "certificate",
    "recruitment fee",
    "selection percentage",
    "acceptance rate",
    "limited seats",
    "only a few spots left",
    "apply before it's too late",
    "don't miss your chance",
  ];

  const VERIFIED_DEPARTMENT_NAMES = [
    "Finance Management",
    "IT & Media",
    "Marketing & PR",
    "Project Department",
    "Event Management",
  ];

  describe("1. Canonical Data Integrity & Recruitment Requirements", () => {
    it("configures recruitment status as OPEN", () => {
      expect(RECRUITMENT_STATUS).toBe("OPEN");
    });

    it("uses the canonical CCF eyebrow text", () => {
      expect(RECRUITMENT_HERO.eyebrow).toBe("CRESCENT CLUB OF FINANCE");
      expect(RECRUITMENT_HERO.eyebrow).not.toBe(
        "CRESCENT COLLEGE • FINANCE CLUB"
      );
    });

    it("strictly defines Crescent students eligibility with verified department wording", () => {
      const allEligibilityText = JSON.stringify(RECRUITMENT_ELIGIBILITY);
      expect(allEligibilityText).toContain(
        "B.S. Abdur Rahman Crescent Institute of Science and Technology"
      );
      expect(allEligibilityText).toContain(
        "Open to students from any academic department."
      );
      // Strictly no "schools across the university"
      expect(allEligibilityText).not.toContain(
        "Open to all departments and schools across the university."
      );
      expect(allEligibilityText).toContain("year of study");
      expect(allEligibilityText).toContain("undergraduate (UG)");
      expect(allEligibilityText).toContain("postgraduate (PG)");
      expect(RECRUITMENT_ELIGIBILITY.ruleNotice).toBe(
        "Applicants may apply for ONE department per application."
      );
    });

    it("reuses the canonical five CCF departments without duplication or alteration", () => {
      expect(RECRUITMENT_DEPARTMENTS.departments).toBe(CCF_DEPARTMENTS);
      expect(RECRUITMENT_DEPARTMENTS.departments).toHaveLength(5);
      const names = RECRUITMENT_DEPARTMENTS.departments.map((d) => d.name);
      expect(names).toEqual(VERIFIED_DEPARTMENT_NAMES);
    });

    it("strictly lists exactly the six required application fields", () => {
      expect(RECRUITMENT_REQUIREMENTS.fields).toHaveLength(6);
      const labels = RECRUITMENT_REQUIREMENTS.fields.map((f) => f.label);
      expect(labels).toContain("Full Name");
      expect(labels).toContain("RRN");
      expect(labels).toContain("Desired CCF Department");
      expect(labels).toContain("Current Academic Department");
      expect(labels).toContain("Year of Study");
      expect(labels).toContain("WhatsApp-Enabled Phone Number");

      // Required notice
      expect(RECRUITMENT_REQUIREMENTS.notice).toBe(
        "The application will collect the details listed above."
      );
    });

    it("adheres to strict content fidelity for RRN, phone, administrative review, and department descriptions", () => {
      // 1 & 2: RRN description does not contain invented expansion and equals "Your Crescent RRN."
      const rrnField = RECRUITMENT_REQUIREMENTS.fields.find((f) => f.id === "req-rrn");
      expect(rrnField).toBeDefined();
      expect(rrnField?.description).toBe("Your Crescent RRN.");
      expect(rrnField?.description).not.toContain("Resident Registration Number");

      // 3: Phone description equals "A WhatsApp-enabled phone number."
      const phoneField = RECRUITMENT_REQUIREMENTS.fields.find(
        (f) => f.id === "req-whatsapp"
      );
      expect(phoneField).toBeDefined();
      expect(phoneField?.description).toBe("A WhatsApp-enabled phone number.");
      expect(phoneField?.description).not.toContain(
        "official recruitment communications"
      );

      // 4 & 5: Administrative review description does NOT contain "CCF leadership" and equals "Submitted applications undergo administrative review."
      const reviewStep = RECRUITMENT_PROCESS.steps.find((s) => s.step === "04");
      expect(reviewStep).toBeDefined();
      expect(reviewStep?.description).toBe(
        "Submitted applications undergo administrative review."
      );
      expect(reviewStep?.description).not.toContain("CCF leadership");
      expect(reviewStep?.description).not.toContain("leadership");

      // 6 & 7: Department section description does not contain "operational departments supporting CCF initiatives" and contains "Explore the five departments of Crescent Club of Finance."
      expect(RECRUITMENT_DEPARTMENTS.description).not.toContain(
        "operational departments supporting CCF initiatives"
      );
      expect(RECRUITMENT_DEPARTMENTS.description).toContain(
        "Explore the five departments of Crescent Club of Finance."
      );
    });

    it("does NOT contain unsupported 'No resumes' claim or pretend operational portal statements", () => {
      const allText = JSON.stringify({
        RECRUITMENT_HERO,
        RECRUITMENT_ELIGIBILITY,
        RECRUITMENT_DEPARTMENTS,
        RECRUITMENT_REQUIREMENTS,
        RECRUITMENT_PROCESS,
        RECRUITMENT_CTA,
      });

      // Strictly prohibited claim
      expect(allText).not.toContain(
        "No resumes, questionnaires, or portfolio uploads are required."
      );
      // Prohibited pretend portal statements
      expect(allText).not.toContain("The portal will activate here");
      expect(allText).not.toContain("Applications are now being accepted");
      expect(allText).not.toContain("Submit your application now");
      expect(allText).not.toContain("Start your application");

      // Honest workflow connection statement
      expect(RECRUITMENT_CTA.description).toContain(
        "Application submission will be connected to the CCF recruitment workflow in the next implementation stage."
      );
    });

    it("strictly omits fake deadlines, hardcoded phone numbers, sample RRNs, or contact persons", () => {
      const allText = JSON.stringify({
        RECRUITMENT_HERO,
        RECRUITMENT_ELIGIBILITY,
        RECRUITMENT_DEPARTMENTS,
        RECRUITMENT_REQUIREMENTS,
        RECRUITMENT_PROCESS,
        RECRUITMENT_CTA,
      }).toLowerCase();

      // No fake deadlines
      expect(allText).not.toContain("deadline");
      expect(allText).not.toContain("last date");
      expect(allText).not.toContain("due date");
      expect(allText).not.toContain("selection date");
      expect(allText).not.toContain("interview date");

      // No fake contact person or faculty advisor
      expect(allText).not.toContain("faculty advisor");
      expect(allText).not.toContain("staff advisor");
      expect(allText).not.toContain("convenor");
      expect(allText).not.toContain("coordinator");

      // No hardcoded phone numbers or tel links
      expect(allText).not.toContain("tel:");
      expect(allText).not.toMatch(/\+91[0-9]+/);

      // No fake RRN examples (e.g. 2100... or RRN: 12345)
      expect(allText).not.toMatch(/rrn[:\s]+[0-9]{5,}/);
    });

    it("strictly omits forbidden marketing superlatives and unverified claims", () => {
      const allText = JSON.stringify({
        RECRUITMENT_HERO,
        RECRUITMENT_ELIGIBILITY,
        RECRUITMENT_DEPARTMENTS,
        RECRUITMENT_REQUIREMENTS,
        RECRUITMENT_PROCESS,
        RECRUITMENT_CTA,
      }).toLowerCase();

      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(allText).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(allText).not.toContain(claim);
      }
    });
  });

  describe("2. Component Unit Rendering", () => {
    it("renders RecruitmentStatusBadge with OPEN state", () => {
      const html = renderToStaticMarkup(<RecruitmentStatusBadge status="OPEN" />);
      expect(html).toContain("RECRUITMENT OPEN");
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Recruitment status: Open"');
    });

    it("renders RecruitmentStatusBadge with CLOSED state", () => {
      const html = renderToStaticMarkup(<RecruitmentStatusBadge status="CLOSED" />);
      expect(html).toContain("RECRUITMENT CLOSED");
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Recruitment status: Closed"');
    });

    it("renders RecruitmentHero with canonical eyebrow, h1, status badge, and informative actions", () => {
      const html = renderToStaticMarkup(<RecruitmentHero />);
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).toContain("<h1");
      expect(html).toContain("Join Crescent Club of Finance");
      expect(html).toContain("RECRUITMENT OPEN");
      expect(html).toContain('href="#requirements"');
      expect(html).toContain('href="#departments"');
      expect(html).toContain("View Requirements");
      expect(html).toContain("Explore Departments");
    });

    it("renders RecruitmentHero in CLOSED state without open actions", () => {
      const html = renderToStaticMarkup(<RecruitmentHero status="CLOSED" />);
      expect(html).toContain("RECRUITMENT CLOSED");
      expect(html).not.toContain("View Requirements");
      expect(html).toContain("Explore CCF Departments");
    });

    it("renders RecruitmentEligibility with confirmed campus, academic department wording, and single-department rule", () => {
      const html = renderToStaticMarkup(<RecruitmentEligibility />);
      expect(html).toContain("Who Can Apply");
      expect(html).toContain("Crescent Students Only");
      expect(html).toContain(
        "B.S. Abdur Rahman Crescent Institute of Science and Technology"
      );
      expect(html).toContain("Open to students from any academic department.");
      expect(html).not.toContain("schools across the university");
      expect(html).toContain("Year of Study");
      expect(html).toContain("undergraduate (UG)");
      expect(html).toContain("postgraduate (PG)");
      expect(html).toContain(
        "Applicants may apply for ONE department per application."
      );
    });

    it("renders RecruitmentDepartments with exactly five canonical CCF departments", () => {
      const html = renderToStaticMarkup(<RecruitmentDepartments />);
      expect(html).toContain("CCF Departments");
      expect(html).toContain("Choose 1");
      expect(html).toContain(
        "Explore the five departments of Crescent Club of Finance."
      );
      expect(html).not.toContain(
        "operational departments supporting CCF initiatives"
      );
      for (const name of VERIFIED_DEPARTMENT_NAMES) {
        const htmlName = name.replace(/&/g, "&amp;");
        expect(html).toContain(htmlName);
      }
    });

    it("renders RecruitmentRequirements with exactly six application fields and factual notice without resume claim", () => {
      const html = renderToStaticMarkup(<RecruitmentRequirements />);
      expect(html).toContain("What You Will Need");
      expect(html).toContain("Full Name");
      expect(html).toContain("RRN");
      expect(html).toContain("Your Crescent RRN.");
      expect(html).not.toContain("Resident Registration Number");
      expect(html).toContain("Desired CCF Department");
      expect(html).toContain("Current Academic Department");
      expect(html).toContain("Year of Study");
      expect(html).toContain("WhatsApp-Enabled Phone Number");
      expect(html).toContain("A WhatsApp-enabled phone number.");
      expect(html).not.toContain("official recruitment communications");
      expect(html).toContain(
        "The application will collect the details listed above."
      );
      expect(html).not.toContain(
        "No resumes, questionnaires, or portfolio uploads are required."
      );
    });

    it("renders RecruitmentProcess with 4 generic high-level workflow steps", () => {
      const html = renderToStaticMarkup(<RecruitmentProcess />);
      expect(html).toContain("Application Flow");
      expect(html).toContain("01");
      expect(html).toContain("Check Eligibility");
      expect(html).toContain("02");
      expect(html).toContain("Choose a Department");
      expect(html).toContain("03");
      expect(html).toContain("Submit Your Application");
      expect(html).toContain("04");
      expect(html).toContain("Await Administrative Review");
      expect(html).toContain(
        "Submitted applications undergo administrative review."
      );
      expect(html).not.toContain("CCF leadership");
      expect(html).not.toContain("leadership");

      // No fake rounds
      expect(html).not.toContain("Interview Round");
      expect(html).not.toContain("Technical Round");
      expect(html).not.toContain("Aptitude Test");
    });

    it("renders RecruitmentCta in OPEN state with honest workflow connection copy and no fake form", () => {
      const html = renderToStaticMarkup(<RecruitmentCta status="OPEN" />);
      expect(html).toContain("Ready to Apply?");
      expect(html).toContain(
        "Application submission will be connected to the CCF recruitment workflow in the next implementation stage."
      );
      expect(html).toContain("Review Requirements");
      expect(html).toContain("Explore Departments");
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<input");
      expect(html).not.toContain("<textarea");
      expect(html).not.toContain("<select");
    });

    it("renders RecruitmentCta in CLOSED state with closed notice", () => {
      const html = renderToStaticMarkup(<RecruitmentCta status="CLOSED" />);
      expect(html).toContain("Recruitment Closed");
      expect(html).toContain(
        "Recruitment for the Crescent Club of Finance is currently closed."
      );
      expect(html).not.toContain("Review Requirements");
      expect(html).toContain("Explore Departments");
    });
  });

  describe("3. Full Page Assembly & Standards", () => {
    it("renders JoinUsPage without placeholders, fake forms, or unverified claims", () => {
      const html = renderToStaticMarkup(<JoinUsPage />);

      // No placeholder copy
      expect(html).not.toContain("Content under construction");
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("Lorem ipsum");

      // Canonical eyebrow
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");

      // Exactly 1 h1
      const h1Matches = html.match(/<h1/g) || [];
      expect(h1Matches.length).toBe(1);

      // Multiple semantic h2 headings
      const h2Matches = html.match(/<h2/g) || [];
      expect(h2Matches.length).toBeGreaterThanOrEqual(4);

      // Status indicator present
      expect(html).toContain("RECRUITMENT OPEN");

      // Verified department names present
      for (const name of VERIFIED_DEPARTMENT_NAMES) {
        const htmlName = name.replace(/&/g, "&amp;");
        expect(html).toContain(htmlName);
      }

      // Single department rule present
      expect(html).toContain(
        "Applicants may apply for ONE department per application."
      );

      // Verified eligibility phrasing
      expect(html).toContain("Open to students from any academic department.");
      expect(html).not.toContain("schools across the university");

      // Required application fields present with neutral descriptions
      expect(html).toContain("Full Name");
      expect(html).toContain("RRN");
      expect(html).toContain("Your Crescent RRN.");
      expect(html).not.toContain("Resident Registration Number");
      expect(html).toContain("Desired CCF Department");
      expect(html).toContain("Current Academic Department");
      expect(html).toContain("Year of Study");
      expect(html).toContain("WhatsApp-Enabled Phone Number");
      expect(html).toContain("A WhatsApp-enabled phone number.");
      expect(html).not.toContain("official recruitment communications");

      // Administrative review neutral description
      expect(html).toContain(
        "Submitted applications undergo administrative review."
      );
      expect(html).not.toContain("CCF leadership");

      // Department section neutral description
      expect(html).toContain(
        "Explore the five departments of Crescent Club of Finance."
      );
      expect(html).not.toContain(
        "operational departments supporting CCF initiatives"
      );

      // Honest workflow statement present
      expect(html).toContain(
        "Application submission will be connected to the CCF recruitment workflow in the next implementation stage."
      );

      // Boundary: Strictly NO form elements
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<input");
      expect(html).not.toContain("<textarea");
      expect(html).not.toContain("<select");

      // Anti-fabrication content check
      const textOnly = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(textOnly).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(textOnly).not.toContain(claim);
      }
    });

    it("verifies factual metadata without unverified URLs or claims", () => {
      expect(metadata.title).toBe(
        "Join Us — Crescent Club of Finance | Crescent College"
      );
      expect(metadata.description).toBeTruthy();
      expect((metadata.openGraph as Record<string, unknown>)?.siteName).toBe(
        "Crescent Club of Finance"
      );
      expect((metadata.openGraph as Record<string, unknown>)?.url).toBeUndefined();
    });
  });
});
