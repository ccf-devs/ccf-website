import { NextRequest, NextResponse } from "next/server";
import {
  RegistrationSubmissionSchema,
  executeRegistration,
  RegistrationDomainError,
  RegistrationErrorCode,
} from "@/lib/registrations";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/events/[slug]/register
 * Public registration endpoint for CCF events.
 * Executes within an authoritative PostgreSQL transaction with active participant locking.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body.",
          code: RegistrationErrorCode.INVALID_REQUEST,
        },
        { status: 400 }
      );
    }

    const parseResult = RegistrationSubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid request data.";
      return NextResponse.json(
        {
          error: message,
          code: RegistrationErrorCode.INVALID_REQUEST,
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const confirmation = await executeRegistration(slug, parseResult.data);

    return NextResponse.json(
      {
        success: true,
        registration: confirmation,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RegistrationDomainError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/events/[slug]/register] Internal error:", error);
    return NextResponse.json(
      {
        error: "An internal error occurred while processing your registration.",
        code: RegistrationErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
