import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  deleteRegistrationByAdmin,
  RegistrationErrorCode,
  RegistrationDomainError,
} from "@/lib/registrations";

interface RouteContext {
  params: Promise<{ id: string; registrationId: string }>;
}

/**
 * DELETE /api/admin/events/[id]/registrations/[registrationId]
 * Cancels/deletes a registration, atomically releasing its EventParticipant lock and capacity slot.
 * Requires CCF_ADMIN or IT_ADMIN authorization.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
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

    const { id: eventId, registrationId } = await params;

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { id: true, eventId: true },
    });

    if (!registration || registration.eventId !== eventId) {
      return NextResponse.json(
        {
          error: "Registration not found for this event.",
          code: RegistrationErrorCode.REGISTRATION_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    const result = await deleteRegistrationByAdmin(registrationId, admin.id);

    return NextResponse.json({
      success: true,
      message: `Registration for ${result.releasedParticipantName} has been deleted and participation lock released.`,
    });
  } catch (error) {
    if (error instanceof RegistrationDomainError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error(
      "[DELETE /api/admin/events/[id]/registrations/[registrationId]] Internal error:",
      error
    );
    return NextResponse.json(
      {
        error: "An internal server error occurred while deleting the registration.",
        code: RegistrationErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
