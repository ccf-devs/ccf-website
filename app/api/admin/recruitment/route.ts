import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import {
  getRecruitmentSettings,
  updateRecruitmentSettings,
} from "@/lib/recruitment/service";
import {
  RecruitmentErrorCode,
  RecruitmentDomainError,
} from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/recruitment
 * Returns the current recruitment settings (Admin-only).
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        error: "Authentication required.",
        code: RecruitmentErrorCode.UNAUTHORIZED,
      },
      { status: 401 }
    );
  }

  if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
    return NextResponse.json(
      {
        error: "Insufficient permissions.",
        code: RecruitmentErrorCode.UNAUTHORIZED,
      },
      { status: 403 }
    );
  }

  try {
    const settings = await getRecruitmentSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("[GET /api/admin/recruitment] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve recruitment settings.",
        code: RecruitmentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/recruitment
 * Toggles recruitment open/closed or updates public recruitment configuration (Admin-only).
 */
export async function PATCH(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        error: "Authentication required.",
        code: RecruitmentErrorCode.UNAUTHORIZED,
      },
      { status: 401 }
    );
  }

  if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
    return NextResponse.json(
      {
        error: "Insufficient permissions.",
        code: RecruitmentErrorCode.UNAUTHORIZED,
      },
      { status: 403 }
    );
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body.",
          code: RecruitmentErrorCode.INVALID_REQUEST,
        },
        { status: 400 }
      );
    }

    const updated = await updateRecruitmentSettings(admin.id, body);

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (error) {
    if (error instanceof RecruitmentDomainError) {
      return NextResponse.json(
        {
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
          error: "Validation failed for recruitment settings.",
          code: RecruitmentErrorCode.INVALID_REQUEST,
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/admin/recruitment] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "An internal error occurred while updating recruitment settings.",
        code: RecruitmentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
