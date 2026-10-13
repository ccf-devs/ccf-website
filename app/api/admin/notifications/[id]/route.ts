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
        receipts: {
          where: { adminId: admin.id },
          select: { readAt: true },
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

    const adminReceipt = notification.receipts?.[0];
    const effectiveReadAt = adminReceipt
      ? typeof adminReceipt.readAt === "string"
        ? adminReceipt.readAt
        : adminReceipt.readAt.toISOString()
      : notification.targetAdminId === admin.id && notification.readAt
      ? typeof notification.readAt === "string"
        ? notification.readAt
        : notification.readAt.toISOString()
      : null;

    const createdAtIso = notification.createdAt
      ? typeof notification.createdAt === "string"
        ? notification.createdAt
        : notification.createdAt.toISOString()
      : new Date().toISOString();

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        targetAdminId: notification.targetAdminId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        severity: notification.severity,
        readAt: effectiveReadAt,
        createdAt: createdAtIso,
        targetAdmin: notification.targetAdmin,
      },
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
        receipts: {
          where: { adminId: admin.id },
          select: {
            id: true,
            readAt: true,
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

    const existingReceipt = existing.receipts?.[0];
    const isCurrentlyRead = Boolean(
      existingReceipt ||
        (existing.targetAdminId === admin.id && existing.readAt !== null)
    );
    const shouldBeRead = validated.read;

    // Idempotent: if already in the desired state, return without redundant writes
    if (isCurrentlyRead === shouldBeRead) {
      const currentReadAt = existingReceipt
        ? typeof existingReceipt.readAt === "string"
          ? existingReceipt.readAt
          : existingReceipt.readAt.toISOString()
        : existing.targetAdminId === admin.id && existing.readAt
        ? typeof existing.readAt === "string"
          ? existing.readAt
          : existing.readAt.toISOString()
        : null;

      const createdAtIso = existing.createdAt
        ? typeof existing.createdAt === "string"
          ? existing.createdAt
          : existing.createdAt.toISOString()
        : new Date().toISOString();

      return NextResponse.json({
        success: true,
        notification: {
          id: existing.id,
          targetAdminId: existing.targetAdminId,
          type: existing.type,
          title: existing.title,
          body: existing.body,
          severity: existing.severity,
          readAt: currentReadAt,
          createdAt: createdAtIso,
          targetAdmin: existing.targetAdmin,
        },
      });
    }

    let updatedReadAt: Date | null = null;

    if (shouldBeRead) {
      const now = new Date();
      const receipt = await prisma.notificationReceipt.upsert({
        where: {
          notificationId_adminId: {
            notificationId: id,
            adminId: admin.id,
          },
        },
        create: {
          notificationId: id,
          adminId: admin.id,
          readAt: now,
        },
        update: {
          readAt: now,
        },
      });
      updatedReadAt = receipt.readAt;

      if (existing.targetAdminId === admin.id) {
        await prisma.notification.update({
          where: { id },
          data: { readAt: now },
        });
      }
    } else {
      await prisma.notificationReceipt.deleteMany({
        where: {
          notificationId: id,
          adminId: admin.id,
        },
      });
      updatedReadAt = null;

      if (existing.targetAdminId === admin.id) {
        await prisma.notification.update({
          where: { id },
          data: { readAt: null },
        });
      }
    }

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

    const createdAtIso = existing.createdAt
      ? typeof existing.createdAt === "string"
        ? existing.createdAt
        : existing.createdAt.toISOString()
      : new Date().toISOString();

    const readAtIso = updatedReadAt
      ? typeof updatedReadAt === "string"
        ? updatedReadAt
        : updatedReadAt.toISOString()
      : null;

    return NextResponse.json({
      success: true,
      notification: {
        id: existing.id,
        targetAdminId: existing.targetAdminId,
        type: existing.type,
        title: existing.title,
        body: existing.body,
        severity: existing.severity,
        readAt: readAtIso,
        createdAt: createdAtIso,
        targetAdmin: existing.targetAdmin,
      },
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

    // Shared global notifications can strictly only be permanently deleted by CCF_ADMIN
    if (existing.targetAdminId === null && admin.role !== AdminRole.CCF_ADMIN) {
      return NextResponse.json(
        {
          error:
            "Insufficient permissions. Only CCF_ADMIN can delete global notifications.",
        },
        { status: 403 }
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
