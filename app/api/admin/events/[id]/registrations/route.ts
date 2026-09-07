import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  getEventRegistrationsForAdmin,
  RegistrationErrorCode,
} from "@/lib/registrations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/events/[id]/registrations
 * Lists all registrations for an event with dynamic responses, team info, and payment status.
 * Requires CCF_ADMIN or IT_ADMIN authorization.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized", code: RegistrationErrorCode.UNAUTHORIZED },
        { status: 401 }
      );
    }

    if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden: insufficient administrative permissions.",
          code: RegistrationErrorCode.UNAUTHORIZED,
        },
        { status: 403 }
      );
    }

    const { id: eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        slug: true,
        capacity: true,
        capacityMode: true,
        registrationMode: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found", code: RegistrationErrorCode.EVENT_NOT_FOUND },
        { status: 404 }
      );
    }

    const registrations = await getEventRegistrationsForAdmin(eventId);

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        capacity: event.capacity,
        capacityMode: event.capacityMode,
      },
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    console.error("[GET /api/admin/events/[id]/registrations] Internal error:", error);
    return NextResponse.json(
      {
        error: "An internal server error occurred.",
        code: RegistrationErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
