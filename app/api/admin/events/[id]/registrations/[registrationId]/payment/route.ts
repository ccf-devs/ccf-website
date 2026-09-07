import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  verifyPaymentByAdmin,
  rejectPaymentByAdmin,
  PaymentDomainError,
  PaymentErrorCode,
} from "@/lib/payments";

interface RouteContext {
  params: Promise<{ id: string; registrationId: string }>;
}

const AdminPaymentActionSchema = z.object({
  action: z.enum(["VERIFY", "REJECT"], {
    errorMap: () => ({ message: "Action must be either VERIFY or REJECT." }),
  }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
  reason: z.string().max(500, "Reason cannot exceed 500 characters.").optional(),
});

/**
 * PATCH /api/admin/events/[id]/registrations/[registrationId]/payment
 * Authoritative admin verification or rejection of an event registration payment.
 *
 * Rules:
 * - Requires authenticated CCF_ADMIN or IT_ADMIN.
 * - Confirms registration belongs to the specified event.
 * - VERIFY sets status to VERIFIED, records verifiedBy and verifiedAt, and creates audit log.
 * - REJECT sets status to REJECTED and creates audit log without setting verification fields.
 * - Never leaks raw database errors.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized", code: PaymentErrorCode.UNAUTHORIZED },
        { status: 401 }
      );
    }

    if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden: insufficient administrative permissions.",
          code: PaymentErrorCode.UNAUTHORIZED,
        },
        { status: 403 }
      );
    }

    const { id: eventId, registrationId } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body.",
          code: PaymentErrorCode.INVALID_REQUEST,
        },
        { status: 400 }
      );
    }

    const parseResult = AdminPaymentActionSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const message = issue ? issue.message : "Invalid request data.";
      return NextResponse.json(
        {
          error: message,
          code: PaymentErrorCode.INVALID_REQUEST,
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        eventId: true,
      },
    });

    if (!registration || registration.eventId !== eventId) {
      return NextResponse.json(
        {
          error: "Registration not found for this event.",
          code: PaymentErrorCode.REGISTRATION_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    const { action, notes, reason } = parseResult.data;

    let updatedPayment;
    if (action === "VERIFY") {
      updatedPayment = await verifyPaymentByAdmin(registrationId, admin.id, notes);
    } else {
      updatedPayment = await rejectPaymentByAdmin(registrationId, admin.id, reason || notes);
    }

    return NextResponse.json(
      {
        success: true,
        payment: updatedPayment,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PaymentDomainError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.statusCode }
      );
    }

    console.error(
      "[PATCH /api/admin/events/[id]/registrations/[registrationId]/payment] Internal error:",
      error
    );
    return NextResponse.json(
      {
        error: "An internal server error occurred while updating payment status.",
        code: PaymentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
