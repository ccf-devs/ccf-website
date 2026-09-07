import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { submitRecruitmentApplication } from "@/lib/recruitment/service";
import {
  RecruitmentErrorCode,
  RecruitmentDomainError,
} from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/recruitment/applications
 * Public applicant submission endpoint.
 *
 * Validates payload, checks active duplicate RRNs, safely handles concurrency,
 * and returns minimal safe confirmation data without leaking applicant RRN or phone.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body.",
          code: RecruitmentErrorCode.INVALID_REQUEST,
        },
        { status: 400 }
      );
    }

    const result = await submitRecruitmentApplication(body);

    return NextResponse.json(
      {
        success: true,
        application: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RecruitmentDomainError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed for recruitment application.",
          code: RecruitmentErrorCode.INVALID_REQUEST,
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    console.error("[POST /api/recruitment/applications] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An internal error occurred while submitting your application. Please try again.",
        code: RecruitmentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
