import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminRole } from "@prisma/client";
import AdminDepartmentsPage from "@/app/admin/departments/page";
import { DepartmentListTable } from "@/components/admin/departments";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/departments",
  redirect: (url: string) => mockRedirect(url),
}));

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    department: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Departments UI Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  const sampleDepartments = [
    {
      id: "dept-1",
      name: "Finance Management",
      slug: "finance-management",
      description: "Responsible for club budgeting and financial planning.",
      active: true,
      _count: {
        members: 8,
        recruitmentApplications: 14,
      },
    },
    {
      id: "dept-2",
      name: "IT & Media",
      slug: "it-media",
      description: "Manages technical systems and digital media.",
      active: true,
      _count: {
        members: 10,
        recruitmentApplications: 25,
      },
    },
  ];

  /* -------------------------------------------------------------------------- */
  /* 1. Page Component Authorization                                            */
  /* -------------------------------------------------------------------------- */
  describe("1. Page Component Authorization", () => {
    it("redirects unauthenticated user to login with callbackUrl", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      await AdminDepartmentsPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/departments"
      );
    });

    it("redirects non-admin role to login", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as unknown as AdminRole,
      });

      await AdminDepartmentsPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/departments"
      );
    });

    it("renders page for authorized CCF_ADMIN", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findMany).mockResolvedValue(sampleDepartments as any);

      const element = await AdminDepartmentsPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(html).toContain("Departments");
      expect(html).toContain("Finance Management");
      expect(html).toContain("finance-management");
    });

    it("fails closed with operational error state when database read throws", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findMany).mockRejectedValue(new Error("Database connection lost"));

      const element = await AdminDepartmentsPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      // Verifies fail closed message
      expect(html).toContain("Live operational data is temporarily unavailable.");
      expect(html).toContain("Operational Data Temporarily Unavailable");
      // Must NOT render empty state CTA
      expect(html).not.toContain("Initialize 5 Canonical Departments");
      // Must NOT expose raw Prisma/DB error
      expect(html).not.toContain("Database connection lost");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. DepartmentListTable Rendering & States                                  */
  /* -------------------------------------------------------------------------- */
  describe("2. DepartmentListTable Component", () => {
    it("renders department records with name, slug, description, and counts", () => {
      const html = renderToStaticMarkup(
        <DepartmentListTable initialDepartments={sampleDepartments} />
      );

      expect(html).toContain("Finance Management");
      expect(html).toContain("finance-management");
      expect(html).toContain("Responsible for club budgeting");
      expect(html).toContain("8"); // members count
      expect(html).toContain("14"); // applications count
      expect(html).toContain("IT &amp; Media");
      expect(html).toContain("it-media");
      expect(html).toContain("Active");
    });

    it("renders empty state with canonical initialize CTA when 0 departments exist", () => {
      const html = renderToStaticMarkup(
        <DepartmentListTable initialDepartments={[]} />
      );

      expect(html).toContain("No Department Records in Database");
      expect(html).toContain("Initialize 5 Canonical Departments");
    });

    it("renders inactive badge when department is deactivated", () => {
      const inactiveDept = [
        {
          ...sampleDepartments[0],
          active: false,
        },
      ];

      const html = renderToStaticMarkup(
        <DepartmentListTable initialDepartments={inactiveDept} />
      );

      expect(html).toContain("Inactive");
      expect(html).toContain("Activate");
    });
  });
});
