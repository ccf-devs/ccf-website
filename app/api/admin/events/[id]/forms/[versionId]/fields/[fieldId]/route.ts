import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { EventFieldInputSchema } from "@/lib/forms/validation";
import { FormVersionStatus, toEventFieldDomain } from "@/lib/forms/types";
import { createAuditLog } from "@/lib/audit/log";

interface RouteContext {
  params: Promise<{ id: string; versionId: string; fieldId: string }>;
}

/**
 * PATCH /api/admin/events/[id]/forms/[versionId]/fields/[fieldId]
 * Edits a field on a DRAFT form version.
 * Rejects with FORM_VERSION_IMMUTABLE if the form version is already published.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: eventId, versionId, fieldId } = await params;

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
          error: "Published form versions are immutable. Create a new draft version to edit fields.",
          code: "FORM_VERSION_IMMUTABLE",
        },
        { status: 409 }
      );
    }

    const existingField = await prisma.eventField.findFirst({
      where: { id: fieldId, formVersionId: versionId },
    });

    if (!existingField) {
      return NextResponse.json(
        { error: "Field not found", code: "FIELD_NOT_FOUND" },
        { status: 404 }
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

    // If key is being changed, check uniqueness
    if (input.key !== existingField.key) {
      const duplicate = await prisma.eventField.findFirst({
        where: {
          formVersionId: versionId,
          key: input.key,
          id: { not: fieldId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Field with key "${input.key}" already exists in this form version`,
            code: "DUPLICATE_FIELD_KEY",
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.eventField.update({
      where: { id: fieldId },
      data: {
        key: input.key,
        label: input.label,
        type: input.type,
        fieldScope: input.fieldScope,
        required: input.required,
        config: input.config as any,
        validation: input.validation as any,
        conditionalLogic: input.conditionalLogic as any,
        displayOrder: input.displayOrder ?? existingField.displayOrder,
      },
    });

    await createAuditLog({
      actorId: admin.id,
      action: "FORM_FIELD_UPDATED",
      entityType: "EventField",
      entityId: fieldId,
      metadata: {
        eventId,
        formVersionId: versionId,
        fieldKey: updated.key,
      },
    });

    const domainField = toEventFieldDomain(updated);
    return NextResponse.json({ ...domainField, field: domainField });
  } catch (error) {
    console.error("[PATCH /api/admin/events/[id]/forms/[versionId]/fields/[fieldId]] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/events/[id]/forms/[versionId]/fields/[fieldId]
 * Deletes a field from a DRAFT form version.
 * Rejects with FORM_VERSION_IMMUTABLE if the form version is already published.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: eventId, versionId, fieldId } = await params;

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
          error: "Published form versions are immutable. Create a new draft version to delete fields.",
          code: "FORM_VERSION_IMMUTABLE",
        },
        { status: 409 }
      );
    }

    const field = await prisma.eventField.findFirst({
      where: { id: fieldId, formVersionId: versionId },
    });

    if (!field) {
      return NextResponse.json(
        { error: "Field not found", code: "FIELD_NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.eventField.delete({
      where: { id: fieldId },
    });

    await createAuditLog({
      actorId: admin.id,
      action: "FORM_FIELD_DELETED",
      entityType: "EventField",
      entityId: fieldId,
      metadata: {
        eventId,
        formVersionId: versionId,
        fieldKey: field.key,
      },
    });

    return NextResponse.json({ success: true, message: "Field deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/admin/events/[id]/forms/[versionId]/fields/[fieldId]] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
