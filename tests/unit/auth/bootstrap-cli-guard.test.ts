import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveEffectiveDatabaseTarget,
  verifyBootstrapTablePreflight,
  executeBootstrapOtpIssuance,
  TargetDbInfo,
} from "@/scripts/issue-bootstrap-otp";
import { AdminRole } from "@prisma/client";

describe("Bootstrap Provisioning CLI Safety Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Target Identification & Resolution", () => {
    it("fails closed when DATABASE_URL is missing or empty", () => {
      expect(() => resolveEffectiveDatabaseTarget({ rawUrl: "" })).toThrow(
        /DATABASE_URL is not configured or is empty/
      );
    });

    it("fails closed when DATABASE_URL has invalid format", () => {
      expect(() =>
        resolveEffectiveDatabaseTarget({ rawUrl: "not-a-valid-url" })
      ).toThrow(/DATABASE_URL is not a valid URL format/);
    });

    it("fails closed when protocol is unsupported", () => {
      expect(() =>
        resolveEffectiveDatabaseTarget({
          rawUrl: "mysql://user:pass@127.0.0.1:3306/ccf_e2e_test",
        })
      ).toThrow(/Unsupported protocol 'mysql:'/);
    });

    it("identifies local test database correctly on 127.0.0.1", () => {
      const target = resolveEffectiveDatabaseTarget({
        rawUrl: "postgresql://ccf_test_user:pass@127.0.0.1:5432/ccf_e2e_test",
      });
      expect(target.environment).toBe("TEST");
      expect(target.host).toBe("127.0.0.1");
      expect(target.port).toBe(5432);
      expect(target.database).toBe("ccf_e2e_test");
      expect(target.sanitizedTarget).toBe("127.0.0.1:5432/ccf_e2e_test");
      // Must NOT leak credentials in sanitizedTarget
      expect(target.sanitizedTarget).not.toContain("pass");
      expect(target.sanitizedTarget).not.toContain("ccf_test_user");
    });

    it("identifies remote production database correctly (e.g. Neon branch)", () => {
      const target = resolveEffectiveDatabaseTarget({
        rawUrl:
          "postgresql://prod_user:secret_password@c-3.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require",
      });
      expect(target.environment).toBe("PRODUCTION");
      expect(target.host).toBe("c-3.ap-southeast-1.aws.neon.tech");
      expect(target.port).toBe(5432);
      expect(target.database).toBe("neondb");
      expect(target.sanitizedTarget).toBe(
        "c-3.ap-southeast-1.aws.neon.tech:5432/neondb"
      );
      expect(target.sanitizedTarget).not.toContain("secret_password");
      expect(target.sanitizedTarget).not.toContain("prod_user");
      expect(target.sanitizedTarget).not.toContain("sslmode");
    });

    it("flags ambiguous loopback target with non-test database name as UNKNOWN", () => {
      const target = resolveEffectiveDatabaseTarget({
        rawUrl: "postgresql://user:pass@127.0.0.1:5432/production_clone",
      });
      expect(target.environment).toBe("UNKNOWN");
      expect(target.sanitizedTarget).toBe("127.0.0.1:5432/production_clone");
    });
  });

  describe("2. Production Safety Guard & Confirmation Flag", () => {
    it("rejects production issuance by default when --confirm-production is absent", async () => {
      const remoteUrl =
        "postgresql://prod_user:pass@c-3.ap-southeast-1.aws.neon.tech:5432/neondb";

      await expect(
        executeBootstrapOtpIssuance({
          email: "cyberrohith07@gmail.com",
          rawUrl: remoteUrl,
          confirmProduction: false,
        })
      ).rejects.toThrow(
        /Target database is a remote\/production instance.*requires the explicit '--confirm-production' flag/
      );
    });

    it("rejects issuance when target is UNKNOWN/ambiguous", async () => {
      const ambiguousUrl = "postgresql://user:pass@127.0.0.1:5432/custom_database";

      await expect(
        executeBootstrapOtpIssuance({
          email: "cyberrohith07@gmail.com",
          rawUrl: ambiguousUrl,
        })
      ).rejects.toThrow(/Ambiguous target database/);
    });
  });

  describe("3. Table Preflight Verification", () => {
    it("throws clear error with migration name when admin_bootstrap_otps table is missing", async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ exists: false }]),
      } as any;

      const targetInfo: TargetDbInfo = {
        environment: "PRODUCTION",
        host: "c-3.ap-southeast-1.aws.neon.tech",
        port: 5432,
        database: "neondb",
        sanitizedTarget: "c-3.ap-southeast-1.aws.neon.tech:5432/neondb",
        url: "postgresql://mock@neon/neondb",
      };

      await expect(
        verifyBootstrapTablePreflight(mockPrisma, targetInfo)
      ).rejects.toThrow(
        /Required table 'admin_bootstrap_otps' does not exist.*20261014003000_admin_bootstrap_otps/
      );
    });

    it("passes preflight when admin_bootstrap_otps table exists", async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ exists: true }]),
      } as any;

      const targetInfo: TargetDbInfo = {
        environment: "TEST",
        host: "127.0.0.1",
        port: 5432,
        database: "ccf_e2e_test",
        sanitizedTarget: "127.0.0.1:5432/ccf_e2e_test",
        url: "postgresql://mock@127.0.0.1/ccf_e2e_test",
      };

      await expect(
        verifyBootstrapTablePreflight(mockPrisma, targetInfo)
      ).resolves.toBeUndefined();
    });
  });

  describe("4. Account Authorization & Role Preflight", () => {
    const validTestUrl =
      "postgresql://ccf_test_user:pass@127.0.0.1:5432/ccf_e2e_test";

    it("rejects non-existent administrator without generating OTP", async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ exists: true }]),
        adminUser: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as any;

      await expect(
        executeBootstrapOtpIssuance({
          email: "nonexistent@crescentcluboffinance.com",
          rawUrl: validTestUrl,
          prismaClient: mockPrisma,
        })
      ).rejects.toThrow(/Administrator with email.*not found in database/);
    });

    it("rejects inactive administrator without generating OTP", async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ exists: true }]),
        adminUser: {
          findUnique: vi.fn().mockResolvedValue({
            id: "uuid-1",
            email: "inactive@crescentcluboffinance.com",
            name: "Inactive Admin",
            role: "IT_ADMIN",
            active: false,
          }),
        },
      } as any;

      await expect(
        executeBootstrapOtpIssuance({
          email: "inactive@crescentcluboffinance.com",
          rawUrl: validTestUrl,
          prismaClient: mockPrisma,
        })
      ).rejects.toThrow(/is marked inactive/);
    });

    it("SEC-007: rejects non-IT_ADMIN accounts (e.g. CCF_ADMIN)", async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ exists: true }]),
        adminUser: {
          findUnique: vi.fn().mockResolvedValue({
            id: "uuid-2",
            email: "ccf-admin@crescentcluboffinance.com",
            name: "CCF President",
            role: "CCF_ADMIN",
            active: true,
          }),
        },
      } as any;

      await expect(
        executeBootstrapOtpIssuance({
          email: "ccf-admin@crescentcluboffinance.com",
          rawUrl: validTestUrl,
          prismaClient: mockPrisma,
        })
      ).rejects.toThrow(
        /has role 'CCF_ADMIN'\. Bootstrap OTPs can only be issued for IT_ADMIN accounts/
      );
    });
  });
});
