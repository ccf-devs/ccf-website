import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AdminRole } from "@prisma/client";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { GET as getDepartments } from "@/app/api/admin/departments/route";
import {
  GET as getDepartmentById,
  PATCH as patchDepartment,
} from "@/app/api/admin/departments/[id]/route";
import { POST as initializeDepartments } from "@/app/api/admin/departments/initialize/route";
import { CCF_DEPARTMENTS } from "@/lib/data/departments";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    department: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Admin Departments API Integration Tests", () => {
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

  /* -------------------------------------------------------------------------- */
  /* 1. Authorization Tests Across All Endpoints                                */
  /* -------------------------------------------------------------------------- */
  describe("1. Authorization Enforcements", () => {
    it("rejects unauthenticated requests with 401 across GET, PATCH, and POST", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      const resGet = await getDepartments();
      expect(resGet.status).toBe(401);

      const resPatch = await patchDepartment(
        new NextRequest("http://localhost/api/admin/departments/dept-1", {
          method: "PATCH",
          body: JSON.stringify({ active: false }),
        }),
        { params: Promise.resolve({ id: "dept-1" }) }
      );
      expect(resPatch.status).toBe(401);

      const resInit = await initializeDepartments();
      expect(resInit.status).toBe(401);
    });

    it("rejects unauthorized non-admin roles with 403", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-99",
        email: "student@example.com",
        name: "Student",
        role: "MEMBER" as unknown as AdminRole,
      });

      const resGet = await getDepartments();
      expect(resGet.status).toBe(403);

      const resPatch = await patchDepartment(
        new NextRequest("http://localhost/api/admin/departments/dept-1", {
          method: "PATCH",
          body: JSON.stringify({ active: false }),
        }),
        { params: Promise.resolve({ id: "dept-1" }) }
      );
      expect(resPatch.status).toBe(403);

      const resInit = await initializeDepartments();
      expect(resInit.status).toBe(403);
    });

    it("allows CCF_ADMIN to access departments", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findMany).mockResolvedValue([]);

      const res = await getDepartments();
      expect(res.status).toBe(200);
    });

    it("allows IT_ADMIN to access departments", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockItAdminUser);
      vi.mocked(prisma.department.findMany).mockResolvedValue([]);

      const res = await getDepartments();
      expect(res.status).toBe(200);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Canonical Department Initialization                                     */
  /* -------------------------------------------------------------------------- */
  describe("2. Canonical Initialization (POST /api/admin/departments/initialize)", () => {
    it("creates all 5 canonical departments when database is empty", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findMany).mockResolvedValue([]);
      (prisma.department.create as any).mockImplementation(
        async ({ data }: any) => ({ id: `uuid-${data.slug}`, ...data })
      );

      const res = await initializeDepartments();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.createdCount).toBe(5);
      expect(prisma.department.create).toHaveBeenCalledTimes(5);
    });

    it("creates only missing canonical departments when some already exist", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      // Simulate 2 existing departments
      vi.mocked(prisma.department.findMany).mockResolvedValue([
        { slug: "finance-management" },
        { slug: "it-media" },
      ] as any);
      (prisma.department.create as any).mockImplementation(
        async ({ data }: any) => ({ id: `uuid-${data.slug}`, ...data })
      );

      const res = await initializeDepartments();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.createdCount).toBe(3); // 5 - 2 = 3 created
      expect(prisma.department.create).toHaveBeenCalledTimes(3);
    });

    it("returns already initialized and performs zero mutations when all 5 exist", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findMany).mockResolvedValue(
        CCF_DEPARTMENTS.map((d) => ({ slug: d.slug })) as any
      );

      const res = await initializeDepartments();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.createdCount).toBe(0);
      expect(json.message).toContain("already initialized");
      expect(prisma.department.create).not.toHaveBeenCalled();
    });

    it("never overwrites existing department descriptions or active states", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      // Existing department has custom description
      vi.mocked(prisma.department.findMany).mockResolvedValue(
        CCF_DEPARTMENTS.map((d) => ({ slug: d.slug })) as any
      );

      await initializeDepartments();

      expect(prisma.department.update).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Department Retrieval & Updates                                          */
  /* -------------------------------------------------------------------------- */
  describe("3. Department Retrieval & Editing", () => {
    it("returns 404 for non-existent department ID", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.department.findUnique).mockResolvedValue(null);

      const res = await getDepartmentById(
        new NextRequest("http://localhost/api/admin/departments/invalid-id"),
        { params: Promise.resolve({ id: "invalid-id" }) }
      );
      expect(res.status).toBe(404);
    });

    it("updates description and active status on valid PATCH", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      const existingDept = {
        id: "dept-1",
        name: "Finance Management",
        slug: "finance-management",
        description: "Old description",
        active: true,
      };
      vi.mocked(prisma.department.findUnique).mockResolvedValue(existingDept as any);
      vi.mocked(prisma.department.update).mockResolvedValue({
        ...existingDept,
        description: "Updated description",
        active: false,
      } as any);

      const res = await patchDepartment(
        new NextRequest("http://localhost/api/admin/departments/dept-1", {
          method: "PATCH",
          body: JSON.stringify({
            description: "Updated description",
            active: false,
          }),
        }),
        { params: Promise.resolve({ id: "dept-1" }) }
      );

      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: "dept-1" },
        data: {
          description: "Updated description",
          active: false,
        },
        include: {
          _count: {
            select: {
              members: true,
              recruitmentApplications: true,
            },
          },
        },
      });
    });

    it("rejects description exceeding 1000 characters", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);

      const res = await patchDepartment(
        new NextRequest("http://localhost/api/admin/departments/dept-1", {
          method: "PATCH",
          body: JSON.stringify({
            description: "A".repeat(1001),
          }),
        }),
        { params: Promise.resolve({ id: "dept-1" }) }
      );

      expect(res.status).toBe(400);
    });

    it("creates an audit log entry on successful status change", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      const existingDept = {
        id: "dept-1",
        name: "Finance Management",
        slug: "finance-management",
        description: "Finance desc",
        active: true,
      };
      vi.mocked(prisma.department.findUnique).mockResolvedValue(existingDept as any);
      vi.mocked(prisma.department.update).mockResolvedValue({
        ...existingDept,
        active: false,
        _count: { members: 5, recruitmentApplications: 10 },
      } as any);

      await patchDepartment(
        new NextRequest("http://localhost/api/admin/departments/dept-1", {
          method: "PATCH",
          body: JSON.stringify({ active: false }),
        }),
        { params: Promise.resolve({ id: "dept-1" }) }
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: mockAdminUser.id,
            action: "DEPARTMENT_STATUS_CHANGED",
            entityType: "Department",
            entityId: "dept-1",
          }),
        })
      );
    });
  });
});
