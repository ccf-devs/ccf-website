import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { FormVersionStatus, toEventFieldDomain } from "@/lib/forms/types";
import { createAuditLog } from "@/lib/audit/log";

interface RouteContext {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * GET /api/admin/events/[id]/forms/[versionId]
 * Fetches a single form version with its fields ordered by displayOrder.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: eventId, versionId } = await params;

    const formVersion = await prisma.formVersion.findFirst({
      where: { id: versionId, eventId },
      include: {
        event: {
          select: { id: true, name: true, slug: true, activeFormVersionId: true },
        },
        createdByAdmin: {
          select: { id: true, name: true, email: true },
        },
        eventFields: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!formVersion) {
      return NextResponse.json(
        { error: "Form version not found", code: "FORM_VERSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isCurrentActive = formVersion.id === formVersion.event.activeFormVersionId;

    return NextResponse.json({
      version: {
        id: formVersion.id,
        eventId: formVersion.eventId,
        versionNumber: formVersion.versionNumber,
        status: formVersion.status,
        publishedAt: formVersion.publishedAt,
        createdBy: formVersion.createdBy,
        createdByName: formVersion.createdByAdmin.name,
        createdAt: formVersion.createdAt,
        registrationCount: formVersion._count.registrations,
        isCurrentActive,
        fields: formVersion.eventFields.map(toEventFieldDomain),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/events/[id]/forms/[versionId]] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/events/[id]/forms/[versionId]
 * Deletes a form version ONLY if it is in DRAFT status.
 * Rejects deletion of PUBLISHED or CLOSED versions with FORM_VERSION_IMMUTABLE.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: eventId, versionId } = await params;

    const formVersion = await prisma.formVersion.findFirst({
      where: { id: versionId, eventId },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    if (!formVersion) {
      return NextResponse.json(
        { error: "Form version not found", code: "FORM_VERSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (formVersion.status === FormVersionStatus.PUBLISHED || formVersion.status === FormVersionStatus.CLOSED) {
      return NextResponse.json(
        {
          error: "Published form versions are immutable and cannot be deleted",
          code: "FORM_VERSION_IMMUTABLE",
        },
        { status: 409 }
      );
    }

    if (formVersion._count.registrations > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete form version with active registrations",
          code: "FORM_VERSION_IMMUTABLE",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete child fields first
      await tx.eventField.deleteMany({
        where: { formVersionId: versionId },
      });

      await tx.formVersion.delete({
        where: { id: versionId },
      });
    });

    await createAuditLog({
      actorId: admin.id,
      action: "FORM_VERSION_DELETED",
      entityType: "FormVersion",
      entityId: versionId,
      metadata: {
        eventId,
        versionNumber: formVersion.versionNumber,
      },
    });

    return NextResponse.json({ success: true, message: "Draft form version deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/admin/events/[id]/forms/[versionId]] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
