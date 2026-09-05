import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  updateEventPatchSchema,
  completeEventSchema,
  mergeEventWithPatch,
  isValidEventStatusTransition,
  formatZodErrors,
} from "@/lib/validation/event";
import {
  createAuditLog,
  EVENT_AUDIT_ACTIONS,
  buildEventStatusChangedMetadata,
  buildEventUpdatedMetadata,
} from "@/lib/audit/log";
import { Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/events/[id]
 * Retrieves a single event and its associated content.
 */
export async function GET(_req: NextRequest, context: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        content: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/events/[id]
 * Updates an event's configuration and/or lifecycle status.
 * Enforces Correction 2: Validates the incoming patch, merges with existing event,
 * and validates the COMPLETE resulting event configuration.
 * Enforces Correction 1: Validates lifecycle status transition rules.
 */
export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // 1. Fetch existing event
    const existing = await prisma.event.findUnique({
      where: { id },
      include: { content: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Terminal state invariant: Archived events cannot be mutated
    if (existing.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Archived events cannot be modified" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // 2. Validate patch shape
    const parsedPatch = updateEventPatchSchema.safeParse(body);
    if (!parsedPatch.success) {
      return NextResponse.json(
        {
          error: "Invalid patch format",
          details: formatZodErrors(parsedPatch.error),
        },
        { status: 400 }
      );
    }

    const patchData = parsedPatch.data;

    // 3. Lifecycle status transition check (Correction 1)
    const isStatusChanging =
      patchData.status && patchData.status !== existing.status;

    if (isStatusChanging) {
      if (!isValidEventStatusTransition(existing.status, patchData.status!)) {
        return NextResponse.json(
          {
            error: `Invalid status transition: Cannot transition from ${existing.status} to ${patchData.status}`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Merge existing event record with patch and validate COMPLETE resulting event (Correction 2)
    const existingFlattened = {
      ...existing,
      // Pass feeAmount as number if Decimal
      feeAmount:
        existing.feeAmount !== null && existing.feeAmount !== undefined
          ? Number(existing.feeAmount)
          : null,
      descriptionRich: existing.content?.descriptionRich ?? null,
      rulesRich: existing.content?.rulesRich ?? null,
      instructionsRich: existing.content?.instructionsRich ?? null,
      eligibilityRich: existing.content?.eligibilityRich ?? null,
      notesRich: existing.content?.notesRich ?? null,
    };

    const mergedData = mergeEventWithPatch(existingFlattened, patchData);
    const completeValidation = completeEventSchema.safeParse(mergedData);

    if (!completeValidation.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: formatZodErrors(completeValidation.error),
        },
        { status: 400 }
      );
    }

    // 5. Slug uniqueness check if slug is being modified
    if (patchData.slug && patchData.slug !== existing.slug) {
      const slugConflict = await prisma.event.findUnique({
        where: { slug: patchData.slug },
        select: { id: true },
      });

      if (slugConflict && slugConflict.id !== id) {
        return NextResponse.json(
          {
            error: "An event with this slug already exists.",
            details: { slug: "Slug already in use" },
          },
          { status: 409 }
        );
      }
    }

    // 6. Separate event fields from content fields for database update
    const {
      descriptionRich,
      rulesRich,
      instructionsRich,
      eligibilityRich,
      notesRich,
      ...eventUpdateFields
    } = patchData;

    const hasContentUpdates =
      descriptionRich !== undefined ||
      rulesRich !== undefined ||
      instructionsRich !== undefined ||
      eligibilityRich !== undefined ||
      notesRich !== undefined;

    const updatedEvent = await prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: {
          ...eventUpdateFields,
          ...(hasContentUpdates
            ? {
                content: {
                  upsert: {
                    create: {
                      descriptionRich: descriptionRich || null,
                      rulesRich: rulesRich || null,
                      instructionsRich: instructionsRich || null,
                      eligibilityRich: eligibilityRich || null,
                      notesRich: notesRich || null,
                    },
                    update: {
                      ...(descriptionRich !== undefined ? { descriptionRich } : {}),
                      ...(rulesRich !== undefined ? { rulesRich } : {}),
                      ...(instructionsRich !== undefined ? { instructionsRich } : {}),
                      ...(eligibilityRich !== undefined ? { eligibilityRich } : {}),
                      ...(notesRich !== undefined ? { notesRich } : {}),
                    },
                  },
                },
              }
            : {}),
        },
        include: {
          content: true,
        },
      });

      // 7. Audit log with safe allowlist metadata (Correction 5)
      if (isStatusChanging) {
        await createAuditLog(
          {
            actorId: admin.id,
            action: EVENT_AUDIT_ACTIONS.STATUS_CHANGED,
            entityType: "Event",
            entityId: id,
            metadata: buildEventStatusChangedMetadata({
              eventId: id,
              fromStatus: existing.status,
              toStatus: patchData.status!,
            }),
          },
          tx
        );
      } else {
        await createAuditLog(
          {
            actorId: admin.id,
            action: EVENT_AUDIT_ACTIONS.UPDATED,
            entityType: "Event",
            entityId: id,
            metadata: buildEventUpdatedMetadata({
              eventId: id,
              changedFields: Object.keys(patchData),
            }),
          },
          tx
        );
      }

      return updated;
    });

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An event with this slug already exists." },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to update event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
