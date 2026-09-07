import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import {
  updateApplicationStatusByAdmin,
  deleteApplicationByAdmin,
} from "@/lib/recruitment/service";
import {
  RecruitmentErrorCode,
  RecruitmentDomainError,
} from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/recruitment/applications/[id]
 * Updates an applicant's recruitment status (Admin-only).
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;

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

    const updated = await updateApplicationStatusByAdmin(id, admin.id, body);

    return NextResponse.json({
      success: true,
      application: updated,
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
          error: "Validation failed for status update.",
          code: RecruitmentErrorCode.INVALID_REQUEST,
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    console.error(`[PATCH /api/admin/recruitment/applications/${id}] Error:`, error);
    return NextResponse.json(
      {
        error: "Failed to update application status.",
        code: RecruitmentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/recruitment/applications/[id]
 * Deletes a recruitment application (Admin-only).
 * Releases the active RRN identity lock so the student can reapply.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;

  try {
    const result = await deleteApplicationByAdmin(id, admin.id);
    return NextResponse.json({
      success: true,
      id: result.id,
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

    console.error(`[DELETE /api/admin/recruitment/applications/${id}] Error:`, error);
    return NextResponse.json(
      {
        error: "Failed to delete recruitment application.",
        code: RecruitmentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
