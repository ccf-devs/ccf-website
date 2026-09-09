import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AdminRole } from "@prisma/client";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  GET as getMembers,
  POST as createMember,
} from "@/app/api/admin/members/route";
import {
  GET as getMemberById,
  PATCH as patchMember,
  DELETE as deleteMember,
} from "@/app/api/admin/members/[id]/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    member: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    department: {
      findUnique: vi.fn(),
    },
    media: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Admin Members API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "audit-1" } as any);
  });

  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  const mockItAdminUser = {
    id: "admin-uuid-2",
    email: "cyberrohith07@gmail.com",
    name: "Rohith IT",
    role: AdminRole.IT_ADMIN,
  };

  const activeDeptId = "11111111-1111-1111-1111-111111111111";
  const inactiveDeptId = "22222222-2222-2222-2222-222222222222";
  const memberId = "33333333-3333-3333-3333-333333333333";

  /* -------------------------------------------------------------------------- */
  /* 1. Authorization Enforcements Across Endpoints                             */
  /* -------------------------------------------------------------------------- */
  describe("1. Authorization Enforcements", () => {
    it("rejects unauthenticated requests with 401 across all endpoints", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      const resGet = await getMembers(new NextRequest("http://localhost/api/admin/members"));
      expect(resGet.status).toBe(401);

      const resPost = await createMember(
        new NextRequest("http://localhost/api/admin/members", {
          method: "POST",
          body: JSON.stringify({ name: "Test" }),
        })
      );
      expect(resPost.status).toBe(401);

      const resPatch = await patchMember(
        new NextRequest(`http://localhost/api/admin/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }),
        { params: Promise.resolve({ id: memberId }) }
      );
      expect(resPatch.status).toBe(401);

      const resDelete = await deleteMember(
        new NextRequest(`http://localhost/api/admin/members/${memberId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: memberId }) }
      );
      expect(resDelete.status).toBe(401);
    });

    it("rejects unauthorized non-admin roles with 403", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-99",
        email: "student@example.com",
        name: "Student",
        role: "MEMBER" as unknown as AdminRole,
      });

      const resGet = await getMembers(new NextRequest("http://localhost/api/admin/members"));
      expect(resGet.status).toBe(403);

      const resPost = await createMember(
        new NextRequest("http://localhost/api/admin/members", {
          method: "POST",
          body: JSON.stringify({ name: "Test" }),
        })
      );
      expect(resPost.status).toBe(403);
    });

    it("allows CCF_ADMIN and IT_ADMIN to retrieve members", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([]);

      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      const res1 = await getMembers(new NextRequest("http://localhost/api/admin/members"));
      expect(res1.status).toBe(200);

      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockItAdminUser);
      const res2 = await getMembers(new NextRequest("http://localhost/api/admin/members"));
      expect(res2.status).toBe(200);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Member Creation & Active Department Rules                               */
  /* -------------------------------------------------------------------------- */
  describe("2. Member Creation (POST /api/admin/members)", () => {
    it("creates a new member with valid payload in an active department", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findUnique).mockResolvedValue({
        id: activeDeptId,
        name: "Finance Management",
        slug: "finance-management",
        description: "Finance",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.member.create as any).mockImplementation(async ({ data }: any) => ({
        id: memberId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        department: { id: activeDeptId, name: "Finance Management", slug: "finance-management", active: true },
        photo: null,
      }));

      const res = await createMember(
        new NextRequest("http://localhost/api/admin/members", {
          method: "POST",
          body: JSON.stringify({
            name: "Remi Kayalvizhi",
            position: "President",
            departmentId: activeDeptId,
            displayOrder: 1,
            visibility: true,
            bio: "CCF President 2026",
            socialUrl: "https://linkedin.com/in/remi",
          }),
        })
      );

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(prisma.member.create).toHaveBeenCalledWith({
        data: {
          name: "Remi Kayalvizhi",
          position: "President",
          departmentId: activeDeptId,
          displayOrder: 1,
          visibility: true,
          bio: "CCF President 2026",
          socialUrl: "https://linkedin.com/in/remi",
          photoMediaId: null,
        },
        include: {
          department: {
            select: { id: true, name: true, slug: true, active: true },
          },
          photo: {
            select: { id: true, objectKey: true, altText: true },
          },
        },
      });
    });

    it("rejects member creation if target department is inactive (Rule 4)", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findUnique).mockResolvedValue({
        id: inactiveDeptId,
        name: "Archived Dept",
        slug: "archived-dept",
        description: null,
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await createMember(
        new NextRequest("http://localhost/api/admin/members", {
          method: "POST",
          body: JSON.stringify({
            name: "John Doe",
            departmentId: inactiveDeptId,
          }),
        })
      );

      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("active department");
      expect(prisma.member.create).not.toHaveBeenCalled();
    });

    it("rejects member creation with missing name or invalid UUID department", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);

      const res = await createMember(
        new NextRequest("http://localhost/api/admin/members", {
          method: "POST",
          body: JSON.stringify({
            name: "",
            departmentId: "not-a-uuid",
          }),
        })
      );

      expect(res.status).toBe(400);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Member Editing & Department Transfer Rules                              */
  /* -------------------------------------------------------------------------- */
  describe("3. Member Updates (PATCH /api/admin/members/[id])", () => {
    it("allows editing an existing member who is currently in an inactive department", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      const existingMember = {
        id: memberId,
        name: "Existing Member",
        position: "Director",
        departmentId: inactiveDeptId, // Current department is inactive
        displayOrder: 0,
        visibility: true,
        bio: null,
        socialUrl: null,
        photoMediaId: null,
      };
      vi.mocked(prisma.member.findUnique).mockResolvedValue(existingMember as any);
      vi.mocked(prisma.member.update).mockResolvedValue({
        ...existingMember,
        position: "Senior Director",
      } as any);

      const res = await patchMember(
        new NextRequest(`http://localhost/api/admin/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify({
            position: "Senior Director",
          }),
        }),
        { params: Promise.resolve({ id: memberId }) }
      );

      expect(res.status).toBe(200);
      expect(prisma.member.update).toHaveBeenCalled();
    });

    it("rejects moving an existing member to a DIFFERENT department if that target department is inactive (Rule 4)", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      const existingMember = {
        id: memberId,
        name: "Existing Member",
        position: "Director",
        departmentId: activeDeptId,
      };
      vi.mocked(prisma.member.findUnique).mockResolvedValue(existingMember as any);

      // Target department is inactive
      vi.mocked(prisma.department.findUnique).mockResolvedValue({
        id: inactiveDeptId,
        name: "Inactive Dept",
        slug: "inactive",
        active: false,
      } as any);

      const res = await patchMember(
        new NextRequest(`http://localhost/api/admin/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify({
            departmentId: inactiveDeptId,
          }),
        }),
        { params: Promise.resolve({ id: memberId }) }
      );

      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("Target department must be active");
      expect(prisma.member.update).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Soft Deactivation Rule (DELETE & PATCH)                                 */
  /* -------------------------------------------------------------------------- */
  describe("4. Soft Deactivation Enforcements (Rule 3)", () => {
    it("DELETE performs soft deactivation by setting visibility = false and NEVER deleting the record", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: memberId,
        name: "Member to Deactivate",
        visibility: true,
      } as any);
      vi.mocked(prisma.member.update).mockResolvedValue({
        id: memberId,
        visibility: false,
      } as any);

      const res = await deleteMember(
        new NextRequest(`http://localhost/api/admin/members/${memberId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: memberId }) }
      );

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify prisma.member.update was called with visibility = false
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { visibility: false },
      });

      // Verify physical deletion was NEVER called
      expect(prisma.member.delete).not.toHaveBeenCalled();
    });

    it("PATCH with visibility = false soft deactivates", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: memberId,
        name: "Active Member",
        visibility: true,
      } as any);
      vi.mocked(prisma.member.update).mockResolvedValue({
        id: memberId,
        visibility: false,
      } as any);

      const res = await patchMember(
        new NextRequest(`http://localhost/api/admin/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify({ visibility: false }),
        }),
        { params: Promise.resolve({ id: memberId }) }
      );

      expect(res.status).toBe(200);
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: memberId },
          data: expect.objectContaining({ visibility: false }),
        })
      );
    });

    it("creates an audit log entry on member deactivation via DELETE", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: memberId,
        name: "Test Member",
        position: "Lead",
        departmentId: "dept-1",
        visibility: true,
      } as any);
      vi.mocked(prisma.member.update).mockResolvedValue({
        id: memberId,
        visibility: false,
      } as any);

      await deleteMember(
        new NextRequest(`http://localhost/api/admin/members/${memberId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: memberId }) }
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: mockAdminUser.id,
            action: "MEMBER_DEACTIVATED",
            entityType: "Member",
            entityId: memberId,
          }),
        })
      );
    });
  });
});
