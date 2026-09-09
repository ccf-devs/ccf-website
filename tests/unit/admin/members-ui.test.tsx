import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminRole } from "@prisma/client";
import AdminMembersPage from "@/app/admin/members/page";
import { MemberListTable } from "@/components/admin/members";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/members",
  redirect: (url: string) => mockRedirect(url),
}));

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    member: {
      findMany: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Members UI Unit Tests", () => {
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
      active: true,
    },
    {
      id: "dept-2",
      name: "IT & Media",
      slug: "it-media",
      active: true,
    },
  ];

  const sampleMembers = [
    {
      id: "mem-1",
      name: "Remi Kayalvizhi",
      position: "President",
      departmentId: "dept-1",
      photoMediaId: null,
      bio: "Club President",
      socialUrl: "https://linkedin.com/in/remi",
      visibility: true,
      displayOrder: 1,
      createdAt: "2026-09-08T10:00:00.000Z",
      updatedAt: "2026-09-08T10:00:00.000Z",
      department: sampleDepartments[0],
      photo: null,
    },
    {
      id: "mem-2",
      name: "Fizza Fathima",
      position: "Vice-President",
      departmentId: "dept-1",
      photoMediaId: null,
      bio: null,
      socialUrl: null,
      visibility: false,
      displayOrder: 2,
      createdAt: "2026-09-08T10:00:00.000Z",
      updatedAt: "2026-09-08T10:00:00.000Z",
      department: sampleDepartments[0],
      photo: null,
    },
  ];

  /* -------------------------------------------------------------------------- */
  /* 1. Page Component Authorization                                            */
  /* -------------------------------------------------------------------------- */
  describe("1. Page Component Authorization", () => {
    it("redirects unauthenticated user to login with callbackUrl", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      await AdminMembersPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/members"
      );
    });

    it("redirects unauthorized non-admin role to login", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as unknown as AdminRole,
      });

      await AdminMembersPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/members"
      );
    });

    it("renders page for authorized CCF_ADMIN and queries Prisma", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.member.findMany).mockResolvedValue(
        sampleMembers.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        })) as any
      );
      vi.mocked(prisma.department.findMany).mockResolvedValue(sampleDepartments as any);

      const element = await AdminMembersPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(html).toContain("Members");
      expect(html).toContain("Remi Kayalvizhi");
      expect(html).toContain("President");
    });

    it("fails closed with operational error state when database read throws", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.member.findMany).mockRejectedValue(new Error("Neon connection timed out"));

      const element = await AdminMembersPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      // Verifies fail closed message
      expect(html).toContain("Live operational data is temporarily unavailable.");
      expect(html).toContain("Operational Data Temporarily Unavailable");
      // Must NOT render table or empty state
      expect(html).not.toContain("No Members Found");
      expect(html).not.toContain("No Departments Available");
      // Must NOT expose raw Prisma/DB error
      expect(html).not.toContain("Neon connection timed out");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. MemberListTable Component                                               */
  /* -------------------------------------------------------------------------- */
  describe("2. MemberListTable Component", () => {
    it("renders member rows with name, position, department, displayOrder, and visibility", () => {
      const html = renderToStaticMarkup(
        <MemberListTable
          initialMembers={sampleMembers}
          departments={sampleDepartments}
        />
      );

      // Member 1
      expect(html).toContain("Remi Kayalvizhi");
      expect(html).toContain("President");
      expect(html).toContain("Finance Management");
      expect(html).toContain("1"); // displayOrder
      expect(html).toContain("Active");

      // Member 2 (Inactive)
      expect(html).toContain("Fizza Fathima");
      expect(html).toContain("Vice-President");
      expect(html).toContain("2"); // displayOrder
      expect(html).toContain("Inactive");
    });

    it("renders empty state when 0 members exist in database", () => {
      const html = renderToStaticMarkup(
        <MemberListTable initialMembers={[]} departments={sampleDepartments} />
      );

      expect(html).toContain("No Member Records in Database");
      expect(html).toContain("Add First Member");
    });

    it("renders warning banner when 0 departments exist", () => {
      const html = renderToStaticMarkup(
        <MemberListTable initialMembers={[]} departments={[]} />
      );

      expect(html).toContain(
        "No department records exist in the database. You must initialize canonical departments"
      );
      expect(html).toContain("Go to Departments");
    });
  });
});
