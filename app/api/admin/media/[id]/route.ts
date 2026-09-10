import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { updateMediaSchema, mediaIdSchema } from "@/lib/media/validation";
import { deleteMediaObject } from "@/lib/storage/b2";
import { createAuditLog, MEDIA_AUDIT_ACTIONS } from "@/lib/audit/log";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/media/[id]
 * Retrieves a single media record with associated event and member reference counts.
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
  const idParsed = mediaIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { error: "Invalid media ID format. Expected a valid UUID." },
      { status: 400 }
    );
  }

  try {
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!media) {
      return NextResponse.json(
        { error: "Media asset not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      media,
    });
  } catch (error) {
    console.error(`[GET /api/admin/media/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve media record." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/media/[id]
 * Updates metadata: altText, eventId, visibility, displayOrder.
 * Strictly disallows mutating media ID or storage object key.
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
  const idParsed = mediaIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { error: "Invalid media ID format. Expected a valid UUID." },
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

    const validated = updateMediaSchema.parse(body);

    const existing = await prisma.media.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Media asset not found." },
        { status: 404 }
      );
    }

    // Validate target event if eventId is being updated to a non-null UUID
    if (validated.eventId && validated.eventId !== existing.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: validated.eventId },
        select: { id: true, name: true },
      });

      if (!event) {
        return NextResponse.json(
          { error: "The associated event does not exist." },
          { status: 400 }
        );
      }
    }

    const updateData: {
      altText?: string | null;
      eventId?: string | null;
      visibility?: boolean;
      displayOrder?: number;
    } = {};

    if (validated.altText !== undefined) updateData.altText = validated.altText;
    if (validated.eventId !== undefined) updateData.eventId = validated.eventId;
    if (validated.visibility !== undefined) updateData.visibility = validated.visibility;
    if (validated.displayOrder !== undefined) updateData.displayOrder = validated.displayOrder;

    const updated = await prisma.media.update({
      where: { id },
      data: updateData,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    const isVisibilityChanging =
      validated.visibility !== undefined && validated.visibility !== existing.visibility;

    await createAuditLog({
      actorId: admin.id,
      action: isVisibilityChanging
        ? MEDIA_AUDIT_ACTIONS.VISIBILITY_CHANGED
        : MEDIA_AUDIT_ACTIONS.UPDATED,
      entityType: "Media",
      entityId: updated.id,
      metadata: {
        objectKey: updated.objectKey,
        eventId: updated.eventId,
        ...(isVisibilityChanging && {
          fromVisibility: existing.visibility,
          toVisibility: validated.visibility,
        }),
        changedFields: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      success: true,
      media: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    console.error(`[PATCH /api/admin/media/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update media record." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/media/[id]
 * Deletes media asset from Backblaze B2 and database.
 * Derives the trusted object key from the PostgreSQL record by UUID.
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
  const idParsed = mediaIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { error: "Invalid media ID format. Expected a valid UUID." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.media.findUnique({
      where: { id },
      select: {
        id: true,
        objectKey: true,
        eventId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Media asset not found." },
        { status: 404 }
      );
    }

    // 1. Delete from Backblaze B2 using database-derived objectKey
    try {
      await deleteMediaObject(existing.objectKey);
    } catch (storageError: unknown) {
      const isMissing =
        typeof storageError === "object" &&
        storageError !== null &&
        (("name" in storageError &&
          (storageError.name === "NotFound" ||
            storageError.name === "NoSuchKey")) ||
          ("$metadata" in storageError &&
            typeof storageError.$metadata === "object" &&
            storageError.$metadata !== null &&
            "httpStatusCode" in storageError.$metadata &&
            storageError.$metadata.httpStatusCode === 404));

      if (isMissing) {
        console.warn(
          `[DELETE /api/admin/media/${id}] B2 object ${existing.objectKey} was already missing; proceeding with database cleanup.`
        );
      } else {
        console.error(
          `[DELETE /api/admin/media/${id}] B2 storage deletion failed:`,
          storageError
        );
        return NextResponse.json(
          {
            error:
              "Failed to remove media from storage. The database record was preserved for retry.",
          },
          { status: 500 }
        );
      }
    }

    // 2. Delete database record
    await prisma.media.delete({
      where: { id },
    });

    // 3. Log audit entry
    await createAuditLog({
      actorId: admin.id,
      action: MEDIA_AUDIT_ACTIONS.DELETED,
      entityType: "Media",
      entityId: existing.id,
      metadata: {
        objectKey: existing.objectKey,
        eventId: existing.eventId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Media asset deleted successfully.",
    });
  } catch (error) {
    console.error(`[DELETE /api/admin/media/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to delete media record." },
      { status: 500 }
    );
  }
}
