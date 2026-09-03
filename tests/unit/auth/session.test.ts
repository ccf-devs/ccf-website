import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrentAdmin,
  requireAdmin,
  requireRole,
  isItAdmin,
  isCcfAdmin,
} from "@/lib/auth/session";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db/client";
import { AdminRole } from "@prisma/client";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Session and Role Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentAdmin", () => {
    it("returns null when no session exists", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const admin = await getCurrentAdmin();
      expect(admin).toBeNull();
    });

    it("rejects session if administrator is marked inactive in database", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin-uuid-1",
          email: "admin@crescent.education",
          name: "Inactive Admin",
          role: AdminRole.CCF_ADMIN,
          active: true, // Session claim says active, but DB is authoritative
        },
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      // DB says inactive
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-1",
        email: "admin@crescent.education",
        name: "Inactive Admin",
        role: AdminRole.CCF_ADMIN,
        active: false,
      } as any);

      const admin = await getCurrentAdmin();
      expect(admin).toBeNull();
    });

    it("returns authenticated active admin when DB confirms active status", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin-uuid-2",
          email: "it@crescent.education",
          name: "IT Lead",
          role: AdminRole.IT_ADMIN,
          active: true,
        },
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-2",
        email: "it@crescent.education",
        name: "IT Lead",
        role: AdminRole.IT_ADMIN,
        active: true,
      } as any);

      const admin = await getCurrentAdmin();
      expect(admin).not.toBeNull();
      expect(admin?.role).toBe(AdminRole.IT_ADMIN);
      expect(admin?.email).toBe("it@crescent.education");
    });
  });

  describe("requireAdmin", () => {
    it("throws unauthorized when admin is not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow("UNAUTHORIZED");
    });

    it("returns admin when active", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin-uuid-3",
          email: "active@crescent.education",
          name: "Active Admin",
          role: AdminRole.CCF_ADMIN,
          active: true,
        },
        expires: "2099-01-01",
      });

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-3",
        email: "active@crescent.education",
        name: "Active Admin",
        role: AdminRole.CCF_ADMIN,
        active: true,
      } as any);

      const admin = await requireAdmin();
      expect(admin.id).toBe("admin-uuid-3");
    });
  });

  describe("requireRole", () => {
    it("allows access when role matches required list", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin-uuid-4",
          email: "it@crescent.education",
          name: "IT Admin",
          role: AdminRole.IT_ADMIN,
          active: true,
        },
        expires: "2099-01-01",
      });

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-4",
        email: "it@crescent.education",
        name: "IT Admin",
        role: AdminRole.IT_ADMIN,
        active: true,
      } as any);

      const admin = await requireRole([AdminRole.IT_ADMIN]);
      expect(admin.role).toBe(AdminRole.IT_ADMIN);
    });

    it("throws forbidden when role is not in allowed list", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin-uuid-5",
          email: "ccf@crescent.education",
          name: "CCF Admin",
          role: AdminRole.CCF_ADMIN,
          active: true,
        },
        expires: "2099-01-01",
      });

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-5",
        email: "ccf@crescent.education",
        name: "CCF Admin",
        role: AdminRole.CCF_ADMIN,
        active: true,
      } as any);

      await expect(requireRole([AdminRole.IT_ADMIN])).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("Role helper functions", () => {
    const itAdmin = {
      id: "1",
      email: "it@test.com",
      name: "IT",
      role: AdminRole.IT_ADMIN,
    };
    const ccfAdmin = {
      id: "2",
      email: "ccf@test.com",
      name: "CCF",
      role: AdminRole.CCF_ADMIN,
    };

    it("distinguishes IT_ADMIN and CCF_ADMIN", () => {
      expect(isItAdmin(itAdmin)).toBe(true);
      expect(isItAdmin(ccfAdmin)).toBe(false);

      expect(isCcfAdmin(ccfAdmin)).toBe(true);
      expect(isCcfAdmin(itAdmin)).toBe(false);
    });
  });
});
