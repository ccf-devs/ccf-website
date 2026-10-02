import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getEventRegistrationsForAdmin } from "@/lib/registrations/engine";
import { generateSafeExportFilename } from "@/lib/csv/generator";
import { transformRegistrationsToCsvRows } from "@/lib/csv/registrations";
import { generateXlsx } from "@/lib/xlsx/generator";
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

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
      return NextResponse.json({ error: "Insufficient administrative permissions." }, { status: 403 });
    }
    const { id: rawEventId } = await params;
    const parsedId = eventIdParamSchema.safeParse(rawEventId);
    if (!parsedId.success) {
      return NextResponse.json({
          error: "Invalid event ID format. Expected a valid UUID.",
          details: parsedId.error.flatten().fieldErrors,
        }, { status: 400 });
    }
    const eventId = parsedId.data;
    const event = await prisma.event.findUnique({
      where: { id: eventId }, select: { id: true, name: true, slug: true, status: true, },
    });
    if (!event) { return NextResponse.json({ error: "Event not found." }, { status: 404 }); }
    const registrations = await getEventRegistrationsForAdmin(eventId);
    const formFields = await prisma.eventField.findMany({
      where: { formVersion: { eventId } },
      select: { id: true, formVersionId: true, key: true, label: true, displayOrder: true },
      orderBy: [{ formVersion: { versionNumber: "asc" } }, { displayOrder: "asc" }],
    });
    const transformedData = transformRegistrationsToCsvRows({
      event: { id: event.id, name: event.name, slug: event.slug },
      registrations, formFields,
    });
    const xlsxBuffer = await generateXlsx(transformedData);
    const filename = generateSafeExportFilename(event.slug).replace(".csv", ".xlsx");
    await createAuditLog({
      actorId: admin.id,
      action: REGISTRATION_AUDIT_ACTIONS.EXPORTED,
      entityType: "Event",
      entityId: event.id,
      metadata: sanitizeAuditMetadata({ eventId: event.id, eventSlug: event.slug, eventName: event.name, registrationCount: registrations.length, format: "xlsx" }),
    });
    return new NextResponse(xlsxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/events/[id]/registrations/export-xlsx] Error:", error);
    return NextResponse.json({ error: "Failed to export event registrations." }, { status: 500 });
  }
}
