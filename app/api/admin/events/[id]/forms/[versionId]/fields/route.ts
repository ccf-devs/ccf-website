import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { EventFieldInputSchema } from "@/lib/forms/validation";
import { FormVersionStatus, toEventFieldDomain } from "@/lib/forms/types";
import { createAuditLog } from "@/lib/audit/log";

interface RouteContext {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * POST /api/admin/events/[id]/forms/[versionId]/fields
 * Adds a new field to a DRAFT form version.
 * Rejects with FORM_VERSION_IMMUTABLE if the form version is already published or closed.
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
          error: "Published form versions are immutable. Create a new draft version to add fields.",
          code: "FORM_VERSION_IMMUTABLE",
        },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    const parseResult = EventFieldInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid field input",
          details: parseResult.error.flatten(),
          code: "INVALID_FIELD",
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Check duplicate key within this form version
    const existingFieldWithKey = await prisma.eventField.findFirst({
      where: {
        formVersionId: versionId,
        key: input.key,
      },
    });

    if (existingFieldWithKey) {
      return NextResponse.json(
        {
          error: `Field with key "${input.key}" already exists in this form version`,
          code: "DUPLICATE_FIELD_KEY",
        },
        { status: 409 }
      );
    }

    // Determine displayOrder if not explicitly specified
    let displayOrder = input.displayOrder;
    if (displayOrder === undefined) {
      const highestOrder = await prisma.eventField.findFirst({
        where: { formVersionId: versionId },
        orderBy: { displayOrder: "desc" },
        select: { displayOrder: true },
      });
      displayOrder = (highestOrder?.displayOrder ?? -1) + 1;
    }

    const createdField = await prisma.eventField.create({
      data: {
        formVersionId: versionId,
        key: input.key,
        label: input.label,
        type: input.type,
        fieldScope: input.fieldScope,
        required: input.required,
        config: input.config as any,
        validation: input.validation as any,
        conditionalLogic: input.conditionalLogic as any,
        displayOrder,
      },
    });

    await createAuditLog({
      actorId: admin.id,
      action: "FORM_FIELD_CREATED",
      entityType: "EventField",
      entityId: createdField.id,
      metadata: {
        eventId,
        formVersionId: versionId,
        fieldKey: createdField.key,
        fieldType: createdField.type,
      },
    });

    const domainField = toEventFieldDomain(createdField);
    return NextResponse.json(
      {
        ...domainField,
        field: domainField,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/events/[id]/forms/[versionId]/fields] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
