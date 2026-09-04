import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CCF_MEMBERS,
  CCF_ADMIN_BOARD_LEADERS,
  CCF_LEADERSHIP,
  MEMBERS_HERO,
  MEMBERS_DIRECTORY_INFO,
  MEMBERS_CTA,
  type CcfMember,
} from "@/lib/data/members";
import {
  MembersHero,
  MembersLeadership,
  MembersDirectory,
  MembersCta,
} from "@/components/members";
import MembersPage from "@/app/(public)/members/page";

describe("Members Page Comprehensive Verification (Phase 5 Task 4)", () => {
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
    "future leaders",
    "elite",
    "best minds",
  ];

  const APPROVED_DEPARTMENTS = [
    "Admin Board",
    "Project Management",
    "IT/Media/Photography",
    "Event Management",
    "Finance",
    "Marketing & Public Relation",
    "Project Drafting",
    "Media",
    "IT",
    "Photography",
    "Marketing",
    "Event Management (Finance)",
    "Event Management (Non-Finance)",
    "Public Relations",
    "Finance Team",
    "Marketing Team",
    "IT Team",
    "Media Team",
    "Drafting Team",
    "Advisory Board",
  ];

  describe("1. Canonical Member Dataset & Data Fidelity", () => {
    it("contains exactly 50 approved member records", () => {
      expect(CCF_MEMBERS).toHaveLength(50);
      expect(CCF_MEMBERS.length).toBe(50);
    });

    it("ensures all 50 member IDs are unique", () => {
      const ids = CCF_MEMBERS.map((m) => m.id);
      expect(new Set(ids).size).toBe(50);
    });

    it("ensures all member names, department labels, and designations are non-empty", () => {
      for (const member of CCF_MEMBERS) {
        expect(member.name.trim().length).toBeGreaterThan(0);
        expect(member.department.trim().length).toBeGreaterThan(0);
        expect(member.designation.trim().length).toBeGreaterThan(0);
        expect(member.displayOrder).toBeGreaterThanOrEqual(1);
        expect(member.displayOrder).toBeLessThanOrEqual(50);
      }
    });

    it("verifies Remi Kayalvizhi exists with designation President", () => {
      const remi = CCF_MEMBERS.find((m) => m.name === "Remi Kayalvizhi");
      expect(remi).toBeDefined();
      expect(remi?.designation).toBe("President");
      expect(remi?.department).toBe("Admin Board");
    });

    it("verifies Fizza Fathima exists with designation Vice-President", () => {
      const fizza = CCF_MEMBERS.find((m) => m.name === "Fizza Fathima");
      expect(fizza).toBeDefined();
      expect(fizza?.designation).toBe("Vice-President");
      expect(fizza?.department).toBe("Admin Board");
    });

    it("verifies Zayan Ahmed exists with designation Managing Director", () => {
      const zayan = CCF_MEMBERS.find((m) => m.name === "Zayan Ahmed");
      expect(zayan).toBeDefined();
      expect(zayan?.designation).toBe("Managing Director");
      expect(zayan?.department).toBe("Admin Board");
    });

    it("verifies Admin Board leadership contains exactly those three records", () => {
      expect(CCF_ADMIN_BOARD_LEADERS).toHaveLength(3);
      expect(CCF_ADMIN_BOARD_LEADERS.map((m) => m.name)).toEqual([
        "Remi Kayalvizhi",
        "Fizza Fathima",
        "Zayan Ahmed",
      ]);
      expect(CCF_ADMIN_BOARD_LEADERS.map((m) => m.designation)).toEqual([
        "President",
        "Vice-President",
        "Managing Director",
      ]);
    });

    it("preserves exact approved spelling Head of Subcommitee", () => {
      const subcommiteeMembers = CCF_MEMBERS.filter(
        (m) => m.designation === "Head of Subcommitee"
      );
      expect(subcommiteeMembers.length).toBe(5);
      const names = subcommiteeMembers.map((m) => m.name);
      expect(names).toContain("Jahid");
      expect(names).toContain("Dinesh");
      expect(names).toContain("Kaamesh");
      expect(names).toContain("Latheefa");
      expect(names).toContain("Abdullah");
    });

    it("represents all 20 approved department and team labels without unwanted merging", () => {
      const depts = Array.from(new Set(CCF_MEMBERS.map((m) => m.department)));
      expect(depts).toEqual(APPROVED_DEPARTMENTS);

      // Distinctness checks
      expect(depts).toContain("Finance");
      expect(depts).toContain("Finance Team");
      expect(depts).toContain("Marketing");
      expect(depts).toContain("Marketing Team");
      expect(depts).toContain("Marketing & Public Relation");
      expect(depts).toContain("Public Relations");
      expect(depts).toContain("IT");
      expect(depts).toContain("IT Team");
      expect(depts).toContain("Media");
      expect(depts).toContain("Media Team");
      expect(depts).toContain("Project Drafting");
      expect(depts).toContain("Drafting Team");
      expect(depts).toContain("Event Management (Finance)");
      expect(depts).toContain("Event Management (Non-Finance)");
    });

    it("strictly omits fabricated biographies, social URLs, and fabricated photos", () => {
      for (const member of CCF_MEMBERS) {
        // Must not have fabricated bio, socials, or photoUrl
        expect((member as unknown as Record<string, unknown>).bio).toBeUndefined();
        expect((member as unknown as Record<string, unknown>).socialUrl).toBeUndefined();
        expect((member as unknown as Record<string, unknown>).photoUrl).toBeUndefined();
        // photoObjectKey must be string or undefined (for future R2 object keys)
        if (member.photoObjectKey !== undefined) {
          expect(typeof member.photoObjectKey).toBe("string");
        }
      }
    });

    it("ensures no forbidden superlatives or buzzwords appear in data", () => {
      const dataString = JSON.stringify({
        CCF_MEMBERS,
        CCF_ADMIN_BOARD_LEADERS,
        CCF_LEADERSHIP,
        MEMBERS_HERO,
        MEMBERS_DIRECTORY_INFO,
        MEMBERS_CTA,
      }).toLowerCase();

      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(dataString).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(dataString).not.toContain(claim);
      }
    });
  });

  describe("2. Component Rendering & Semantic Structure", () => {
    it("renders MembersHero with canonical eyebrow, title, and action links", () => {
      const html = renderToStaticMarkup(<MembersHero />);
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).toContain("<h1");
      expect(html).toContain("Members");
      expect(html).toContain("Meet the members of Crescent Club of Finance.");
      expect(html).toContain('href="#directory"');
      expect(html).toContain("Explore Members");
      expect(html).toContain('href="/join-us"');
      expect(html).toContain("Join CCF");
    });

    it("renders MembersLeadership with Admin Board members and initials fallback", () => {
      const html = renderToStaticMarkup(<MembersLeadership />);
      expect(html).toContain("Admin Board");
      expect(html).toContain("Remi Kayalvizhi");
      expect(html).toContain("President");
      expect(html).toContain("RK");
      expect(html).toContain("Fizza Fathima");
      expect(html).toContain("Vice-President");
      expect(html).toContain("FF");
      expect(html).toContain("Zayan Ahmed");
      expect(html).toContain("Managing Director");
      expect(html).toContain("ZA");
      // Initial avatars must not be described as photographs
      expect(html).not.toContain('alt="photo"');
      expect(html).not.toContain('alt="photograph"');
    });

    it("renders MembersDirectory displaying 50 members and exact department labels", () => {
      const html = renderToStaticMarkup(<MembersDirectory />);
      expect(html).toContain("Member Directory");
      expect(html).toContain("50 Members");

      // Verify all 50 members are rendered
      for (const member of CCF_MEMBERS) {
        expect(html).toContain(member.name);
        expect(html).toContain(member.designation);
      }

      // Verify approved department headings exist
      const normalizedHtml = html.replace(/&amp;/g, "&");
      for (const dept of APPROVED_DEPARTMENTS) {
        expect(normalizedHtml).toContain(dept);
      }

      // Verify no placeholder / under-construction copy appears
      expect(html).not.toContain("Member Directory Status");
      expect(html).not.toContain("currently being compiled");
    });

    it("renders MembersCta with exact requested copy and links", () => {
      const html = renderToStaticMarkup(<MembersCta />);
      expect(html).toContain("Interested in joining CCF?");
      expect(html).toContain(
        "Explore membership opportunities or discover upcoming CCF events."
      );
      expect(html).toContain('href="/join-us"');
      expect(html).toContain("Join CCF");
      expect(html).toContain('href="/events"');
      expect(html).toContain("Explore Events");
    });
  });

  describe("3. Full Page Assembly & Accessibility", () => {
    it("renders complete MembersPage cleanly without forbidden words or placeholder copy", () => {
      const html = renderToStaticMarkup(<MembersPage />);

      // Prohibit construction placeholders
      expect(html).not.toContain("Content under construction");
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("Lorem ipsum");

      // Canonical eyebrow present, old label strictly forbidden
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");

      // Factual count present
      expect(html).toContain("50 Members");

      // Key CTAs present
      expect(html).toContain('href="/join-us"');
      expect(html).toContain('href="/events"');
      expect(html).toContain('href="#directory"');

      // Heading hierarchy: exactly 1 h1
      const h1Count = (html.match(/<h1/g) || []).length;
      expect(h1Count).toBe(1);

      // Proper h2 headings for sections
      const h2Count = (html.match(/<h2/g) || []).length;
      expect(h2Count).toBeGreaterThanOrEqual(3);

      // Group subheadings as h3
      const h3Count = (html.match(/<h3/g) || []).length;
      expect(h3Count).toBeGreaterThanOrEqual(21);

      // Verify absence of forbidden marketing superlatives or unverified claims in rendered HTML
      const textOnly = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(textOnly).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(textOnly).not.toContain(claim);
      }
    });

    it("verifies internal displayOrder numbering is not rendered publicly (#1, #2, etc.)", () => {
      const html = renderToStaticMarkup(<MembersPage />);
      expect(html).not.toMatch(/#[0-9]+/);
    });
  });

  describe("4. Photo Wiring, Fallbacks, and Domain Safety", () => {
    it("renders initials fallback when photoObjectKey is absent or unresolved", () => {
      const html = renderToStaticMarkup(
        <MembersLeadership />
      );
      // Remi Kayalvizhi initials avatar fallback
      expect(html).toContain("RK");
      expect(html).toContain('aria-label="Remi Kayalvizhi initials"');
      // Must not describe initials fallback as a photograph
      expect(html).not.toContain('alt="Remi Kayalvizhi"');
    });

    it("respects and renders img element when photoObjectKey is provided", async () => {
      const { MemberAvatar } = await import("@/components/members");
      const htmlWithPhoto = renderToStaticMarkup(
        <MemberAvatar
          name="Test Leader"
          initials="TL"
          photoObjectKey="https://example.com/test-photo.jpg"
        />
      );

      expect(htmlWithPhoto).toContain("<img");
      expect(htmlWithPhoto).toContain('src="https://example.com/test-photo.jpg"');
      expect(htmlWithPhoto).toContain('alt="Test Leader"');
    });

    it("does not invent unverified R2 public domains when no media URL is configured", async () => {
      const { getMemberPhotoUrl } = await import("@/lib/data/members");
      // Key without http or / and without env base URL must safely return null
      const resolved = getMemberPhotoUrl("photo-key-123.png");
      expect(resolved).toBeNull();

      // All static CCF_MEMBERS records currently have undefined photoObjectKey
      for (const member of CCF_MEMBERS) {
        expect(member.photoObjectKey).toBeUndefined();
      }
    });
  });

  describe("5. Organizational Hierarchy Ordering", () => {
    it("verifies hierarchy rank order: Director < Joint Director < Executive Member < Head of Subcommitee", async () => {
      const { getDesignationRank } = await import("@/lib/data/members");
      const directorRank = getDesignationRank("Director");
      const jdRank = getDesignationRank("Joint Director");
      const emRank = getDesignationRank("Executive Member");
      const subRank = getDesignationRank("Head of Subcommitee");

      expect(directorRank).toBeLessThan(jdRank);
      expect(jdRank).toBeLessThan(emRank);
      expect(emRank).toBeLessThan(subRank);
    });

    it("correctly sorts members by designation hierarchy and preserves displayOrder for same rank", async () => {
      const { sortMembersByHierarchy } = await import("@/lib/data/members");
      const testMembers: CcfMember[] = [
        {
          id: "m-em-2",
          name: "Exec Two",
          department: "Test Dept",
          designation: "Executive Member",
          displayOrder: 20,
          initials: "ET",
        },
        {
          id: "m-jd",
          name: "Joint Dir",
          department: "Test Dept",
          designation: "Joint Director",
          displayOrder: 50,
          initials: "JD",
        },
        {
          id: "m-em-1",
          name: "Exec One",
          department: "Test Dept",
          designation: "Executive Member",
          displayOrder: 10,
          initials: "EO",
        },
        {
          id: "m-dir",
          name: "Director One",
          department: "Test Dept",
          designation: "Director",
          displayOrder: 4,
          initials: "DO",
        },
        {
          id: "m-sub",
          name: "Subcommittee Head",
          department: "Test Dept",
          designation: "Head of Subcommitee",
          displayOrder: 45,
          initials: "SH",
        },
      ];

      const sorted = sortMembersByHierarchy(testMembers);
      expect(sorted.map((m) => m.designation)).toEqual([
        "Director",
        "Joint Director",
        "Executive Member",
        "Executive Member",
        "Head of Subcommitee",
      ]);
      expect(sorted.map((m) => m.name)).toEqual([
        "Director One",
        "Joint Dir",
        "Exec One",
        "Exec Two",
        "Subcommittee Head",
      ]);
    });

    it("verifies Event Management (Finance) renders Joint Director before all Executive Members", () => {
      const html = renderToStaticMarkup(<MembersDirectory />);
      const jdIndex = html.indexOf("Dimple Jain");
      const exec1Index = html.indexOf("Chandru");
      const exec2Index = html.indexOf("Haaziq");
      const exec3Index = html.indexOf("Ayesha Zafreen");
      const exec4Index = html.indexOf("Mikkel Thomas");

      expect(jdIndex).toBeGreaterThan(-1);
      expect(exec1Index).toBeGreaterThan(jdIndex);
      expect(exec2Index).toBeGreaterThan(exec1Index);
      expect(exec3Index).toBeGreaterThan(exec2Index);
      expect(exec4Index).toBeGreaterThan(exec3Index);
    });

    it("verifies Project Management renders in strict hierarchy: Director -> Joint Director -> Executive Members -> Head of Subcommitee", () => {
      const html = renderToStaticMarkup(<MembersDirectory />);
      const dirIndex = html.indexOf("Siddhartha Bharathi"); // Director (order 4)
      const jdIndex = html.indexOf("Theshani S S"); // Joint Director (order 50)
      const em1Index = html.indexOf("Nandhana Priya"); // Executive Member (order 39)
      const em2Index = html.indexOf("Irfan Mohamed"); // Executive Member (order 40)
      const subIndex = html.indexOf("Kaamesh"); // Head of Subcommitee (order 45)

      expect(dirIndex).toBeGreaterThan(-1);
      expect(jdIndex).toBeGreaterThan(dirIndex);
      expect(em1Index).toBeGreaterThan(jdIndex);
      expect(em2Index).toBeGreaterThan(em1Index);
      expect(subIndex).toBeGreaterThan(em2Index);
    });

    it("verifies Event Management (Non-Finance) maintains undisturbed displayOrder among same-rank members", () => {
      const html = renderToStaticMarkup(<MembersDirectory />);
      const m1Index = html.indexOf("Sakina Banu");
      const m2Index = html.indexOf("Syed Omar");
      const m3Index = html.indexOf("Nawfal");
      const m4Index = html.indexOf("Vijay");

      expect(m1Index).toBeGreaterThan(-1);
      expect(m2Index).toBeGreaterThan(m1Index);
      expect(m3Index).toBeGreaterThan(m2Index);
      expect(m4Index).toBeGreaterThan(m3Index);
    });

    it("ensures all 50 members remain present and no member is lost or duplicated after sorting", () => {
      const html = renderToStaticMarkup(<MembersDirectory />);
      for (const member of CCF_MEMBERS) {
        expect(html).toContain(member.name);
      }
      expect(CCF_MEMBERS).toHaveLength(50);
    });
  });
});

