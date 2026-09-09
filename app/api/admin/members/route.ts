import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { createMemberSchema } from "@/lib/members/validation";
import { ZodError } from "zod";
import {
  createAuditLog,
  MEMBER_AUDIT_ACTIONS,
} from "@/lib/audit/log";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/members
 * Retrieves all members with department and photo relations.
 * Supports query params: departmentId, visibility (all | active | inactive), search (name/position).
 * Protected: CCF_ADMIN and IT_ADMIN only.
 */
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");
  const visibility = searchParams.get("visibility");
  const search = searchParams.get("search");

  const where: Prisma.MemberWhereInput = {};

  if (departmentId && departmentId !== "ALL") {
    where.departmentId = departmentId;
  }

  if (visibility === "active") {
    where.visibility = true;
  } else if (visibility === "inactive") {
    where.visibility = false;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { position: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const members = await prisma.member.findMany({
      where,
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
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("[GET /api/admin/members] Error loading members:", error);
    return NextResponse.json(
      { error: "Failed to retrieve members." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/members
 * Creates a new member.
 * Rule: New members may ONLY be assigned to an active department.
 */
export async function POST(req: NextRequest) {
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const validated = createMemberSchema.parse(body);

    // Rule 4: New members may only be assigned to active departments.
    const department = await prisma.department.findUnique({
      where: { id: validated.departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: "The selected department does not exist." },
        { status: 400 }
      );
    }

    if (!department.active) {
      return NextResponse.json(
        { error: "New members may only be assigned to an active department." },
        { status: 400 }
      );
    }

    // Check photoMediaId if provided
    if (validated.photoMediaId) {
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

    const member = await prisma.member.create({
      data: {
        name: validated.name,
        position: validated.position || null,
        departmentId: validated.departmentId,
        displayOrder: validated.displayOrder,
        visibility: validated.visibility,
        bio: validated.bio || null,
        socialUrl: validated.socialUrl || null,
        photoMediaId: validated.photoMediaId || null,
      },
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

    await createAuditLog({
      actorId: admin.id,
      action: MEMBER_AUDIT_ACTIONS.CREATED,
      entityType: "Member",
      entityId: member.id,
      metadata: {
        memberName: member.name,
        position: member.position,
        departmentId: member.departmentId,
        departmentName: department.name,
      },
    });

    return NextResponse.json(
      {
        success: true,
        member,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/members] Error creating member:", error);
    return NextResponse.json(
      { error: "Failed to create member." },
      { status: 500 }
    );
  }
}
