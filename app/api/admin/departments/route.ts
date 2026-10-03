import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { createAuditLog, DEPARTMENT_AUDIT_ACTIONS } from "@/lib/audit/log";

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


/**
 * POST /api/admin/departments
 * Creates a new department.
 */
export async function POST(req: Request) {
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
    const body = await req.json();
    const { name, slug, description, active } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Department name and slug are required." },
        { status: 400 }
      );
    }

    const existingName = await prisma.department.findUnique({ where: { name } });
    const existingSlug = await prisma.department.findUnique({ where: { slug } });

    if (existingName || existingSlug) {
      return NextResponse.json(
        { error: "A department with this name or slug already exists." },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        active: active ?? true,
      },
      include: {
        _count: {
          select: { members: true, recruitmentApplications: true },
        },
      }
    });

    await createAuditLog({
      actorId: admin.id,
      action: DEPARTMENT_AUDIT_ACTIONS.INITIALIZED,
      entityType: "Department",
      entityId: department.id,
      metadata: {
        departmentName: department.name,
        slug: department.slug,
        active: department.active
      }
    });
    return NextResponse.json({
      success: true,
      department,
    });
  } catch (error) {
    console.error("[POST /api/admin/departments] Error:", error);
    return NextResponse.json(
      { error: "Failed to create department." },
      { status: 500 }
    );
  }
}
