import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { createAuditLog } from "@/lib/audit/log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const setCoverSchema = z.object({
  mediaId: z.string().uuid("Invalid media ID format."),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const { id: eventId } = await params;

  try {
    const body = await req.json();
    const { mediaId } = setCoverSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify target media exists, belongs to this event, and is visible
      const targetMedia = await tx.media.findUnique({
        where: { id: mediaId },
      });

      if (!targetMedia) {
        throw new Error("Target media record not found.");
      }

      if (targetMedia.eventId !== eventId) {
        throw new Error("Media item is not associated with this event.");
      }

      if (!targetMedia.visibility) {
        throw new Error("Hidden media cannot be designated as the event cover.");
      }

      // 2. Set target media displayOrder to 0 (top priority)
      await tx.media.update({
        where: { id: mediaId },
        data: { displayOrder: 0 },
      });

      // 3. Sequentially update other media for this event
      const otherMedia = await tx.media.findMany({
        where: {
          eventId,
          id: { not: mediaId },
        },
        orderBy: { displayOrder: "asc" },
      });

      for (let i = 0; i < otherMedia.length; i++) {
        await tx.media.update({
          where: { id: otherMedia[i].id },
          data: { displayOrder: i + 1 },
        });
      }

      // 4. Audit trail
      await createAuditLog(
        {
          actorId: admin.id,
          action: "EVENT_COVER_MEDIA_SET",
          entityType: "EVENT",
          entityId: eventId,
          metadata: {
            coverMediaId: mediaId,
            coverObjectKey: targetMedia.objectKey,
          },
        },
        tx
      );

      return { coverMediaId: mediaId };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/events/[id]/media/set-cover] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set event cover." },
      { status: 400 }
    );
  }
}
