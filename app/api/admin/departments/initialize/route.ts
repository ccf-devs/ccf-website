import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { CCF_DEPARTMENTS } from "@/lib/data/departments";
import {
  createAuditLog,
  DEPARTMENT_AUDIT_ACTIONS,
} from "@/lib/audit/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/departments/initialize
 * Safely initializes the five canonical CCF departments.
 *
 * Rules:
 * 1. ONLY creates missing canonical departments.
 * 2. NEVER overwrites any existing department data (name, slug, description, active status).
 * 3. If all 5 already exist, returns success with createdCount: 0.
 * 4. Protected: CCF_ADMIN and IT_ADMIN only.
 */
export async function POST() {
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
    // 1. Fetch all existing department slugs
    const existing = await prisma.department.findMany({
      select: { slug: true },
    });
    const existingSlugs = new Set(existing.map((d) => d.slug));

    // 2. Identify which canonical departments are missing
    const missing = CCF_DEPARTMENTS.filter((dept) => !existingSlugs.has(dept.slug));

    // 3. If none missing, return early without mutations
    if (missing.length === 0) {
      return NextResponse.json({
        success: true,
        createdCount: 0,
        message: "All canonical departments are already initialized.",
      });
    }

    // 4. Create ONLY the missing departments
    const created = await Promise.all(
      missing.map((dept) =>
        prisma.department.create({
          data: {
            name: dept.name,
            slug: dept.slug,
            description: dept.description,
            active: true,
          },
        })
      )
    );

    if (created.length > 0) {
      await createAuditLog({
        actorId: admin.id,
        action: DEPARTMENT_AUDIT_ACTIONS.INITIALIZED,
        entityType: "Department",
        entityId: null,
        metadata: {
          createdCount: created.length,
          initializedSlugs: created.map((d) => d.slug),
        },
      });
    }

    return NextResponse.json({
      success: true,
      createdCount: created.length,
      message: `Successfully initialized ${created.length} canonical department(s).`,
      departments: created,
    });
  } catch (error) {
    console.error("[POST /api/admin/departments/initialize] Error:", error);
    return NextResponse.json(
      { error: "Failed to initialize canonical departments." },
      { status: 500 }
    );
  }
}
