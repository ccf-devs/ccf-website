import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { FieldReorderSchema } from "@/lib/forms/validation";
import { FormVersionStatus, toEventFieldDomain } from "@/lib/forms/types";
import { createAuditLog } from "@/lib/audit/log";

interface RouteContext {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * POST /api/admin/events/[id]/forms/[versionId]/reorder
 * Batch updates displayOrder for fields in a DRAFT form version.
 * Rejects with FORM_VERSION_IMMUTABLE if the form version is already published.
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
          error: "Published form versions are immutable. Create a new draft version to reorder fields.",
          code: "FORM_VERSION_IMMUTABLE",
        },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    const parseResult = FieldReorderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid reorder input",
          details: parseResult.error.flatten(),
          code: "INVALID_FIELD_REORDER",
        },
        { status: 400 }
      );
    }

    const { fields } = parseResult.data;

    // Fetch existing fields belonging to this form version
    const existingFields = await prisma.eventField.findMany({
      where: { formVersionId: versionId },
      select: { id: true },
    });
    const existingFieldIds = new Set(existingFields.map((f) => f.id));

    // Verify all submitted field IDs belong to the target form version (reject cross-version injection or unknown IDs)
    const invalidIds = fields.filter((f) => !existingFieldIds.has(f.id)).map((f) => f.id);
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: `The following field IDs do not belong to this form version: ${invalidIds.join(", ")}`,
          code: "INVALID_FIELD_REORDER",
          invalidIds,
        },
        { status: 400 }
      );
    }

    // Transactionally update displayOrder
    await prisma.$transaction(
      fields.map((f) =>
        prisma.eventField.update({
          where: { id: f.id },
          data: {
            displayOrder: f.displayOrder,
          },
        })
      )
    );

    await createAuditLog({
      actorId: admin.id,
      action: "FORM_FIELDS_REORDERED",
      entityType: "FormVersion",
      entityId: versionId,
      metadata: {
        eventId,
        fieldCount: fields.length,
      },
    });

    const updatedFields = await prisma.eventField.findMany({
      where: { formVersionId: versionId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ fields: updatedFields.map(toEventFieldDomain) });
  } catch (error) {
    console.error("[POST /api/admin/events/[id]/forms/[versionId]/reorder] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
