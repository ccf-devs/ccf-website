import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { FormVersionCreateSchema } from "@/lib/forms/validation";
import { FormVersionStatus, toEventFieldDomain } from "@/lib/forms/types";
import { createAuditLog } from "@/lib/audit/log";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/events/[id]/forms
 * Lists all form versions for a given event.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, activeFormVersionId: true, registrationMode: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found", code: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const formVersions = await prisma.formVersion.findMany({
      where: { eventId },
      orderBy: { versionNumber: "desc" },
      include: {
        createdByAdmin: {
          select: { id: true, name: true, email: true },
        },
        eventFields: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { registrations: true, eventFields: true },
        },
      },
    });

    const versions = formVersions.map((fv) => ({
      id: fv.id,
      eventId: fv.eventId,
      versionNumber: fv.versionNumber,
      status: fv.status,
      publishedAt: fv.publishedAt,
      createdBy: fv.createdBy,
      createdByName: fv.createdByAdmin?.name || "",
      createdAt: fv.createdAt,
      fieldCount: fv._count?.eventFields ?? (fv as any)._count?.fields ?? 0,
      fieldsCount: fv._count?.eventFields ?? (fv as any)._count?.fields ?? 0,
      registrationCount: fv._count?.registrations ?? 0,
      isCurrentActive: fv.id === event.activeFormVersionId,
      fields: (fv.eventFields || (fv as any).fields || []).map(toEventFieldDomain),
    }));

    return NextResponse.json(versions);
  } catch (error) {
    console.error("[GET /api/admin/events/[id]/forms] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/events/[id]/forms
 * Creates a new DRAFT form version.
 * Optionally clones fields from an existing version if cloneFromVersionId is provided.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, registrationMode: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found", code: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const parseResult = FormVersionCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid form version input", details: parseResult.error.flatten(), code: "INVALID_FIELD" },
        { status: 400 }
      );
    }

    const { cloneFromVersionId } = parseResult.data;

    // Transactionally create next draft version
    const newVersion = await prisma.$transaction(async (tx) => {
      // Get highest version number for this event
      const latest = await tx.formVersion.findFirst({
        where: { eventId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      const nextVersionNumber = (latest?.versionNumber || 0) + 1;

      // Create new draft version
      const createdVersion = await tx.formVersion.create({
        data: {
          eventId,
          versionNumber: nextVersionNumber,
          status: FormVersionStatus.DRAFT,
          createdBy: admin.id,
        },
      });

      // If cloning from an existing version, copy all its fields
      if (cloneFromVersionId) {
        const sourceFields = await tx.eventField.findMany({
          where: { formVersionId: cloneFromVersionId },
          orderBy: { displayOrder: "asc" },
        });

        if (sourceFields.length > 0) {
          await tx.eventField.createMany({
            data: sourceFields.map((f) => ({
              formVersionId: createdVersion.id,
              key: f.key,
              label: f.label,
              type: f.type,
              fieldScope: f.fieldScope,
              required: f.required,
              config: f.config as any,
              validation: f.validation as any,
              conditionalLogic: f.conditionalLogic as any,
              displayOrder: f.displayOrder,
            })),
          });
        }
      }

      return createdVersion;
    });

    await createAuditLog({
      actorId: admin.id,
      action: "FORM_VERSION_CREATED",
      entityType: "FormVersion",
      entityId: newVersion.id,
      metadata: {
        eventId,
        versionNumber: newVersion.versionNumber,
        clonedFrom: cloneFromVersionId || null,
      },
    });

    const fullVersion = await prisma.formVersion.findUnique({
      where: { id: newVersion.id },
      include: {
        eventFields: { orderBy: { displayOrder: "asc" } },
        createdByAdmin: { select: { id: true, name: true, email: true } },
      },
    });

    const mappedVersion = {
      ...fullVersion,
      id: fullVersion?.id ?? newVersion.id,
      eventId: fullVersion?.eventId ?? newVersion.eventId,
      versionNumber: fullVersion?.versionNumber ?? newVersion.versionNumber,
      status: fullVersion?.status ?? newVersion.status,
      fields: (fullVersion?.eventFields || (fullVersion as any)?.fields || []).map(toEventFieldDomain),
    };

    return NextResponse.json(
      {
        ...mappedVersion,
        version: mappedVersion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/events/[id]/forms] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
