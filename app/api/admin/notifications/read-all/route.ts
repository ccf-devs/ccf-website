import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { createAuditLog, NOTIFICATION_AUDIT_ACTIONS } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/notifications/read-all
 * Marks all unread notifications visible to the current admin as read.
 * Scoped strictly to:
 * - Global notifications (targetAdminId = null)
 * - Current admin's targeted notifications (targetAdminId = currentAdmin.id)
 * Never affects another admin's private notifications.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
    return NextResponse.json(
      { error: "Insufficient permissions." },
      { status: 403 }
    );
  }

  try {
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        AND: [
          {
            OR: [
              { targetAdminId: null },
              { targetAdminId: admin.id },
            ],
          },
          {
            receipts: { none: { adminId: admin.id } },
          },
          {
            NOT: {
              targetAdminId: admin.id,
              NOT: { readAt: null },
            },
          },
        ],
      },
      select: {
        id: true,
        targetAdminId: true,
      },
    });

    const count = unreadNotifications.length;

    if (count > 0) {
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.notificationReceipt.createMany({
          data: unreadNotifications.map((n) => ({
            notificationId: n.id,
            adminId: admin.id,
            readAt: now,
          })),
          skipDuplicates: true,
        });

        const targetedIds = unreadNotifications
          .filter((n) => n.targetAdminId === admin.id)
          .map((n) => n.id);

        if (targetedIds.length > 0) {
          await tx.notification.updateMany({
            where: { id: { in: targetedIds } },
            data: { readAt: now },
          });
        }
      });

      await createAuditLog({
        actorId: admin.id,
        action: NOTIFICATION_AUDIT_ACTIONS.MARK_ALL_READ,
        entityType: "Notification",
        entityId: null,
        metadata: {
          count,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count,
      message: `Marked ${count} notification(s) as read.`,
    });
  } catch (error) {
    console.error("[POST /api/admin/notifications/read-all] Error:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read." },
      { status: 500 }
    );
  }
}
