import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { updateDepartmentSchema } from "@/lib/departments/validation";
import { ZodError } from "zod";
import {
  createAuditLog,
  DEPARTMENT_AUDIT_ACTIONS,
} from "@/lib/audit/log";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/departments/[id]
 * Retrieves a single department by UUID.
 */
export async function GET(req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;

  try {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            recruitmentApplications: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      department,
    });
  } catch (error) {
    console.error(`[GET /api/admin/departments/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve department." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/departments/[id]
 * Updates department description and/or active status.
 * Note: `name` and `slug` are immutable identity fields.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const validated = updateDepartmentSchema.parse(body);

    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Department not found." },
        { status: 404 }
      );
    }

    const dataToUpdate: { description?: string | null; active?: boolean } = {};
    if (validated.description !== undefined) {
      dataToUpdate.description = validated.description;
    }
    if (validated.active !== undefined) {
      dataToUpdate.active = validated.active;
    }

    const updated = await prisma.department.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: {
          select: {
            members: true,
            recruitmentApplications: true,
          },
        },
      },
    });

    const isStatusChanging = validated.active !== undefined && validated.active !== existing.active;

    await createAuditLog({
      actorId: admin.id,
      action: isStatusChanging
        ? DEPARTMENT_AUDIT_ACTIONS.STATUS_CHANGED
        : DEPARTMENT_AUDIT_ACTIONS.UPDATED,
      entityType: "Department",
      entityId: updated.id,
      metadata: {
        departmentName: updated.name,
        slug: updated.slug,
        ...(isStatusChanging && {
          fromActive: existing.active,
          toActive: validated.active,
        }),
        changedFields: Object.keys(dataToUpdate),
      },
    });

    return NextResponse.json({
      success: true,
      department: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    console.error(`[PATCH /api/admin/departments/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update department." },
      { status: 500 }
    );
  }
}
