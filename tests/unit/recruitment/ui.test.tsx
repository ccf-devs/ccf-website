import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecruitmentForm } from "@/components/recruitment/recruitment-form";
import { RecruitmentManager } from "@/components/admin/recruitment/recruitment-manager";
import JoinUsPage from "@/app/(public)/join-us/page";
import { RecruitmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import * as recruitmentService from "@/lib/recruitment/service";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/recruitment/service", () => ({
  getRecruitmentSettings: vi.fn(),
}));

describe("Recruitment UI Components Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDepartments = [
    { id: "dept-1", name: "Finance Management", slug: "finance" },
    { id: "dept-2", name: "IT & Media", slug: "it-media" },
    { id: "dept-3", name: "Marketing & PR", slug: "marketing-pr" },
  ];

  describe("1. RecruitmentForm Component", () => {
    it("renders all six application input fields and department choices", () => {
      const html = renderToStaticMarkup(
        <RecruitmentForm departments={mockDepartments} />
      );

      // 1. Full Name
      expect(html).toContain("Full Name");
      expect(html).toContain('id="recruitment-name"');

      // 2. RRN
      expect(html).toContain("Crescent RRN");
      expect(html).toContain('id="recruitment-rrn"');

      // 3. Desired Department
      expect(html).toContain("Desired CCF Department");
      expect(html).toContain('id="recruitment-department"');
      expect(html).toContain("Finance Management");
      expect(html).toContain("IT &amp; Media");
      expect(html).toContain("Marketing &amp; PR");

      // 4. Academic Department
      expect(html).toContain("Current Academic Department");
      expect(html).toContain('id="recruitment-academic-dept"');


      // 5. Year of Study
      expect(html).toContain("Year of Study");
      expect(html).toContain('id="recruitment-year"');

      // 6. WhatsApp Phone
      expect(html).toContain("WhatsApp-Enabled Phone Number");
      expect(html).toContain('id="recruitment-phone"');

      // Submit Button
      expect(html).toContain("Submit Application");
    });
  });

  describe("2. JoinUsPage Rendering States", () => {
    it("renders closed notice and hides form when recruitment is CLOSED or unreachable", async () => {
      (recruitmentService.getRecruitmentSettings as any).mockResolvedValue({
        isOpen: false,
        whatsappGroupUrl: null,
      });
      (prisma.department.findMany as any).mockResolvedValue(mockDepartments);

      const page = await JoinUsPage();
      const html = renderToStaticMarkup(page);

      expect(html).toContain("RECRUITMENT CLOSED");
      expect(html).toContain("Recruitment Currently Closed");
      expect(html).not.toContain('id="apply-form"');
      expect(html).not.toContain('id="recruitment-name"');
    });

    it("renders live application form when recruitment is OPEN", async () => {
      (recruitmentService.getRecruitmentSettings as any).mockResolvedValue({
        isOpen: true,
        whatsappGroupUrl: "https://chat.whatsapp.com/test",
      });
      (prisma.department.findMany as any).mockResolvedValue(mockDepartments);

      const page = await JoinUsPage();
      const html = renderToStaticMarkup(page);

      expect(html).toContain("RECRUITMENT OPEN");
      expect(html).toContain('id="apply-form"');
      expect(html).toContain('id="recruitment-name"');
      expect(html).toContain('id="recruitment-rrn"');
      expect(html).not.toContain("Recruitment Currently Closed");
    });
  });

  describe("3. RecruitmentManager Admin Component", () => {
    const mockApplications = [
      {
        id: "app-1",
        name: "Salman Khan",
        rrnNormalized: "210071601055",
        departmentId: "dept-1",
        departmentName: "Finance Management",
        departmentSlug: "finance",
        academicDepartment: "B.Tech CSE",
        year: "3rd Year",
        phone: "+919876543210",
        status: RecruitmentStatus.ACTIVE,
        createdAt: "2026-09-07T12:00:00Z",
        updatedAt: "2026-09-07T12:00:00Z",
      },
      {
        id: "app-2",
        name: "Fatima Zahra",
        rrnNormalized: "220071601088",
        departmentId: "dept-2",
        departmentName: "IT & Media",
        departmentSlug: "it-media",
        academicDepartment: "B.Com",
        year: "2nd Year",
        phone: "+919876543211",
        status: RecruitmentStatus.SELECTED,
        createdAt: "2026-09-07T13:00:00Z",
        updatedAt: "2026-09-07T13:00:00Z",
      },
    ];

    it("renders recruitment control panel, metrics, and application rows", () => {
      const html = renderToStaticMarkup(
        <RecruitmentManager
          initialSettings={{
            isOpen: true,
            whatsappGroupUrl: "https://chat.whatsapp.com/invite-link",
          }}
          initialApplications={mockApplications}
          departments={mockDepartments}
        />
      );

      // Status Control
      expect(html).toContain("Recruitment Status &amp; Intake");
      expect(html).toContain("Close Recruitment");
      expect(html).toContain("Official WhatsApp Group Invite URL");
      expect(html).toContain("https://chat.whatsapp.com/invite-link");

      // Metrics
      expect(html).toContain("Total Apps");
      expect(html).toContain("Active");
      expect(html).toContain("Selected");
      expect(html).toContain("Rejected");
      expect(html).toContain("Withdrawn");

      // Application Rows
      expect(html).toContain("Salman Khan");
      expect(html).toContain("210071601055");
      expect(html).toContain("Finance Management");
      expect(html).toContain("B.Tech CSE");
      expect(html).toContain("https://wa.me/919876543210");
      expect(html).toContain("ACTIVE");

      expect(html).toContain("Fatima Zahra");
      expect(html).toContain("220071601088");
      expect(html).toContain("IT &amp; Media");
      expect(html).toContain("SELECTED");
    });

    it("renders empty state when no applications exist", () => {
      const html = renderToStaticMarkup(
        <RecruitmentManager
          initialSettings={{
            isOpen: false,
            whatsappGroupUrl: null,
          }}
          initialApplications={[]}
          departments={mockDepartments}
        />
      );

      expect(html).toContain("No recruitment applications found");
      expect(html).toContain("No students have submitted applications yet.");
      expect(html).toContain("Open Recruitment");
    });

    it("renders only valid next transitions in status dropdown based on VALID_RECRUITMENT_TRANSITIONS", () => {
      const variedStatusApps = [
        {
          id: "app-active",
          name: "Active Student",
          rrnNormalized: "210071601001",
          departmentId: "dept-1",
          departmentName: "Finance Management",
          departmentSlug: "finance",
          academicDepartment: "B.Tech CSE",
          year: "3rd Year",
          phone: "+919876543201",
          status: RecruitmentStatus.ACTIVE,
          createdAt: "2026-09-07T12:00:00Z",
          updatedAt: "2026-09-07T12:00:00Z",
        },
        {
          id: "app-selected",
          name: "Selected Student",
          rrnNormalized: "210071601002",
          departmentId: "dept-1",
          departmentName: "Finance Management",
          departmentSlug: "finance",
          academicDepartment: "B.Tech CSE",
          year: "3rd Year",
          phone: "+919876543202",
          status: RecruitmentStatus.SELECTED,
          createdAt: "2026-09-07T12:00:00Z",
          updatedAt: "2026-09-07T12:00:00Z",
        },
        {
          id: "app-rejected",
          name: "Rejected Student",
          rrnNormalized: "210071601003",
          departmentId: "dept-1",
          departmentName: "Finance Management",
          departmentSlug: "finance",
          academicDepartment: "B.Tech CSE",
          year: "3rd Year",
          phone: "+919876543203",
          status: RecruitmentStatus.REJECTED,
          createdAt: "2026-09-07T12:00:00Z",
          updatedAt: "2026-09-07T12:00:00Z",
        },
        {
          id: "app-withdrawn",
          name: "Withdrawn Student",
          rrnNormalized: "210071601004",
          departmentId: "dept-1",
          departmentName: "Finance Management",
          departmentSlug: "finance",
          academicDepartment: "B.Tech CSE",
          year: "3rd Year",
          phone: "+919876543204",
          status: RecruitmentStatus.WITHDRAWN,
          createdAt: "2026-09-07T12:00:00Z",
          updatedAt: "2026-09-07T12:00:00Z",
        },
      ];

      const html = renderToStaticMarkup(
        <RecruitmentManager
          initialSettings={{
            isOpen: true,
            whatsappGroupUrl: null,
          }}
          initialApplications={variedStatusApps}
          departments={mockDepartments}
        />
      );

      // Extract each select using aria-label
      const extractSelect = (name: string) => {
        const marker = `aria-label="Change status for ${name}"`;
        const start = html.indexOf(marker);
        expect(start).toBeGreaterThan(-1);
        const closingTag = "</select>";
        const end = html.indexOf(closingTag, start);
        return html.slice(start, end + closingTag.length);
      };

      // 1. ACTIVE: options are ACTIVE, SELECTED, REJECTED, WITHDRAWN
      const activeSelect = extractSelect("Active Student");
      expect(activeSelect).toContain('value="ACTIVE"');
      expect(activeSelect).toContain('value="SELECTED"');
      expect(activeSelect).toContain('value="REJECTED"');
      expect(activeSelect).toContain('value="WITHDRAWN"');

      // 2. SELECTED: options are SELECTED, ACTIVE, REJECTED (no WITHDRAWN)
      const selectedSelect = extractSelect("Selected Student");
      expect(selectedSelect).toContain('value="SELECTED"');
      expect(selectedSelect).toContain('value="ACTIVE"');
      expect(selectedSelect).toContain('value="REJECTED"');
      expect(selectedSelect).not.toContain('value="WITHDRAWN"');

      // 3. REJECTED: options are REJECTED, ACTIVE, SELECTED (no WITHDRAWN)
      const rejectedSelect = extractSelect("Rejected Student");
      expect(rejectedSelect).toContain('value="REJECTED"');
      expect(rejectedSelect).toContain('value="ACTIVE"');
      expect(rejectedSelect).toContain('value="SELECTED"');
      expect(rejectedSelect).not.toContain('value="WITHDRAWN"');

      // 4. WITHDRAWN: options are WITHDRAWN, ACTIVE (no SELECTED or REJECTED)
      const withdrawnSelect = extractSelect("Withdrawn Student");
      expect(withdrawnSelect).toContain('value="WITHDRAWN"');
      expect(withdrawnSelect).toContain('value="ACTIVE"');
      expect(withdrawnSelect).not.toContain('value="SELECTED"');
      expect(withdrawnSelect).not.toContain('value="REJECTED"');
    });
  });
});
