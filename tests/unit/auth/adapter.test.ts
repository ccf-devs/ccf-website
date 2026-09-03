import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCcfAdminAdapter, normalizeAdminEmail } from "@/lib/auth/adapter";
import { prisma } from "@/lib/db/client";
import { AdminRole } from "@prisma/client";

vi.mock("@/lib/db/client", () => {
  return {
    prisma: {
      adminUser: {
        findUnique: vi.fn(),
      },
      adminVerificationToken: {
        create: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

describe("CCF Admin Adapter", () => {
  const adapter = createCcfAdminAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Email Normalization", () => {
    it("lowercases and trims emails", () => {
      expect(normalizeAdminEmail("  Admin@Crescent.Education  ")).toBe("admin@crescent.education");
      expect(normalizeAdminEmail("USER@EXAMPLE.COM")).toBe("user@example.com");
    });
  });

  describe("getUserByEmail", () => {
    it("returns an active administrator identity", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-1",
        email: "admin@crescent.education",
        name: "CCF President",
        role: AdminRole.CCF_ADMIN,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await adapter.getUserByEmail!("ADMIN@crescent.education");

      expect(user).not.toBeNull();
      expect(user?.id).toBe("admin-uuid-1");
      expect(user?.email).toBe("admin@crescent.education");
      expect((user as any).role).toBe(AdminRole.CCF_ADMIN);
      expect((user as any).active).toBe(true);
    });

    it("returns null for an inactive administrator", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-2",
        email: "inactive@crescent.education",
        name: "Former Member",
        role: AdminRole.IT_ADMIN,
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await adapter.getUserByEmail!("inactive@crescent.education");
      expect(user).toBeNull();
    });

    it("returns null for an unknown email", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null);

      const user = await adapter.getUserByEmail!("unknown@crescent.education");
      expect(user).toBeNull();
    });
  });

  describe("createUser", () => {
    it("throws a defensive error because admin accounts must be pre-created", async () => {
      await expect(
        adapter.createUser!({
          email: "stranger@crescent.education",
          emailVerified: null,
          name: "Stranger",
        })
      ).rejects.toThrow("Admin accounts cannot be created through the authentication flow.");
    });
  });

  describe("updateUser", () => {
    it("returns user identity without modifying emailVerified in database", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-uuid-1",
        email: "admin@crescent.education",
        name: "CCF President",
        role: AdminRole.CCF_ADMIN,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await adapter.updateUser!({
        id: "admin-uuid-1",
        emailVerified: new Date(),
      });

      expect(updated.id).toBe("admin-uuid-1");
      expect(updated.email).toBe("admin@crescent.education");
      expect((updated as any).role).toBe(AdminRole.CCF_ADMIN);
    });
  });

  describe("Verification Tokens (Magic Link)", () => {
    it("stores pre-hashed token as received from Auth.js", async () => {
      const tokenData = {
        identifier: "admin@crescent.education",
        token: "pre-hashed-token-from-authjs",
        expires: new Date(Date.now() + 600 * 1000),
      };

      vi.mocked(prisma.adminVerificationToken.create).mockResolvedValue({
        identifier: tokenData.identifier,
        token: tokenData.token,
        expires: tokenData.expires,
        createdAt: new Date(),
      });

      const created = await adapter.createVerificationToken!(tokenData);

      expect(prisma.adminVerificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: "admin@crescent.education",
          token: "pre-hashed-token-from-authjs",
          expires: tokenData.expires,
        },
      });
      expect(created?.token).toBe("pre-hashed-token-from-authjs");
    });

    it("atomically consumes and returns a valid verification token", async () => {
      const expires = new Date(Date.now() + 300 * 1000);
      vi.mocked(prisma.adminVerificationToken.delete).mockResolvedValue({
        identifier: "admin@crescent.education",
        token: "valid-token",
        expires,
        createdAt: new Date(),
      });

      const token = await adapter.useVerificationToken!({
        identifier: "ADMIN@crescent.education",
        token: "valid-token",
      });

      expect(token).not.toBeNull();
      expect(token?.token).toBe("valid-token");
      expect(prisma.adminVerificationToken.delete).toHaveBeenCalledWith({
        where: {
          identifier_token: {
            identifier: "admin@crescent.education",
            token: "valid-token",
          },
        },
      });
    });

    it("returns null if token has expired", async () => {
      const expiredDate = new Date(Date.now() - 10000);
      vi.mocked(prisma.adminVerificationToken.delete).mockResolvedValue({
        identifier: "admin@crescent.education",
        token: "expired-token",
        expires: expiredDate,
        createdAt: new Date(),
      });

      const token = await adapter.useVerificationToken!({
        identifier: "admin@crescent.education",
        token: "expired-token",
      });

      expect(token).toBeNull();
    });

    it("returns null on replay if token was already consumed", async () => {
      vi.mocked(prisma.adminVerificationToken.delete).mockRejectedValue(
        new Error("Record to delete does not exist.")
      );

      const token = await adapter.useVerificationToken!({
        identifier: "admin@crescent.education",
        token: "already-used-token",
      });

      expect(token).toBeNull();
    });
  });
});
