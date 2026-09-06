import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { RegistrationMode, toEventFieldDomain } from "@/lib/forms/types";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/events/[slug]/form
 * Public endpoint to fetch the active published form schema for an INTERNAL event.
 * Rejects with 404 if event is EXTERNAL or NONE, or if no published form version is active.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        registrationMode: true,
        registrationMethod: true,
        eligibilityCrescent: true,
        eligibilityExternal: true,
        activeFormVersionId: true,
        activeFormVersion: {
          include: {
            eventFields: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found", code: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (event.registrationMode !== RegistrationMode.INTERNAL) {
      return NextResponse.json(
        {
          error:
            event.registrationMode === RegistrationMode.EXTERNAL
              ? "This event uses external registration. No internal form is available."
              : "This event does not require registration.",
          code:
            event.registrationMode === RegistrationMode.EXTERNAL
              ? "EXTERNAL_REGISTRATION_MODE"
              : "REGISTRATION_MODE_NOT_INTERNAL",
        },
        { status: event.registrationMode === RegistrationMode.EXTERNAL ? 400 : 404 }
      );
    }

    if (!event.activeFormVersion || !event.activeFormVersionId) {
      return NextResponse.json(
        {
          error: "Registration form has not yet been published for this event.",
          code: "NO_ACTIVE_FORM_VERSION",
        },
        { status: 404 }
      );
    }

    const formVersion = event.activeFormVersion;
    const mappedFields = formVersion.eventFields.map(toEventFieldDomain);

    return NextResponse.json({
      id: formVersion.id,
      versionNumber: formVersion.versionNumber,
      status: formVersion.status,
      publishedAt: formVersion.publishedAt,
      fields: mappedFields,
      form: {
        id: formVersion.id,
        versionNumber: formVersion.versionNumber,
        publishedAt: formVersion.publishedAt,
        fields: mappedFields,
      },
      event: {
        id: event.id,
        slug: event.slug,
        name: event.name,
        eligibilityCrescent: event.eligibilityCrescent,
        eligibilityExternal: event.eligibilityExternal,
      },
    });
  } catch (error) {
    console.error("[GET /api/events/[slug]/form] Internal error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
