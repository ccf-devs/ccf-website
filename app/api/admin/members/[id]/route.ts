import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { updateMemberSchema } from "@/lib/members/validation";
import { ZodError } from "zod";
import {
  createAuditLog,
  MEMBER_AUDIT_ACTIONS,
} from "@/lib/audit/log";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/members/[id]
 * Retrieves a single member by UUID.
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
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
          },
        },
        photo: {
          select: {
            id: true,
            objectKey: true,
            altText: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      member,
    });
  } catch (error) {
    console.error(`[GET /api/admin/members/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve member." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/members/[id]
 * Updates member fields.
 *
 * Rules:
 * - Existing members may be edited even if their current department is inactive.
 * - Moving an existing member to a DIFFERENT department requires the target department to be active.
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

    const validated = updateMemberSchema.parse(body);

    const existing = await prisma.member.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Member not found." },
        { status: 404 }
      );
    }

    // Rule 4: Moving an existing member to another department must require the target department to be active.
    if (validated.departmentId && validated.departmentId !== existing.departmentId) {
      const targetDept = await prisma.department.findUnique({
        where: { id: validated.departmentId },
      });

      if (!targetDept) {
        return NextResponse.json(
          { error: "Target department does not exist." },
          { status: 400 }
        );
      }

      if (!targetDept.active) {
        return NextResponse.json(
          { error: "Target department must be active." },
          { status: 400 }
        );
      }
    }

    // Validate photoMediaId if provided and changing
    if (validated.photoMediaId && validated.photoMediaId !== existing.photoMediaId) {
      const media = await prisma.media.findUnique({
        where: { id: validated.photoMediaId },
      });
      if (!media) {
        return NextResponse.json(
          { error: "The selected photo media asset does not exist." },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: Prisma.MemberUpdateInput = {};

    if (validated.name !== undefined) dataToUpdate.name = validated.name;
    if (validated.position !== undefined) dataToUpdate.position = validated.position;
    if (validated.departmentId !== undefined) {
      dataToUpdate.department = { connect: { id: validated.departmentId } };
    }
    if (validated.displayOrder !== undefined) dataToUpdate.displayOrder = validated.displayOrder;
    if (validated.visibility !== undefined) dataToUpdate.visibility = validated.visibility;
    if (validated.bio !== undefined) dataToUpdate.bio = validated.bio;
    if (validated.socialUrl !== undefined) dataToUpdate.socialUrl = validated.socialUrl;
    if (validated.photoMediaId !== undefined) {
      if (validated.photoMediaId === null) {
        dataToUpdate.photo = { disconnect: true };
      } else {
        dataToUpdate.photo = { connect: { id: validated.photoMediaId } };
      }
    }

    const updated = await prisma.member.update({
      where: { id },
      data: dataToUpdate,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
          },
        },
        photo: {
          select: {
            id: true,
            objectKey: true,
            altText: true,
          },
        },
      },
    });

    const isTransfer = validated.departmentId !== undefined && validated.departmentId !== existing.departmentId;
    const isVisibilityChange = validated.visibility !== undefined && validated.visibility !== existing.visibility;

    let action: string = MEMBER_AUDIT_ACTIONS.UPDATED;
    if (isTransfer) {
      action = MEMBER_AUDIT_ACTIONS.TRANSFERRED;
    } else if (isVisibilityChange) {
      action = validated.visibility === false ? MEMBER_AUDIT_ACTIONS.DEACTIVATED : MEMBER_AUDIT_ACTIONS.STATUS_CHANGED;
    }

    await createAuditLog({
      actorId: admin.id,
      action,
      entityType: "Member",
      entityId: updated.id,
      metadata: {
        memberName: updated.name,
        position: updated.position,
        ...(isTransfer && {
          fromDepartmentId: existing.departmentId,
          toDepartmentId: validated.departmentId,
        }),
        ...(isVisibilityChange && {
          fromVisibility: existing.visibility,
          toVisibility: validated.visibility,
        }),
        changedFields: Object.keys(validated),
      },
    });

    return NextResponse.json({
      success: true,
      member: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    console.error(`[PATCH /api/admin/members/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update member." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/members/[id]
 * Soft deactivates a member by setting visibility = false.
 * Rule: NEVER physically delete Member records.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
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
    const existing = await prisma.member.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Member not found." },
        { status: 404 }
      );
    }

    await prisma.member.update({
      where: { id },
      data: { visibility: false },
    });

    await createAuditLog({
      actorId: admin.id,
      action: MEMBER_AUDIT_ACTIONS.DEACTIVATED,
      entityType: "Member",
      entityId: existing.id,
      metadata: {
        memberName: existing.name,
        position: existing.position,
        departmentId: existing.departmentId,
        visibility: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Member deactivated successfully.",
    });
  } catch (error) {
    console.error(`[DELETE /api/admin/members/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to deactivate member." },
      { status: 500 }
    );
  }
}
