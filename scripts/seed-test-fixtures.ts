import { PrismaClient, AdminRole, NotificationSeverity } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parseAndValidateTestDatabaseUrl } from "./verify-test-db";
import { encryptTotpSecret } from "../lib/auth/totp";

// Known deterministic test OTP and TOTP secret for deterministic testing
export const TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
export const TEST_BOOTSTRAP_OTP_RAW = "CCF2TEST";
export const TEST_BOOTSTRAP_OTP_FORMATTED = "CCF2-TEST";
export const TEST_RECOVERY_CODE_RAW = "TEST123456";
export const TEST_RECOVERY_CODE_FORMATTED = "TEST1-23456";

export async function seedTestFixtures(prefix = "test") {
  console.log(`[SEED-TEST-FIXTURES] Validating target test database (prefix: ${prefix})...`);
  const config = parseAndValidateTestDatabaseUrl();

  process.env.DATABASE_URL = config.url;

  // Read AUTH_TOTP_ENCRYPTION_KEY from .env.test.local if not already in env
  if (!process.env.AUTH_TOTP_ENCRYPTION_KEY) {
    const fs = await import("fs");
    const content = fs.readFileSync(config.sourceFile, "utf8");
    const match = content.match(/^AUTH_TOTP_ENCRYPTION_KEY\s*=\s*["']?([^"'\r\n]+)/m);
    if (match && match[1]) {
      process.env.AUTH_TOTP_ENCRYPTION_KEY = match[1].trim();
    }
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: config.url },
    },
  });

  try {
    const ccfAdminEmail = `${prefix}-ccf-admin@crescentcluboffinance.com`;
    const inactiveCcfAdminEmail = `inactive-${prefix}-ccf-admin@crescentcluboffinance.com`;
    const itAdminEmail = `${prefix}-it-admin@crescentcluboffinance.com`;
    const inactiveItAdminEmail = `inactive-${prefix}-it-admin@crescentcluboffinance.com`;
    const bootstrapItAdminEmail = `bootstrap-${prefix}-it-admin@crescentcluboffinance.com`;

    const testEmails = [
      ccfAdminEmail,
      inactiveCcfAdminEmail,
      itAdminEmail,
      inactiveItAdminEmail,
      bootstrapItAdminEmail,
    ];

    // Find existing test admin IDs
    const existingAdmins = await prisma.adminUser.findMany({
      where: { email: { in: testEmails } },
      select: { id: true },
    });
    const adminIds = existingAdmins.map((a) => a.id);

    if (adminIds.length > 0) {
      await prisma.notificationReceipt.deleteMany({
        where: { adminId: { in: adminIds } },
      });
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { targetAdminId: { in: adminIds } },
            { title: { startsWith: `[${prefix.toUpperCase()}]` } },
          ],
        },
      });
      await prisma.adminBootstrapOtp.deleteMany({
        where: { adminId: { in: adminIds } },
      });
      await prisma.adminRecoveryCode.deleteMany({
        where: { adminId: { in: adminIds } },
      });
      await prisma.adminTotpSecret.deleteMany({
        where: { adminId: { in: adminIds } },
      });
      await prisma.adminVerificationToken.deleteMany({
        where: { identifier: { in: testEmails } },
      });
      await prisma.adminUser.deleteMany({
        where: { id: { in: adminIds } },
      });
    }

    // Also clean any orphan test notifications
    await prisma.notificationReceipt.deleteMany({
      where: { notification: { title: { startsWith: `[${prefix.toUpperCase()}]` } } },
    });
    await prisma.notification.deleteMany({
      where: { title: { startsWith: `[${prefix.toUpperCase()}]` } },
    });

    // 1. Active CCF_ADMIN
    const ccfAdmin = await prisma.adminUser.create({
      data: {
        email: ccfAdminEmail,
        name: `${prefix.toUpperCase()} CCF Admin`,
        role: AdminRole.CCF_ADMIN,
        active: true,
      },
    });

    // 2. Inactive CCF_ADMIN
    const inactiveCcfAdmin = await prisma.adminUser.create({
      data: {
        email: inactiveCcfAdminEmail,
        name: `Inactive ${prefix.toUpperCase()} CCF Admin`,
        role: AdminRole.CCF_ADMIN,
        active: false,
      },
    });

    // 3. Active IT_ADMIN with TOTP enrolled and recovery codes
    const itAdmin = await prisma.adminUser.create({
      data: {
        email: itAdminEmail,
        name: `${prefix.toUpperCase()} IT Admin`,
        role: AdminRole.IT_ADMIN,
        active: true,
      },
    });

    const encryptedTotp = encryptTotpSecret(TEST_TOTP_SECRET);
    await prisma.adminTotpSecret.create({
      data: {
        adminId: itAdmin.id,
        secret: encryptedTotp,
        verified: true,
      },
    });

    const recoveryCodeHash = await bcrypt.hash(TEST_RECOVERY_CODE_RAW, 10);
    await prisma.adminRecoveryCode.create({
      data: {
        adminId: itAdmin.id,
        codeHash: recoveryCodeHash,
      },
    });

    // 4. Inactive IT_ADMIN
    const inactiveItAdmin = await prisma.adminUser.create({
      data: {
        email: inactiveItAdminEmail,
        name: `Inactive ${prefix.toUpperCase()} IT Admin`,
        role: AdminRole.IT_ADMIN,
        active: false,
      },
    });

    // 5. IT_ADMIN for Bootstrap flow
    const bootstrapItAdmin = await prisma.adminUser.create({
      data: {
        email: bootstrapItAdminEmail,
        name: `Bootstrap ${prefix.toUpperCase()} IT Admin`,
        role: AdminRole.IT_ADMIN,
        active: true,
      },
    });

    const validOtpHash = await bcrypt.hash(TEST_BOOTSTRAP_OTP_RAW, 10);
    await prisma.adminBootstrapOtp.create({
      data: {
        adminId: bootstrapItAdmin.id,
        otpHash: validOtpHash,
        purpose: "INITIAL_BOOTSTRAP",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins in future
      },
    });

    // Notification 1: Global system notification
    const globalNotif = await prisma.notification.create({
      data: {
        title: `[${prefix.toUpperCase()}] Global Security Notice`,
        body: "Routine security review completed across all administrative clusters.",
        type: "SECURITY_ALERT",
        severity: NotificationSeverity.INFO,
        targetAdminId: null,
      },
    });

    // Notification 2: Targeted to CCF_ADMIN
    const ccfNotif = await prisma.notification.create({
      data: {
        title: `[${prefix.toUpperCase()}] CCF Admin Memo`,
        body: "Confidential financial quarterly briefing prepared for CCF administration.",
        type: "SYSTEM_UPDATE",
        severity: NotificationSeverity.SUCCESS,
        targetAdminId: ccfAdmin.id,
      },
    });

    // Notification 3: Targeted to IT_ADMIN
    const itNotif = await prisma.notification.create({
      data: {
        title: `[${prefix.toUpperCase()}] IT Admin Maintenance`,
        body: "Scheduled core infrastructure patch window tonight at 02:00 UTC.",
        type: "SECURITY_ALERT",
        severity: NotificationSeverity.WARNING,
        targetAdminId: itAdmin.id,
      },
    });

    // Notification 4: Read receipts test notification
    const receiptsNotif = await prisma.notification.create({
      data: {
        title: `[${prefix.toUpperCase()}] Read Receipts Test Notice`,
        body: "Notification used to verify per-admin read receipts and unread badge counters.",
        type: "SYSTEM_UPDATE",
        severity: NotificationSeverity.INFO,
        targetAdminId: null,
      },
    });

    // Seed read receipt for CCF_ADMIN only (IT_ADMIN remains unread)
    await prisma.notificationReceipt.create({
      data: {
        notificationId: receiptsNotif.id,
        adminId: ccfAdmin.id,
      },
    });

    console.log("[SEED-TEST-FIXTURES] Fixtures successfully seeded:");
    console.log(`- Active CCF_ADMIN: ${ccfAdmin.email} [ID: ${ccfAdmin.id}]`);
    console.log(`- Inactive CCF_ADMIN: ${inactiveCcfAdmin.email} [ID: ${inactiveCcfAdmin.id}]`);
    console.log(`- Active IT_ADMIN: ${itAdmin.email} [ID: ${itAdmin.id}] (TOTP + Recovery Code enrolled)`);
    console.log(`- Inactive IT_ADMIN: ${inactiveItAdmin.email} [ID: ${inactiveItAdmin.id}]`);
    console.log(`- Bootstrap IT_ADMIN: ${bootstrapItAdmin.email} [ID: ${bootstrapItAdmin.id}] (OTP seeded)`);
    console.log(`- Notifications seeded: 4 (1 Global, 1 CCF targeted, 1 IT targeted, 1 Receipt test)`);

    return {
      ccfAdmin,
      inactiveCcfAdmin,
      itAdmin,
      inactiveItAdmin,
      bootstrapItAdmin,
      globalNotif,
      ccfNotif,
      itNotif,
      receiptsNotif,
    };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedTestFixtures().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[SEED-TEST-FIXTURES ERROR] ${msg}`);
    process.exit(1);
  });
}
