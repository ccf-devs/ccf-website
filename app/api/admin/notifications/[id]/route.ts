import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  notificationIdSchema,
  updateNotificationReadSchema,
} from "@/lib/notifications/validation";
import { createAuditLog, NOTIFICATION_AUDIT_ACTIONS } from "@/lib/audit/log";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/notifications/[id]
 * Retrieves a single notification.
 * Strictly prevents exposing another admin's targeted notifications.
 */
export async function GET(req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;
  const idParsed = notificationIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { error: "Invalid notification ID format. Expected a valid UUID." },
      { status: 400 }
    );
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id },
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

    // Enforce visibility: must be global or targeted to the current admin
    if (
      !notification ||
      (notification.targetAdminId !== null &&
        notification.targetAdminId !== admin.id)
    ) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(`[GET /api/admin/notifications/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve notification." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/notifications/[id]
 * Updates read status (marks as read or unread).
 * Idempotent: safe if already in requested state.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;
  const idParsed = notificationIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { error: "Invalid notification ID format. Expected a valid UUID." },
      { status: 400 }
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

    const validated = updateNotificationReadSchema.parse(body);

    const existing = await prisma.notification.findUnique({
      where: { id },
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

    // Enforce visibility and isolation
    if (
      !existing ||
      (existing.targetAdminId !== null &&
        existing.targetAdminId !== admin.id)
    ) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    const isCurrentlyRead = existing.readAt !== null;
    const shouldBeRead = validated.read;

    // Idempotent: if already in the desired state, return without redundant writes
    if (isCurrentlyRead === shouldBeRead) {
      return NextResponse.json({
        success: true,
        notification: existing,
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        readAt: shouldBeRead ? new Date() : null,
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
      action: shouldBeRead
        ? NOTIFICATION_AUDIT_ACTIONS.READ
        : NOTIFICATION_AUDIT_ACTIONS.UNREAD,
      entityType: "Notification",
      entityId: id,
      metadata: {
        notificationId: id,
        title: existing.title,
        read: shouldBeRead,
      },
    });

    return NextResponse.json({
      success: true,
      notification: updated,
    });
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

    console.error(`[PATCH /api/admin/notifications/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update notification." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notifications/[id]
 * Deletes a notification.
 * Disallows deleting another admin's private notification.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;
  const idParsed = notificationIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { error: "Invalid notification ID format. Expected a valid UUID." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        targetAdminId: true,
      },
    });

    // Enforce visibility: only global or targeted to current admin can be deleted through this endpoint
    if (
      !existing ||
      (existing.targetAdminId !== null &&
        existing.targetAdminId !== admin.id)
    ) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id },
    });

    await createAuditLog({
      actorId: admin.id,
      action: NOTIFICATION_AUDIT_ACTIONS.DELETED,
      entityType: "Notification",
      entityId: id,
      metadata: {
        notificationId: id,
        title: existing.title,
        type: existing.type,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error(`[DELETE /api/admin/notifications/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to delete notification." },
      { status: 500 }
    );
  }
}
