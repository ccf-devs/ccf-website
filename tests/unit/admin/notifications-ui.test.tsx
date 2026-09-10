import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminRole } from "@prisma/client";
import AdminNotificationsPage from "@/app/admin/notifications/page";
import {
  NotificationManagementConsole,
  NotificationItem,
  AdminUserOption,
  NotificationMetrics,
  isNotificationVisibleToAdmin,
  resolveCreatedNotificationList,
} from "@/components/admin/notifications";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/notifications",
  redirect: (url: string) => mockRedirect(url),
}));

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
    },
    adminUser: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Notifications UI Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  const sampleAdmins: AdminUserOption[] = [
    {
      id: "admin-uuid-1",
      name: "CCF Devs",
      email: "developers.ccf@gmail.com",
      role: "CCF_ADMIN",
    },
    {
      id: "admin-uuid-2",
      name: "IT Admin",
      email: "it@ccf.org",
      role: "IT_ADMIN",
    },
  ];

  const sampleNotifications: NotificationItem[] = [
    {
      id: "notif-uuid-1",
      targetAdminId: null,
      type: "SYSTEM_ALERT",
      title: "Neon compute scale alert",
      body: "Database compute scaled to 2 CU during stock pitch.",
      severity: "WARNING",
      readAt: null,
      createdAt: "2026-09-10T10:00:00.000Z",
      targetAdmin: null,
    },
    {
      id: "notif-uuid-2",
      targetAdminId: "admin-uuid-1",
      type: "ACCOUNT",
      title: "Direct Admin Dispatch",
      body: "Please verify participant manual payments.",
      severity: "INFO",
      readAt: "2026-09-10T11:00:00.000Z",
      createdAt: "2026-09-10T09:00:00.000Z",
      targetAdmin: {
        id: "admin-uuid-1",
        name: "CCF Devs",
        email: "developers.ccf@gmail.com",
      },
    },
  ];

  const sampleMetrics: NotificationMetrics = {
    total: 2,
    unread: 1,
    warningsAndErrors: 1,
    global: 1,
  };

  /* -------------------------------------------------------------------------- */
  /* 1. Page Component Authorization & Database States                           */
  /* -------------------------------------------------------------------------- */
  describe("1. Page Component Authorization & States", () => {
    it("redirects unauthenticated user to login with callbackUrl", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      await AdminNotificationsPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/notifications"
      );
    });

    it("redirects unauthorized non-admin role to login", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as unknown as AdminRole,
      });

      await AdminNotificationsPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/notifications"
      );
    });

    it("renders page for authorized CCF_ADMIN and queries Prisma", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.notification.findMany).mockResolvedValue(
        sampleNotifications.map((n) => ({
          ...n,
          readAt: n.readAt ? new Date(n.readAt) : null,
          createdAt: new Date(n.createdAt),
        })) as any
      );
      vi.mocked(prisma.adminUser.findMany).mockResolvedValue(sampleAdmins as any);

      const element = await AdminNotificationsPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(html).toContain("Notifications");
      expect(html).toContain("Neon compute scale alert");
      expect(html).toContain("Direct Admin Dispatch");
    });

    it("renders page for authorized IT_ADMIN", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "admin-uuid-2",
        email: "it@ccf.org",
        name: "IT Admin",
        role: AdminRole.IT_ADMIN,
      });
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.adminUser.findMany).mockResolvedValue([]);

      const element = await AdminNotificationsPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(html).toContain("Notifications");
    });

    it("fails closed with operational error state when database read throws", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.notification.findMany).mockRejectedValue(
        new Error("Neon connection pool exhausted")
      );

      const element = await AdminNotificationsPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      // Verifies fail closed message
      expect(html).toContain("Live operational data is temporarily unavailable.");
      expect(html).toContain("Operational Data Temporarily Unavailable");
      // Must NOT render notification items or empty state
      expect(html).not.toContain("No Notifications Yet");
      // Must NOT expose raw Prisma/DB error
      expect(html).not.toContain("Neon connection pool exhausted");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. NotificationManagementConsole Component                                 */
  /* -------------------------------------------------------------------------- */
  describe("2. NotificationManagementConsole Component", () => {
    it("renders metrics counters and notification items in initial view", () => {
      const html = renderToStaticMarkup(
        <NotificationManagementConsole
          initialNotifications={sampleNotifications}
          activeAdmins={sampleAdmins}
          initialMetrics={sampleMetrics}
          currentAdminId="admin-uuid-1"
        />
      );

      // Metrics cards
      expect(html).toContain("Total Alerts");
      expect(html).toContain("Unread");
      expect(html).toContain("Warnings &amp; Errors");
      expect(html).toContain("Global Alerts");

      // Notification item 1 (Global, Warning)
      expect(html).toContain("Neon compute scale alert");
      expect(html).toContain("SYSTEM_ALERT");
      expect(html).toContain("Warning");
      expect(html).toContain("Global");

      // Notification item 2 (Direct, Info)
      expect(html).toContain("Direct Admin Dispatch");
      expect(html).toContain("ACCOUNT");
      expect(html).toContain("Info");
      expect(html).toContain("You");
    });

    it("renders empty state when 0 notifications exist in administrative feed", () => {
      const emptyMetrics: NotificationMetrics = {
        total: 0,
        unread: 0,
        warningsAndErrors: 0,
        global: 0,
      };

      const html = renderToStaticMarkup(
        <NotificationManagementConsole
          initialNotifications={[]}
          activeAdmins={sampleAdmins}
          initialMetrics={emptyMetrics}
          currentAdminId="admin-uuid-1"
        />
      );

      expect(html).toContain("No Notifications Yet");
      expect(html).toContain("Create First Alert");
      expect(html).toContain("Your administrative feed is clear.");
    });

    it("renders action buttons including New Notification, Mark All Read, and Search", () => {
      const html = renderToStaticMarkup(
        <NotificationManagementConsole
          initialNotifications={sampleNotifications}
          activeAdmins={sampleAdmins}
          initialMetrics={sampleMetrics}
          currentAdminId="admin-uuid-1"
        />
      );

      expect(html).toContain("New Notification");
      expect(html).toContain("Mark All Read");
      expect(html).toContain("Search by title, body, or type...");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Client Notification Isolation & Creation Regression Tests               */
  /* -------------------------------------------------------------------------- */
  describe("3. Client Notification Isolation & Creation Regression Tests", () => {
    const currentAdminId = "admin-uuid-1";
    const otherAdminId = "admin-uuid-2";

    const baseList: NotificationItem[] = [
      {
        id: "base-notif-1",
        targetAdminId: null,
        type: "SYSTEM_ALERT",
        title: "Base Global Alert",
        body: "Standard operational notice.",
        severity: "INFO",
        readAt: null,
        createdAt: "2026-09-10T08:00:00.000Z",
        targetAdmin: null,
      },
    ];

    it("1. Creating a global notification adds it to the current list", () => {
      const newGlobalNotif: NotificationItem = {
        id: "new-global-1",
        targetAdminId: null,
        type: "BROADCAST",
        title: "New Global Broadcast Alert",
        body: "All administrators should review this.",
        severity: "INFO",
        readAt: null,
        createdAt: "2026-09-10T11:30:00.000Z",
        targetAdmin: null,
      };

      expect(isNotificationVisibleToAdmin(null, currentAdminId)).toBe(true);

      const updated = resolveCreatedNotificationList(
        baseList,
        newGlobalNotif,
        currentAdminId
      );

      expect(updated).toHaveLength(2);
      expect(updated[0].id).toBe("new-global-1");
      expect(updated[0].title).toBe("New Global Broadcast Alert");
    });

    it("2. Creating a notification targeted to currentAdminId adds it to the current list", () => {
      const newSelfNotif: NotificationItem = {
        id: "new-self-1",
        targetAdminId: currentAdminId,
        type: "ACCOUNT",
        title: "Self-Targeted Urgent Alert",
        body: "This is addressed specifically to me.",
        severity: "WARNING",
        readAt: null,
        createdAt: "2026-09-10T11:35:00.000Z",
        targetAdmin: {
          id: currentAdminId,
          name: "CCF Devs",
          email: "developers.ccf@gmail.com",
        },
      };

      expect(isNotificationVisibleToAdmin(currentAdminId, currentAdminId)).toBe(
        true
      );

      const updated = resolveCreatedNotificationList(
        baseList,
        newSelfNotif,
        currentAdminId
      );

      expect(updated).toHaveLength(2);
      expect(updated[0].id).toBe("new-self-1");
      expect(updated[0].title).toBe("Self-Targeted Urgent Alert");
    });

    it("3. Creating a notification targeted to another admin does NOT add it to the current list", () => {
      const newOtherNotif: NotificationItem = {
        id: "new-other-1",
        targetAdminId: otherAdminId,
        type: "DIRECT_MESSAGE",
        title: "Confidential Alert for Kaleem",
        body: "Private administrative note intended only for Kaleem.",
        severity: "ERROR",
        readAt: null,
        createdAt: "2026-09-10T11:40:00.000Z",
        targetAdmin: {
          id: otherAdminId,
          name: "IT Admin",
          email: "it@ccf.org",
        },
      };

      expect(isNotificationVisibleToAdmin(otherAdminId, currentAdminId)).toBe(
        false
      );

      const updated = resolveCreatedNotificationList(
        baseList,
        newOtherNotif,
        currentAdminId
      );

      // List must remain unchanged (length 1, exactly baseList)
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe("base-notif-1");
      expect(updated.find((n) => n.id === "new-other-1")).toBeUndefined();
    });

    it("4. The UI does not render another admin's targeted notification after that creation", () => {
      const newOtherNotif: NotificationItem = {
        id: "new-other-1",
        targetAdminId: otherAdminId,
        type: "DIRECT_MESSAGE",
        title: "Confidential Alert for Kaleem",
        body: "Private administrative note intended only for Kaleem.",
        severity: "ERROR",
        readAt: null,
        createdAt: "2026-09-10T11:40:00.000Z",
        targetAdmin: {
          id: otherAdminId,
          name: "IT Admin",
          email: "it@ccf.org",
        },
      };

      // Case 4a: Client receives creation result and resolves list
      const updatedList = resolveCreatedNotificationList(
        baseList,
        newOtherNotif,
        currentAdminId
      );

      const html = renderToStaticMarkup(
        <NotificationManagementConsole
          initialNotifications={updatedList}
          activeAdmins={sampleAdmins}
          initialMetrics={{
            total: updatedList.length,
            unread: 1,
            warningsAndErrors: 0,
            global: 1,
          }}
          currentAdminId={currentAdminId}
        />
      );

      // Must NOT render another admin's notification title, body, or name
      expect(html).not.toContain("Confidential Alert for Kaleem");
      expect(html).not.toContain("Private administrative note intended only for Kaleem.");

      // Case 4b: Defense in depth - even if another admin's notification was passed in props,
      // filteredNotifications strictly prevents rendering it
      const defenseHtml = renderToStaticMarkup(
        <NotificationManagementConsole
          initialNotifications={[...baseList, newOtherNotif]}
          activeAdmins={sampleAdmins}
          initialMetrics={{
            total: 1,
            unread: 1,
            warningsAndErrors: 0,
            global: 1,
          }}
          currentAdminId={currentAdminId}
        />
      );

      expect(defenseHtml).not.toContain("Confidential Alert for Kaleem");
      expect(defenseHtml).not.toContain("Private administrative note intended only for Kaleem.");
    });

    it("5. Existing notification creation behavior remains intact", () => {
      const newGlobalNotif: NotificationItem = {
        id: "new-global-2",
        targetAdminId: null,
        type: "ANNOUNCEMENT",
        title: "General Annual Assembly Scheduled",
        body: "Mark your calendars for the general assembly.",
        severity: "SUCCESS",
        readAt: null,
        createdAt: "2026-09-10T11:45:00.000Z",
        targetAdmin: null,
      };

      const updatedList = resolveCreatedNotificationList(
        baseList,
        newGlobalNotif,
        currentAdminId
      );

      const html = renderToStaticMarkup(
        <NotificationManagementConsole
          initialNotifications={updatedList}
          activeAdmins={sampleAdmins}
          initialMetrics={{
            total: 2,
            unread: 2,
            warningsAndErrors: 0,
            global: 2,
          }}
          currentAdminId={currentAdminId}
        />
      );

      expect(html).toContain("General Annual Assembly Scheduled");
      expect(html).toContain("Global");
      expect(html).toContain("Success");
      expect(html).toContain("ANNOUNCEMENT");
    });
  });
});
