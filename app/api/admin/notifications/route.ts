import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, NotificationSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  notificationQuerySchema,
  createNotificationSchema,
} from "@/lib/notifications/validation";
import { createAuditLog, NOTIFICATION_AUDIT_ACTIONS } from "@/lib/audit/log";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notifications
 * Retrieves notifications visible to the current authenticated admin.
 * Includes global alerts (targetAdminId = null) and alerts targeted to current admin.
 * Computes aggregated operational metrics.
 */
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const parsedQuery = notificationQuerySchema.safeParse({
    severity: searchParams.get("severity") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    target: searchParams.get("target") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters.",
        details: parsedQuery.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { severity, status, target, search } = parsedQuery.data;

  // Base visibility: notifications visible to the current admin
  const baseVisibility: Prisma.NotificationWhereInput = {
    OR: [{ targetAdminId: null }, { targetAdminId: admin.id }],
  };

  const andConditions: Prisma.NotificationWhereInput[] = [baseVisibility];

  if (severity && severity !== "ALL") {
    andConditions.push({ severity: severity as NotificationSeverity });
  }

  if (status === "UNREAD") {
    andConditions.push({ readAt: null });
  } else if (status === "READ") {
    andConditions.push({ NOT: { readAt: null } });
  }

  if (target === "GLOBAL") {
    andConditions.push({ targetAdminId: null });
  } else if (target === "TARGETED") {
    andConditions.push({ targetAdminId: admin.id });
  }

  if (search && search.trim()) {
    const q = search.trim();
    andConditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.NotificationWhereInput = {
    AND: andConditions,
  };

  try {
    const [notifications, total, unread, warningsAndErrors, globalCount] =
      await Promise.all([
        prisma.notification.findMany({
          where,
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
        prisma.notification.count({ where: baseVisibility }),
        prisma.notification.count({
          where: {
            AND: [baseVisibility, { readAt: null }],
          },
        }),
        prisma.notification.count({
          where: {
            AND: [
              baseVisibility,
              {
                severity: {
                  in: [
                    NotificationSeverity.WARNING,
                    NotificationSeverity.ERROR,
                  ],
                },
              },
            ],
          },
        }),
        prisma.notification.count({
          where: { targetAdminId: null },
        }),
      ]);

    return NextResponse.json({
      success: true,
      notifications,
      metrics: {
        total,
        unread,
        warningsAndErrors,
        global: globalCount,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/notifications] Database error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve notifications." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notifications
 * Creates a global broadcast or targeted administrative notification.
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const validated = createNotificationSchema.parse(body);

    let targetAdminEmail: string | null = null;
    const targetId =
      validated.targetAdminId && validated.targetAdminId.trim() !== ""
        ? validated.targetAdminId.trim()
        : null;

    if (targetId) {
      const targetAdmin = await prisma.adminUser.findUnique({
        where: { id: targetId },
        select: { id: true, email: true, active: true },
      });

      if (!targetAdmin || !targetAdmin.active) {
        return NextResponse.json(
          {
            error: "The targeted administrator does not exist or is inactive.",
          },
          { status: 400 }
        );
      }
      targetAdminEmail = targetAdmin.email;
    }

    const notification = await prisma.notification.create({
      data: {
        title: validated.title,
        body: validated.body,
        type: validated.type,
        severity: validated.severity,
        targetAdminId: targetId,
      },
      include: {
        targetAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await createAuditLog({
      actorId: admin.id,
      action: NOTIFICATION_AUDIT_ACTIONS.CREATED,
      entityType: "Notification",
      entityId: notification.id,
      metadata: {
        notificationId: notification.id,
        title: notification.title,
        type: notification.type,
        severity: notification.severity,
        targetAdminId: notification.targetAdminId,
        targetAdminEmail,
      },
    });

    return NextResponse.json(
      {
        success: true,
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.errors[0]?.message || "Validation failed.",
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to create notification." },
      { status: 500 }
    );
  }
}
