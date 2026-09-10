import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  AdminShell,
  AdminPageHeader,
  DashboardErrorState,
} from "@/components/admin";
import {
  NotificationManagementConsole,
  NotificationItem,
  AdminUserOption,
  NotificationMetrics,
} from "@/components/admin/notifications";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications — CCF Admin",
  description:
    "System alerts, operational updates, and broadcast communications for Crescent Club of Finance.",
};

export default async function AdminNotificationsPage() {
  const admin = await getCurrentAdmin();

  if (
    !admin ||
    (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN)
  ) {
    redirect("/admin/auth/login?callbackUrl=/admin/notifications");
    return null;
  }

  let notifications: NotificationItem[] = [];
  let activeAdmins: AdminUserOption[] = [];
  let metrics: NotificationMetrics = {
    total: 0,
    unread: 0,
    warningsAndErrors: 0,
    global: 0,
  };
  let isError = false;

  try {
    const baseVisibility: Prisma.NotificationWhereInput = {
      OR: [{ targetAdminId: null }, { targetAdminId: admin.id }],
    };

    const [rawNotifications, rawAdmins] = await Promise.all([
      prisma.notification.findMany({
        where: baseVisibility,
        include: {
          targetAdmin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.adminUser.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    notifications = rawNotifications.map((n) => ({
      id: n.id,
      targetAdminId: n.targetAdminId,
      type: n.type,
      title: n.title,
      body: n.body,
      severity: n.severity,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      targetAdmin: n.targetAdmin,
    }));

    activeAdmins = rawAdmins;

    const total = notifications.length;
    const unread = notifications.filter((n) => n.readAt === null).length;
    const warningsAndErrors = notifications.filter(
      (n) => n.severity === "WARNING" || n.severity === "ERROR"
    ).length;
    const globalCount = notifications.filter(
      (n) => n.targetAdminId === null
    ).length;

    metrics = {
      total,
      unread,
      warningsAndErrors,
      global: globalCount,
    };
  } catch (error) {
    console.error("[AdminNotificationsPage] Failed to load notifications:", error);
    isError = true;
  }

  return (
    <AdminShell user={admin}>
      <AdminPageHeader
        eyebrow="System"
        title="Notifications"
        description="Monitor system alerts, review operational warnings, and broadcast updates to administrators."
      />

      {isError ? (
        <DashboardErrorState
          error="Live operational data is temporarily unavailable."
          retryUrl="/admin/notifications"
          backUrl="/admin/dashboard"
          backLabel="Return to Dashboard"
        />
      ) : (
        <NotificationManagementConsole
          initialNotifications={notifications}
          activeAdmins={activeAdmins}
          initialMetrics={metrics}
          currentAdminId={admin.id}
        />
      )}
    </AdminShell>
  );
}
