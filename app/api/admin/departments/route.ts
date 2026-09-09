import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/departments
 * Retrieves all departments with associated member and recruitment application counts.
 * Protected: CCF_ADMIN and IT_ADMIN only.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
    return NextResponse.json(
      { error: "Insufficient permissions." },
      { status: 403 }
    );
  }

  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            members: true,
            recruitmentApplications: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error("[GET /api/admin/departments] Error loading departments:", error);
    return NextResponse.json(
      { error: "Failed to retrieve departments." },
      { status: 500 }
    );
  }
}
