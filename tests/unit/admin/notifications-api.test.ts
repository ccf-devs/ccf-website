import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AdminRole, NotificationSeverity } from "@prisma/client";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  GET as getNotifications,
  POST as createNotification,
} from "@/app/api/admin/notifications/route";
import {
  GET as getNotificationById,
  PATCH as patchNotification,
  DELETE as deleteNotification,
} from "@/app/api/admin/notifications/[id]/route";
import { POST as markAllRead } from "@/app/api/admin/notifications/read-all/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    adminUser: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Admin Notifications API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "audit-1" } as any);
    vi.mocked(prisma.notification.count).mockResolvedValue(0);
  });

  const currentAdmin = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "admin@ccf.org",
    name: "Current Admin",
    role: AdminRole.CCF_ADMIN,
  };

  const itAdmin = {
    id: "22222222-2222-2222-2222-222222222222",
    email: "it@ccf.org",
    name: "IT Admin",
    role: AdminRole.IT_ADMIN,
  };

  const otherAdminId = "33333333-3333-3333-3333-333333333333";
  const notifId = "44444444-4444-4444-4444-444444444444";

  /* -------------------------------------------------------------------------- */
  /* 1. Authorization Enforcements Across Endpoints                             */
  /* -------------------------------------------------------------------------- */
  describe("1. Authorization Enforcements", () => {
    it("rejects unauthenticated requests with 401 across all endpoints", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      const resGet = await getNotifications(
        new NextRequest("http://localhost/api/admin/notifications")
      );
      expect(resGet.status).toBe(401);

      const resPost = await createNotification(
        new NextRequest("http://localhost/api/admin/notifications", {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        })
      );
      expect(resPost.status).toBe(401);

      const resGetById = await getNotificationById(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(resGetById.status).toBe(401);

      const resPatch = await patchNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "PATCH",
          body: JSON.stringify({ read: true }),
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(resPatch.status).toBe(401);

      const resDelete = await deleteNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(resDelete.status).toBe(401);

      const resReadAll = await markAllRead(
        new NextRequest("http://localhost/api/admin/notifications/read-all", {
          method: "POST",
        })
      );
      expect(resReadAll.status).toBe(401);
    });

    it("rejects non-admin roles with 403", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "Regular Member",
        role: "MEMBER" as any,
      });

      const res = await getNotifications(
        new NextRequest("http://localhost/api/admin/notifications")
      );
      expect(res.status).toBe(403);
    });

    it("authorizes both CCF_ADMIN and IT_ADMIN", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(itAdmin);
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(0);

      const res = await getNotifications(
        new NextRequest("http://localhost/api/admin/notifications")
      );
      expect(res.status).toBe(200);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. GET /api/admin/notifications (Listing, Filters & Query Validation)      */
  /* -------------------------------------------------------------------------- */
  describe("2. GET /api/admin/notifications", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(currentAdmin);
    });

    it("returns notifications visible to current admin with computed metrics", async () => {
      const mockItems = [
        {
          id: notifId,
          targetAdminId: null, // Global
          type: "SYSTEM_ALERT",
          title: "Registration Closing Soon",
          body: "Magnora'26 closes in 2 hours.",
          severity: NotificationSeverity.WARNING,
          readAt: null,
          createdAt: new Date("2026-09-08T10:00:00Z"),
          targetAdmin: null,
        },
        {
          id: "55555555-5555-5555-5555-555555555555",
          targetAdminId: currentAdmin.id, // Targeted to current admin
          type: "BROADCAST",
          title: "Payment Verified",
          body: "Payment verified by CCF Team.",
          severity: NotificationSeverity.SUCCESS,
          readAt: new Date("2026-09-08T11:00:00Z"),
          createdAt: new Date("2026-09-08T10:30:00Z"),
          targetAdmin: { id: currentAdmin.id, name: currentAdmin.name, email: currentAdmin.email },
        },
      ];

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockItems as any);
      vi.mocked(prisma.notification.count)
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(1) // unread
        .mockResolvedValueOnce(1) // warningsAndErrors
        .mockResolvedValueOnce(1); // global

      const res = await getNotifications(
        new NextRequest("http://localhost/api/admin/notifications")
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.notifications).toHaveLength(2);
      expect(data.metrics).toEqual({
        total: 2,
        unread: 1,
        warningsAndErrors: 1,
        global: 1,
      });

      // Verify base visibility enforced in findMany query
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                OR: [{ targetAdminId: null }, { targetAdminId: currentAdmin.id }],
              },
            ]),
          }),
        })
      );
    });

    it("supports filtering by severity, status, target, and search", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(0);

      const url =
        "http://localhost/api/admin/notifications?severity=WARNING&status=UNREAD&target=GLOBAL&search=capacity";
      const res = await getNotifications(new NextRequest(url));
      expect(res.status).toBe(200);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { severity: NotificationSeverity.WARNING },
              { readAt: null },
              { targetAdminId: null },
              expect.objectContaining({
                OR: expect.any(Array),
              }),
            ]),
          }),
        })
      );
    });

    it("rejects invalid severity query parameter (400)", async () => {
      const res = await getNotifications(
        new NextRequest("http://localhost/api/admin/notifications?severity=CRITICAL")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid query parameters.");
      expect(data.details?.severity).toBeDefined();
    });

    it("rejects invalid status query parameter (400)", async () => {
      const res = await getNotifications(
        new NextRequest("http://localhost/api/admin/notifications?status=ARCHIVED")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid query parameters.");
      expect(data.details?.status).toBeDefined();
    });

    it("rejects search parameter exceeding 100 characters (400)", async () => {
      const longSearch = "x".repeat(101);
      const res = await getNotifications(
        new NextRequest(`http://localhost/api/admin/notifications?search=${longSearch}`)
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid query parameters.");
      expect(data.details?.search).toBeDefined();
    });

    it("returns safe 500 when database throws an error", async () => {
      vi.mocked(prisma.notification.findMany).mockRejectedValue(new Error("DB timeout"));

      const res = await getNotifications(
        new NextRequest("http://localhost/api/admin/notifications")
      );
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Failed to retrieve notifications.");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. POST /api/admin/notifications (Create Broadcast / Targeted Alert)       */
  /* -------------------------------------------------------------------------- */
  describe("3. POST /api/admin/notifications", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(currentAdmin);
    });

    it("creates a global notification broadcast successfully (201)", async () => {
      const payload = {
        title: "Maintenance Notice",
        body: "Scheduled database backup at 2 AM UTC.",
        type: "BROADCAST",
        severity: "INFO",
        targetAdminId: null,
      };

      const createdRecord = {
        id: notifId,
        ...payload,
        readAt: null,
        createdAt: new Date(),
        targetAdmin: null,
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(createdRecord as any);

      const res = await createNotification(
        new NextRequest("http://localhost/api/admin/notifications", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.notification.id).toBe(notifId);

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Maintenance Notice",
            targetAdminId: null,
            severity: "INFO",
          }),
        })
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "NOTIFICATION_CREATED",
            entityType: "Notification",
            entityId: notifId,
          }),
        })
      );
    });

    it("creates a targeted notification when target admin exists and is active (201)", async () => {
      const payload = {
        title: "Action Required",
        body: "Please verify manual payment #12.",
        type: "PAYMENT_ALERT",
        severity: "WARNING",
        targetAdminId: otherAdminId,
      };

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: otherAdminId,
        email: "other@ccf.org",
        active: true,
      } as any);

      const createdRecord = {
        id: notifId,
        ...payload,
        readAt: null,
        createdAt: new Date(),
        targetAdmin: { id: otherAdminId, name: "Other", email: "other@ccf.org" },
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(createdRecord as any);

      const res = await createNotification(
        new NextRequest("http://localhost/api/admin/notifications", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
      expect(res.status).toBe(201);

      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { id: otherAdminId },
        select: expect.objectContaining({ active: true }),
      });
    });

    it("rejects targeted notification if target admin does not exist or is inactive (400)", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: otherAdminId,
        email: "inactive@ccf.org",
        active: false, // Inactive
      } as any);

      const res = await createNotification(
        new NextRequest("http://localhost/api/admin/notifications", {
          method: "POST",
          body: JSON.stringify({
            title: "Alert",
            body: "Content",
            type: "ALERT",
            severity: "INFO",
            targetAdminId: otherAdminId,
          }),
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("does not exist or is inactive");
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("rejects creation with missing title, body, or invalid severity (400)", async () => {
      const res = await createNotification(
        new NextRequest("http://localhost/api/admin/notifications", {
          method: "POST",
          body: JSON.stringify({
            title: "",
            body: "",
            type: "ALERT",
            severity: "INVALID_SEVERITY",
          }),
        })
      );
      expect(res.status).toBe(400);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. GET /api/admin/notifications/[id]                                       */
  /* -------------------------------------------------------------------------- */
  describe("4. GET /api/admin/notifications/[id]", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(currentAdmin);
    });

    it("rejects malformed UUID with 400", async () => {
      const res = await getNotificationById(
        new NextRequest("http://localhost/api/admin/notifications/not-a-uuid"),
        { params: Promise.resolve({ id: "not-a-uuid" }) }
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid notification ID format. Expected a valid UUID.");
    });

    it("returns 404 if notification does not exist", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue(null);

      const res = await getNotificationById(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 if notification is targeted to another administrator (isolation)", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        targetAdminId: otherAdminId, // Belongs to other admin
        title: "Private Peer Alert",
      } as any);

      const res = await getNotificationById(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 200 with notification details if global or targeted to current admin", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        targetAdminId: null, // Global
        title: "Global Alert",
      } as any);

      const res = await getNotificationById(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.notification.id).toBe(notifId);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. PATCH /api/admin/notifications/[id] (Read / Unread Toggle)              */
  /* -------------------------------------------------------------------------- */
  describe("5. PATCH /api/admin/notifications/[id]", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(currentAdmin);
    });

    it("rejects malformed UUID with 400", async () => {
      const res = await patchNotification(
        new NextRequest("http://localhost/api/admin/notifications/not-a-uuid", {
          method: "PATCH",
          body: JSON.stringify({ read: true }),
        }),
        { params: Promise.resolve({ id: "not-a-uuid" }) }
      );
      expect(res.status).toBe(400);
    });

    it("rejects payload missing 'read' boolean (400)", async () => {
      const res = await patchNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "PATCH",
          body: JSON.stringify({ read: "yes" }),
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 if notification belongs to another admin", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        targetAdminId: otherAdminId,
        readAt: null,
      } as any);

      const res = await patchNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "PATCH",
          body: JSON.stringify({ read: true }),
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(404);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it("marks unread notification as read and logs NOTIFICATION_READ (200)", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        targetAdminId: currentAdmin.id,
        title: "Task Assigned",
        readAt: null, // Currently unread
      } as any);

      vi.mocked(prisma.notification.update).mockResolvedValue({
        id: notifId,
        readAt: new Date(),
      } as any);

      const res = await patchNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "PATCH",
          body: JSON.stringify({ read: true }),
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(200);

      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: notifId },
          data: { readAt: expect.any(Date) },
        })
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "NOTIFICATION_READ",
            entityId: notifId,
          }),
        })
      );
    });

    it("marks read notification as unread and logs NOTIFICATION_UNREAD (200)", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        targetAdminId: null,
        title: "Global Alert",
        readAt: new Date("2026-09-08T10:00:00Z"), // Currently read
      } as any);

      vi.mocked(prisma.notification.update).mockResolvedValue({
        id: notifId,
        readAt: null,
      } as any);

      const res = await patchNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "PATCH",
          body: JSON.stringify({ read: false }),
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(200);

      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: notifId },
          data: { readAt: null },
        })
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "NOTIFICATION_UNREAD",
            entityId: notifId,
          }),
        })
      );
    });

    it("handles idempotent read-state update safely without duplicate writes (200)", async () => {
      const alreadyReadDate = new Date("2026-09-08T10:00:00Z");
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        targetAdminId: null,
        title: "Already Read",
        readAt: alreadyReadDate,
      } as any);

      const res = await patchNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "PATCH",
          body: JSON.stringify({ read: true }), // Already true
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(200);
      expect(prisma.notification.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. DELETE /api/admin/notifications/[id]                                    */
  /* -------------------------------------------------------------------------- */
  describe("6. DELETE /api/admin/notifications/[id]", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(currentAdmin);
    });

    it("rejects malformed UUID with 400", async () => {
      const res = await deleteNotification(
        new NextRequest("http://localhost/api/admin/notifications/not-a-uuid", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "not-a-uuid" }) }
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 if notification not found or belongs to another admin", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        targetAdminId: otherAdminId,
      } as any);

      const res = await deleteNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(404);
      expect(prisma.notification.delete).not.toHaveBeenCalled();
    });

    it("deletes visible notification and logs NOTIFICATION_DELETED (200)", async () => {
      vi.mocked(prisma.notification.findUnique).mockResolvedValue({
        id: notifId,
        title: "Obsolete Alert",
        type: "BROADCAST",
        targetAdminId: null,
      } as any);

      vi.mocked(prisma.notification.delete).mockResolvedValue({ id: notifId } as any);

      const res = await deleteNotification(
        new NextRequest(`http://localhost/api/admin/notifications/${notifId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: notifId }) }
      );
      expect(res.status).toBe(200);

      expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: notifId } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "NOTIFICATION_DELETED",
            entityId: notifId,
          }),
        })
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 7. POST /api/admin/notifications/read-all                                  */
  /* -------------------------------------------------------------------------- */
  describe("7. POST /api/admin/notifications/read-all", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(currentAdmin);
    });

    it("marks all visible unread notifications as read and writes audit log", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });

      const res = await markAllRead(
        new NextRequest("http://localhost/api/admin/notifications/read-all", {
          method: "POST",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(5);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                OR: [{ targetAdminId: null }, { targetAdminId: currentAdmin.id }],
              },
              { readAt: null },
            ]),
          }),
          data: { readAt: expect.any(Date) },
        })
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "NOTIFICATION_MARK_ALL_READ",
            metadata: { count: 5 },
          }),
        })
      );
    });

    it("safely handles 0 unread notifications without throwing", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 0 });

      const res = await markAllRead(
        new NextRequest("http://localhost/api/admin/notifications/read-all", {
          method: "POST",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(0);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
