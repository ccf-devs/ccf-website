import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, RecruitmentStatus } from "@prisma/client";
import { getAdminRecruitmentApplications } from "@/lib/recruitment/service";
import { generateSafeExportFilename } from "@/lib/csv/generator";
import { transformRecruitmentApplicationsToCsvRows } from "@/lib/csv/recruitment";
import { generateXlsx } from "@/lib/xlsx/generator";
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

    const transformedData = transformRecruitmentApplicationsToCsvRows(applications);
    const xlsxBuffer = await generateXlsx(transformedData);
    
    // Replace .csv with .xlsx in safe filename
    const filename = generateSafeExportFilename("recruitment-applications").replace(".csv", ".xlsx");

    await createAuditLog({
      actorId: admin.id,
      action: RECRUITMENT_AUDIT_ACTIONS.EXPORTED,
      entityType: "Recruitment",
      metadata: sanitizeAuditMetadata({
        count: applications.length,
        format: "XLSX",
        departmentId,
        status,
      }),
    });

    return new NextResponse(xlsxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/recruitment/applications/export-xlsx] Error:", error);
    return NextResponse.json({ error: "Failed to export recruitment applications." }, { status: 500 });
  }
}
