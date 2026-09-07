import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, RecruitmentStatus } from "@prisma/client";
import { getAdminRecruitmentApplications } from "@/lib/recruitment/service";
import {
  RecruitmentErrorCode,
  RecruitmentDomainError,
} from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/recruitment/applications
 * Lists and filters recruitment applications for authorized administrators.
 */
export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = limitParam
      ? Math.max(1, Math.min(parseInt(limitParam, 10) || 50, 500))
      : undefined;
    const offset = offsetParam
      ? Math.max(0, parseInt(offsetParam, 10) || 0)
      : undefined;

    let status: RecruitmentStatus | undefined;
    if (statusParam && Object.values(RecruitmentStatus).includes(statusParam as any)) {
      status = statusParam as RecruitmentStatus;
    }

    const applications = await getAdminRecruitmentApplications({
      departmentId,
      status,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      applications,
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

    console.error("[GET /api/admin/recruitment/applications] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve recruitment applications.",
        code: RecruitmentErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
