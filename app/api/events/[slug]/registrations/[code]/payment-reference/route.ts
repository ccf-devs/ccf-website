import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import {
  submitPaymentReference,
  PaymentDomainError,
  PaymentErrorCode,
} from "@/lib/payments";

interface RouteContext {
  params: Promise<{ slug: string; code: string }>;
}

const PaymentReferenceSchema = z.object({
  userReference: z.string({
    required_error: "Payment reference / UTR is required.",
    invalid_type_error: "Payment reference must be a string.",
  }),
});

/**
 * POST /api/events/[slug]/registrations/[code]/payment-reference
 * Public endpoint for registrants to submit or update their UPI UTR / reference number.
 *
 * Rules:
 * - Event and Registration must match the URL path.
 * - Event must be PAID and INTERNAL.
 * - Reference must be valid (6-50 characters).
 * - Payment status strictly remains PENDING.
 * - Rejects free or external events.
 * - Prevents overwriting already verified payments.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug, code } = await params;

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

    const parseResult = PaymentReferenceSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const message = issue ? issue.message : "Invalid request data.";
      return NextResponse.json(
        {
          error: message,
          code: PaymentErrorCode.INVALID_REFERENCE,
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Verify registration matches slug
    const registration = await prisma.registration.findUnique({
      where: { registrationCode: code.trim().toUpperCase() },
      select: {
        id: true,
        event: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!registration || registration.event.slug !== slug) {
      return NextResponse.json(
        {
          error: "Registration not found for this event.",
          code: PaymentErrorCode.REGISTRATION_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    const updatedPayment = await submitPaymentReference(
      code,
      parseResult.data.userReference
    );

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
      "[POST /api/events/[slug]/registrations/[code]/payment-reference] Internal error:",
      error
    );
    return NextResponse.json(
      {
        error: "An internal server error occurred while updating payment reference.",
        code: PaymentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
