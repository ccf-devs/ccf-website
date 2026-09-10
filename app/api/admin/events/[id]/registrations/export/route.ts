import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getEventRegistrationsForAdmin } from "@/lib/registrations/engine";
import {
  generateCsv,
  generateSafeExportFilename,
} from "@/lib/csv/generator";
import { transformRegistrationsToCsvRows } from "@/lib/csv/registrations";
import {
  createAuditLog,
  REGISTRATION_AUDIT_ACTIONS,
  sanitizeAuditMetadata,
} from "@/lib/audit/log";
import { z } from "zod";

const eventIdParamSchema = z.string().uuid("Invalid event ID format. Expected a valid UUID.");

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/events/[id]/registrations/export
 *
 * Generates and returns a downloadable, RFC 4180-compliant CSV file of all registrations
 * for the specified event.
 *
 * Authorization:
 * - Requires active session with role CCF_ADMIN or IT_ADMIN.
 *
 * Audit:
 * - Emits REGISTRATION_EXPORTED on successful CSV response preparation without storing PII.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    // 1. Authenticate & Authorize
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
      return NextResponse.json(
        { error: "Insufficient administrative permissions." },
        { status: 403 }
      );
    }

    // 2. Validate Event UUID parameter
    const { id: rawEventId } = await params;
    const parsedId = eventIdParamSchema.safeParse(rawEventId);
    if (!parsedId.success) {
      return NextResponse.json(
        {
          error: "Invalid event ID format. Expected a valid UUID.",
          details: parsedId.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const eventId = parsedId.data;

    // 3. Load Event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    // 4. Fetch registrations using the existing service
    const registrations = await getEventRegistrationsForAdmin(eventId);

    // 5. Fetch all form fields across all form versions of this event for stable display ordering
    const formFields = await prisma.eventField.findMany({
      where: {
        formVersion: {
          eventId,
        },
      },
      select: {
        id: true,
        formVersionId: true,
        key: true,
        label: true,
        displayOrder: true,
      },
      orderBy: [
        { formVersion: { versionNumber: "asc" } },
        { displayOrder: "asc" },
      ],
    });

    // 6. Transform into structured CSV columns and rows
    const { columns, rows } = transformRegistrationsToCsvRows({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
      },
      registrations,
      formFields,
    });

    // 7. Serialize to RFC 4180 CSV with UTF-8 BOM
    const csvContent = generateCsv(columns, rows, { withBom: true });

    // 8. Generate safe, standard filename
    const filename = generateSafeExportFilename(event.slug);

    // 9. Write audit log ONLY upon successful generation
    await createAuditLog({
      actorId: admin.id,
      action: REGISTRATION_AUDIT_ACTIONS.EXPORTED,
      entityType: "Event",
      entityId: event.id,
      metadata: sanitizeAuditMetadata({
        eventId: event.id,
        eventSlug: event.slug,
        eventName: event.name,
        registrationCount: registrations.length,
        format: "csv",
      }),
    });

    // 10. Return CSV as downloadable attachment
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/events/[id]/registrations/export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export event registrations." },
      { status: 500 }
    );
  }
}
