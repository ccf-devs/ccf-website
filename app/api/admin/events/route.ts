import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  createEventSchema,
  formatZodErrors,
} from "@/lib/validation/event";
import {
  createAuditLog,
  EVENT_AUDIT_ACTIONS,
  buildEventCreatedMetadata,
} from "@/lib/audit/log";
import { EventStatus, Prisma } from "@prisma/client";

/**
 * GET /api/admin/events
 * Lists events with optional status filtering.
 * Requires authenticated administrator session.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");

    const whereClause: Prisma.EventWhereInput = {};

    if (
      statusParam &&
      Object.values(EventStatus).includes(statusParam as EventStatus)
    ) {
      whereClause.status = statusParam as EventStatus;
    }

    if (searchParam && searchParam.trim().length > 0) {
      const q = searchParam.trim();
      whereClause.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { venue: { contains: q, mode: "insensitive" } },
      ];
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        content: true,
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/events
 * Creates a new event record with associated EventContent and an audit log.
 * Enforces Zod validation, slug uniqueness, and transaction atomicity.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: formatZodErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existingSlug = await prisma.event.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        {
          error: "An event with this slug already exists.",
          details: { slug: "Slug already in use" },
        },
        { status: 409 }
      );
    }

    // Separate Event fields from EventContent fields
    const {
      descriptionRich,
      rulesRich,
      instructionsRich,
      eligibilityRich,
      notesRich,
      ...eventFields
    } = parsed.data;

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          ...eventFields,
          content: {
            create: {
              descriptionRich: descriptionRich || null,
              rulesRich: rulesRich || null,
              instructionsRich: instructionsRich || null,
              eligibilityRich: eligibilityRich || null,
              notesRich: notesRich || null,
            },
          },
        },
        include: {
          content: true,
        },
      });

      // Audit Log with safe allowlist metadata
      await createAuditLog(
        {
          actorId: admin.id,
          action: EVENT_AUDIT_ACTIONS.CREATED,
          entityType: "Event",
          entityId: created.id,
          metadata: buildEventCreatedMetadata({
            eventId: created.id,
            eventName: created.name,
            slug: created.slug,
            status: created.status,
          }),
        },
        tx
      );

      return created;
    });

    return NextResponse.json({ event }, { status: 201 });
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
      error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
