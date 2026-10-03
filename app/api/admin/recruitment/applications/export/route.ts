import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, RecruitmentStatus } from "@prisma/client";
import { getAdminRecruitmentApplications } from "@/lib/recruitment/service";
import { generateCsv, generateSafeExportFilename } from "@/lib/csv/generator";
import { transformRecruitmentApplicationsToCsvRows } from "@/lib/csv/recruitment";
import { createAuditLog, RECRUITMENT_AUDIT_ACTIONS, sanitizeAuditMetadata } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    let status: RecruitmentStatus | undefined;
    if (statusParam && Object.values(RecruitmentStatus).includes(statusParam as any)) {
      status = statusParam as RecruitmentStatus;
    }

    const applications = await getAdminRecruitmentApplications({
      departmentId,
      status,
      search,
    });

    const { columns, rows } = transformRecruitmentApplicationsToCsvRows(applications);
    const csvContent = generateCsv(columns, rows, { withBom: true });
    
    // Naming convention similar to registrations, but for recruitment
    const filename = generateSafeExportFilename("recruitment-applications");

    await createAuditLog({
      actorId: admin.id,
      action: RECRUITMENT_AUDIT_ACTIONS.EXPORTED,
      entityType: "Recruitment",
      metadata: sanitizeAuditMetadata({
        count: applications.length,
        format: "CSV",
        departmentId,
        status,
      }),
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/recruitment/applications/export] Error:", error);
    return NextResponse.json({ error: "Failed to export recruitment applications." }, { status: 500 });
  }
}
