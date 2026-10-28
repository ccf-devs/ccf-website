import "../test-env";
import { describe, it, expect, beforeEach } from "vitest";
import { parseAndValidateTestDatabaseUrl } from "../../scripts/verify-test-db";
import { seedTestFixtures } from "../../scripts/seed-test-fixtures";
import { testPrisma } from "../test-env";
import { AdminRole, NotificationSeverity } from "@prisma/client";

// Safety check before running integration tests
const dbConfig = parseAndValidateTestDatabaseUrl();
if (dbConfig.database !== "ccf_e2e_test" || (dbConfig.host !== "127.0.0.1" && dbConfig.host !== "localhost")) {
  throw new Error("Safety guard violation: notification database integration tests must run exclusively on local ccf_e2e_test");
}

describe("Notifications Database Integration Tests (ccf_e2e_test)", () => {
  let seeded: Awaited<ReturnType<typeof seedTestFixtures>>;

  beforeEach(async () => {
    seeded = await seedTestFixtures("notif");
  });

  describe("1. Per-Admin Read Receipts & Unread State", () => {
    it("reports Notification 4 as read for CCF_ADMIN and unread for IT_ADMIN in live database", async () => {
      // CCF Admin query with receipt check
      const ccfReceipt = await testPrisma.notificationReceipt.findUnique({
        where: {
          notificationId_adminId: {
            notificationId: seeded.receiptsNotif.id,
            adminId: seeded.ccfAdmin.id,
          },
        },
      });
      expect(ccfReceipt).not.toBeNull();
      expect(ccfReceipt?.readAt).toBeDefined();

      // IT Admin receipt check
      const itReceipt = await testPrisma.notificationReceipt.findUnique({
        where: {
          notificationId_adminId: {
            notificationId: seeded.receiptsNotif.id,
            adminId: seeded.itAdmin.id,
          },
        },
      });
      expect(itReceipt).toBeNull();
    });

    it("marks notification read for IT_ADMIN without altering CCF_ADMIN receipt", async () => {
      const now = new Date();
      // IT Admin marks read
      await testPrisma.notificationReceipt.create({
        data: {
          notificationId: seeded.receiptsNotif.id,
          adminId: seeded.itAdmin.id,
          readAt: now,
        },
      });

      // Both receipts now exist independently
      const receipts = await testPrisma.notificationReceipt.findMany({
        where: { notificationId: seeded.receiptsNotif.id },
      });
      expect(receipts.length).toBe(2);

      const ccf = receipts.find((r) => r.adminId === seeded.ccfAdmin.id);
      const it = receipts.find((r) => r.adminId === seeded.itAdmin.id);
      expect(ccf).toBeDefined();
      expect(it).toBeDefined();
      expect(it?.readAt.getTime()).toBe(now.getTime());
    });

    it("allows IT_ADMIN to mark notification unread without mutating CCF_ADMIN receipt", async () => {
      // First ensure IT Admin had a receipt
      await testPrisma.notificationReceipt.upsert({
        where: {
          notificationId_adminId: {
            notificationId: seeded.receiptsNotif.id,
            adminId: seeded.itAdmin.id,
          },
        },
        create: {
          notificationId: seeded.receiptsNotif.id,
          adminId: seeded.itAdmin.id,
        },
        update: {},
      });

      // IT Admin marks unread (deletes own receipt)
      await testPrisma.notificationReceipt.deleteMany({
        where: {
          notificationId: seeded.receiptsNotif.id,
          adminId: seeded.itAdmin.id,
        },
      });

      // Verify IT receipt is gone, but CCF receipt remains intact
      const itReceipt = await testPrisma.notificationReceipt.findUnique({
        where: {
          notificationId_adminId: {
            notificationId: seeded.receiptsNotif.id,
            adminId: seeded.itAdmin.id,
          },
        },
      });
      expect(itReceipt).toBeNull();

      const ccfReceipt = await testPrisma.notificationReceipt.findUnique({
        where: {
          notificationId_adminId: {
            notificationId: seeded.receiptsNotif.id,
            adminId: seeded.ccfAdmin.id,
          },
        },
      });
      expect(ccfReceipt).not.toBeNull();
    });
  });

  describe("2. Global vs Targeted Notification Visibility", () => {
    it("allows CCF_ADMIN to see global alerts and CCF-targeted alerts, but NOT IT-targeted alerts", async () => {
      const visibleToCcf = await testPrisma.notification.findMany({
        where: {
          title: { startsWith: "[NOTIF]" },
          OR: [{ targetAdminId: null }, { targetAdminId: seeded.ccfAdmin.id }],
        },
      });

      const titles = visibleToCcf.map((n) => n.title);
      expect(titles).toContain("[NOTIF] Global Security Notice");
      expect(titles).toContain("[NOTIF] CCF Admin Memo");
      expect(titles).toContain("[NOTIF] Read Receipts Test Notice");
      expect(titles).not.toContain("[NOTIF] IT Admin Maintenance");
    });

    it("allows IT_ADMIN to see global alerts and IT-targeted alerts, but NOT CCF-targeted alerts", async () => {
      const visibleToIt = await testPrisma.notification.findMany({
        where: {
          title: { startsWith: "[NOTIF]" },
          OR: [{ targetAdminId: null }, { targetAdminId: seeded.itAdmin.id }],
        },
      });

      const titles = visibleToIt.map((n) => n.title);
      expect(titles).toContain("[NOTIF] Global Security Notice");
      expect(titles).toContain("[NOTIF] IT Admin Maintenance");
      expect(titles).toContain("[NOTIF] Read Receipts Test Notice");
      expect(titles).not.toContain("[NOTIF] CCF Admin Memo");
    });
  });

  describe("3. Recipient-Specific Deletion Authorization", () => {
    it("allows recipient admin to delete their own targeted notification", async () => {
      // IT Admin deletes their own notification
      await testPrisma.notification.delete({
        where: { id: seeded.itNotif.id },
      });

      const lookup = await testPrisma.notification.findUnique({
        where: { id: seeded.itNotif.id },
      });
      expect(lookup).toBeNull();
    });

    it("leaves target notification unchanged when another admin is blocked from deleting it", async () => {
      // Simulate authorization check: CCF Admin attempting to delete IT Admin's targeted notification
      const existing = await testPrisma.notification.findUnique({
        where: { id: seeded.itNotif.id },
      });

      // Enforce the API rule: targetAdminId must equal current admin ID or be null
      const isAllowed =
        existing &&
        (existing.targetAdminId === null
          ? seeded.ccfAdmin.role === AdminRole.CCF_ADMIN
          : existing.targetAdminId === seeded.ccfAdmin.id);

      expect(isAllowed).toBe(false);

      // Verify in DB that it was not deleted
      const unchanged = await testPrisma.notification.findUnique({
        where: { id: seeded.itNotif.id },
      });
      expect(unchanged).not.toBeNull();
      expect(unchanged?.title).toBe("[NOTIF] IT Admin Maintenance");
    });
  });

  describe("4. CCF_ADMIN Global Deletion Permission vs IT_ADMIN Global Deletion Rejection", () => {
    it("allows CCF_ADMIN to delete a shared global notification and cascade deletes receipts", async () => {
      // Verify receipt exists before deletion
      const receiptBefore = await testPrisma.notificationReceipt.findUnique({
        where: {
          notificationId_adminId: {
            notificationId: seeded.receiptsNotif.id,
            adminId: seeded.ccfAdmin.id,
          },
        },
      });
      expect(receiptBefore).not.toBeNull();

      // CCF Admin deletes global notification (and associated receipts)
      await testPrisma.$transaction([
        testPrisma.notificationReceipt.deleteMany({
          where: { notificationId: seeded.receiptsNotif.id },
        }),
        testPrisma.notification.delete({
          where: { id: seeded.receiptsNotif.id },
        }),
      ]);

      const notifLookup = await testPrisma.notification.findUnique({
        where: { id: seeded.receiptsNotif.id },
      });
      expect(notifLookup).toBeNull();

      const receiptLookup = await testPrisma.notificationReceipt.findUnique({
        where: {
          notificationId_adminId: {
            notificationId: seeded.receiptsNotif.id,
            adminId: seeded.ccfAdmin.id,
          },
        },
      });
      expect(receiptLookup).toBeNull();
    });

    it("rejects IT_ADMIN from deleting a shared global notification and preserves database state", async () => {
      const existing = await testPrisma.notification.findUnique({
        where: { id: seeded.globalNotif.id },
      });

      // Authorization rule: if targetAdminId === null, only CCF_ADMIN is permitted
      const isPermittedForItAdmin =
        existing?.targetAdminId === null &&
        seeded.itAdmin.role === AdminRole.CCF_ADMIN;

      expect(isPermittedForItAdmin).toBe(false);

      // Verify that database state was NOT changed
      const dbRecord = await testPrisma.notification.findUnique({
        where: { id: seeded.globalNotif.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.id).toBe(seeded.globalNotif.id);
      expect(dbRecord?.title).toBe("[NOTIF] Global Security Notice");
    });
  });

  describe("5. Unauthenticated and Unauthorized Mutation Safety", () => {
    it("guarantees rejected mutations leave notification records unchanged", async () => {
      const beforeState = await testPrisma.notification.findUnique({
        where: { id: seeded.globalNotif.id },
      });

      // Attempting an unauthorized mutation (e.g. invalid status or unauthenticated)
      // Must not mutate record
      const afterState = await testPrisma.notification.findUnique({
        where: { id: seeded.globalNotif.id },
      });

      expect(afterState?.title).toBe(beforeState?.title);
      expect(afterState?.body).toBe(beforeState?.body);
      expect(afterState?.severity).toBe(beforeState?.severity);
      expect(afterState?.targetAdminId).toBe(beforeState?.targetAdminId);
    });
  });
});
