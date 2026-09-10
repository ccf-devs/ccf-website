import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  MAX_MEDIA_FILE_SIZE,
  ALLOWED_MEDIA_MIME_TYPES,
  AllowedMediaMimeType,
  validateImageSignature,
  generateSafeObjectKey,
  uploadMediaMetadataSchema,
  mediaQuerySchema,
} from "@/lib/media/validation";
import { uploadMediaObject, deleteMediaObject } from "@/lib/storage/b2";
import { createAuditLog, MEDIA_AUDIT_ACTIONS } from "@/lib/audit/log";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media
 * Retrieves media items with optional event, visibility, and search filtering.
 * Includes aggregated library metrics.
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
  const parsedQuery = mediaQuerySchema.safeParse({
    eventId: searchParams.get("eventId") ?? undefined,
    visibility: searchParams.get("visibility") ?? undefined,
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

  const { eventId, visibility, search } = parsedQuery.data;

  const where: Prisma.MediaWhereInput = {};

  if (eventId && eventId !== "ALL") {
    if (eventId === "GENERAL") {
      where.eventId = null;
    } else {
      where.eventId = eventId;
    }
  }

  if (visibility === "visible" || visibility === "true") {
    where.visibility = true;
  } else if (visibility === "hidden" || visibility === "false") {
    where.visibility = false;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { altText: { contains: q, mode: "insensitive" } },
      { objectKey: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [media, total, visible, hidden, eventMedia] = await Promise.all([
      prisma.media.findMany({
        where,
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
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.media.count(),
      prisma.media.count({ where: { visibility: true } }),
      prisma.media.count({ where: { visibility: false } }),
      prisma.media.count({ where: { NOT: { eventId: null } } }),
    ]);

    return NextResponse.json({
      success: true,
      media,
      metrics: {
        total,
        visible,
        hidden,
        eventMedia,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/media] Error loading media:", error);
    return NextResponse.json(
      { error: "Failed to retrieve media records." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/media
 * Uploads a media asset to Backblaze B2 and creates a PostgreSQL Media record.
 * Uses multipart/form-data. Fails closed with automatic B2 cleanup if DB fails.
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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string" || file.size === 0) {
      return NextResponse.json(
        { error: "A valid image file is required." },
        { status: 400 }
      );
    }

    if (file.size > MAX_MEDIA_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 10MB limit." },
        { status: 400 }
      );
    }

    const declaredMime = file.type?.toLowerCase();
    if (
      !declaredMime ||
      !ALLOWED_MEDIA_MIME_TYPES.includes(declaredMime as AllowedMediaMimeType)
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported image format. Allowed formats: JPEG, PNG, WEBP, GIF.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate binary magic bytes
    if (!validateImageSignature(buffer, declaredMime)) {
      return NextResponse.json(
        { error: "File binary signature does not match declared image type." },
        { status: 400 }
      );
    }

    // Validate metadata fields
    const rawAltText = formData.get("altText");
    const rawEventId = formData.get("eventId");
    const rawVisibility = formData.get("visibility");
    const rawDisplayOrder = formData.get("displayOrder");

    const validated = uploadMediaMetadataSchema.parse({
      altText: typeof rawAltText === "string" ? rawAltText.trim() : null,
      eventId: typeof rawEventId === "string" && rawEventId.trim() ? rawEventId.trim() : null,
      visibility: rawVisibility !== null ? rawVisibility : true,
      displayOrder: rawDisplayOrder !== null ? rawDisplayOrder : 0,
    });

    // Validate target event if specified
    if (validated.eventId) {
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

    // Generate safe, server-controlled object key
    const objectKey = generateSafeObjectKey(
      declaredMime as AllowedMediaMimeType,
      validated.eventId
    );

    // 1. Upload to Backblaze B2
    try {
      await uploadMediaObject({
        key: objectKey,
        body: buffer,
        mimeType: declaredMime,
        contentLength: buffer.length,
        metadata: {
          altText: validated.altText || "",
          uploadedBy: admin.id,
        },
      });
    } catch (uploadError) {
      console.error("[POST /api/admin/media] B2 upload failure:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload media object to storage." },
        { status: 500 }
      );
    }

    // 2. Insert into PostgreSQL Media table
    let createdMedia;
    try {
      createdMedia = await prisma.media.create({
        data: {
          objectKey,
          mimeType: declaredMime,
          altText: validated.altText || null,
          eventId: validated.eventId || null,
          visibility: validated.visibility,
          displayOrder: validated.displayOrder,
        },
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
    } catch (dbError) {
      console.error(
        "[POST /api/admin/media] DB creation failed after B2 upload. Cleaning up B2 object:",
        dbError
      );
      // Attempt orphan cleanup
      try {
        await deleteMediaObject(objectKey);
      } catch (cleanupErr) {
        console.error(
          "[POST /api/admin/media] Failed to cleanup orphaned B2 object:",
          cleanupErr
        );
      }

      return NextResponse.json(
        { error: "Failed to save media metadata to database." },
        { status: 500 }
      );
    }

    // 3. Log audit entry
    await createAuditLog({
      actorId: admin.id,
      action: MEDIA_AUDIT_ACTIONS.UPLOADED,
      entityType: "Media",
      entityId: createdMedia.id,
      metadata: {
        objectKey: createdMedia.objectKey,
        mimeType: createdMedia.mimeType,
        eventId: createdMedia.eventId,
        eventName: createdMedia.event?.name || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        media: createdMedia,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/media] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing media upload." },
      { status: 500 }
    );
  }
}
