import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { FormVersionStatus, toEventFieldDomain } from "@/lib/forms/types";
import { createAuditLog } from "@/lib/audit/log";

interface RouteContext {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * POST /api/admin/events/[id]/forms/[versionId]/publish
 * Publishes a DRAFT form version, making it immutable and setting it as the event's activeFormVersionId.
 * Any previously published form version for this event is transitioned to CLOSED.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: eventId, versionId } = await params;

    const formVersion = await prisma.formVersion.findFirst({
      where: { id: versionId, eventId },
      include: {
        eventFields: true,
      },
    });

    if (!formVersion) {
      return NextResponse.json(
        { error: "Form version not found", code: "FORM_VERSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (formVersion.status !== FormVersionStatus.DRAFT) {
      return NextResponse.json(
        {
          error: `Cannot publish form version with status ${formVersion.status}. Only DRAFT versions can be published.`,
          code: "INVALID_STATUS_TRANSITION",
        },
        { status: 400 }
      );
    }

    if (!formVersion.eventFields || formVersion.eventFields.length === 0) {
      return NextResponse.json(
        {
          error: "Cannot publish an empty form. Add at least one field before publishing.",
          code: "EMPTY_FORM_VERSION",
        },
        { status: 400 }
      );
    }

    // Atomic publish transaction
    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Transition any existing published versions of this event to CLOSED
      await tx.formVersion.updateMany({
        where: {
          eventId,
          status: FormVersionStatus.PUBLISHED,
        },
        data: {
          status: FormVersionStatus.CLOSED,
        },
      });

      // 2. Publish this version
      const published = await tx.formVersion.update({
        where: { id: versionId },
        data: {
          status: FormVersionStatus.PUBLISHED,
          publishedAt: now,
        },
        include: {
          eventFields: { orderBy: { displayOrder: "asc" } },
          createdByAdmin: { select: { id: true, name: true, email: true } },
        },
      });

      // 3. Update the event's activeFormVersionId
      await tx.event.update({
        where: { id: eventId },
        data: {
          activeFormVersionId: versionId,
        },
      });

      return published;
    });

    await createAuditLog({
      actorId: admin.id,
      action: "FORM_VERSION_PUBLISHED",
      entityType: "FormVersion",
      entityId: versionId,
      metadata: {
        eventId,
        versionNumber: formVersion.versionNumber,
        fieldCount: formVersion.eventFields.length,
      },
    });

    const mappedVersion = {
      id: updated.id,
      eventId: updated.eventId,
      versionNumber: updated.versionNumber,
      status: updated.status,
      publishedAt: updated.publishedAt,
      createdBy: updated.createdBy,
      createdByName: updated.createdByAdmin?.name || "",
      createdAt: updated.createdAt,
      isCurrentActive: true,
      fields: (updated.eventFields || []).map(toEventFieldDomain),
    };

    return NextResponse.json({
      ...mappedVersion,
      version: mappedVersion,
    });
  } catch (error) {
    console.error("[POST /api/admin/events/[id]/forms/[versionId]/publish] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
