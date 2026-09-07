import { prisma } from "@/lib/db/client";
import { RecruitmentStatus } from "@prisma/client";
import {
  createAuditLog,
  RECRUITMENT_AUDIT_ACTIONS,
  buildRecruitmentAuditMetadata,
} from "@/lib/audit/log";
import {
  RecruitmentErrorCode,
  RecruitmentDomainError,
  RecruitmentSettings,
  PublicApplicationSubmissionInput,
  PublicApplicationConfirmationView,
  AdminRecruitmentApplicationItem,
  AdminApplicationFilters,
  AdminUpdateApplicationStatusInput,
  AdminUpdateRecruitmentSettingsInput,
  VALID_RECRUITMENT_TRANSITIONS,
} from "./types";
import {
  normalizeRecruitmentRrn,
  normalizePhone,
  publicRecruitmentApplicationSchema,
  adminUpdateApplicationStatusSchema,
  adminUpdateRecruitmentSettingsSchema,
} from "./validation";

const RECRUITMENT_SETTINGS_KEY = "recruitment_status";

/**
 * Retrieves the current recruitment settings from site_settings.
 * Fails safely to a closed state if unconfigured or unreachable.
 */
export async function getRecruitmentSettings(): Promise<RecruitmentSettings> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: RECRUITMENT_SETTINGS_KEY },
    });

    if (!setting || !setting.value || typeof setting.value !== "object") {
      // Default: recruitment is closed until explicitly opened by an administrator
      return {
        isOpen: false,
        whatsappGroupUrl: null,
      };
    }

    const val = setting.value as Record<string, any>;
    return {
      isOpen: Boolean(val.isOpen),
      whatsappGroupUrl:
        typeof val.whatsappGroupUrl === "string" ? val.whatsappGroupUrl : null,
    };
  } catch (error) {
    console.error("[RecruitmentService] Failed to read recruitment settings:", error);
    // Public DB failure must fail closed for security and correctness
    return {
      isOpen: false,
      whatsappGroupUrl: null,
    };
  }
}

/**
 * Updates recruitment settings in site_settings (Admin-only).
 * Emits an auditable administrative event.
 */
export async function updateRecruitmentSettings(
  adminId: string,
  input: AdminUpdateRecruitmentSettingsInput
): Promise<RecruitmentSettings> {
  if (!adminId) {
    throw new RecruitmentDomainError(
      "Admin ID is required to update recruitment settings.",
      RecruitmentErrorCode.UNAUTHORIZED,
      401
    );
  }

  const parsed = adminUpdateRecruitmentSettingsSchema.parse(input);

  return await prisma.$transaction(async (tx) => {
    const setting = await tx.siteSetting.upsert({
      where: { key: RECRUITMENT_SETTINGS_KEY },
      create: {
        key: RECRUITMENT_SETTINGS_KEY,
        value: {
          isOpen: parsed.isOpen,
          whatsappGroupUrl: parsed.whatsappGroupUrl || null,
        },
        updatedBy: adminId,
      },
      update: {
        value: {
          isOpen: parsed.isOpen,
          whatsappGroupUrl: parsed.whatsappGroupUrl || null,
        },
        updatedBy: adminId,
      },
    });

    await createAuditLog(
      {
        actorId: adminId,
        action: RECRUITMENT_AUDIT_ACTIONS.SETTINGS_UPDATED,
        entityType: "SiteSetting",
        entityId: undefined,
        metadata: buildRecruitmentAuditMetadata({
          isOpen: parsed.isOpen,
        }),
      },
      tx
    );

    const val = setting.value as Record<string, any>;
    return {
      isOpen: Boolean(val.isOpen),
      whatsappGroupUrl:
        typeof val.whatsappGroupUrl === "string" ? val.whatsappGroupUrl : null,
    };
  });
}

/**
 * Submits a public student recruitment application.
 *
 * Rules:
 * - Recruitment MUST be currently open.
 * - Crescent students only (12-digit RRN starting with 2).
 * - Exactly one desired CCF department.
 * - Department must exist and be active.
 * - Same RRN cannot have multiple ACTIVE applications concurrently.
 * - Safe concurrency handling via application check + PostgreSQL partial unique index.
 * - Safe confirmation returned: strictly excludes RRN, phone, and internal database details.
 */
export async function submitRecruitmentApplication(
  rawInput: PublicApplicationSubmissionInput
): Promise<PublicApplicationConfirmationView> {
  // 1. Validate structure
  const parsed = publicRecruitmentApplicationSchema.parse(rawInput);

  // 2. Normalization
  const cleanName = parsed.name.trim();
  const rrnNormalized = normalizeRecruitmentRrn(parsed.rrn);
  const cleanAcademicDept = parsed.academicDepartment.trim();
  const cleanYear = parsed.year.trim();
  const phoneNormalized = normalizePhone(parsed.phone);
  const departmentId = parsed.departmentId.trim();

  // 3. Verify recruitment is open
  const settings = await getRecruitmentSettings();
  if (!settings.isOpen) {
    throw new RecruitmentDomainError(
      "Recruitment is currently closed. Applications are not being accepted at this time.",
      RecruitmentErrorCode.RECRUITMENT_CLOSED,
      400
    );
  }

  // 4. Validate department exists and is active
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, active: true },
  });

  if (!department) {
    throw new RecruitmentDomainError(
      "The selected CCF department does not exist.",
      RecruitmentErrorCode.INVALID_DEPARTMENT,
      404
    );
  }

  if (!department.active) {
    throw new RecruitmentDomainError(
      "The selected CCF department is currently not accepting applications.",
      RecruitmentErrorCode.DEPARTMENT_NOT_ACTIVE,
      400
    );
  }

  // 5. Application-layer duplicate check
  const existingActive = await prisma.recruitmentApplication.findFirst({
    where: {
      rrnNormalized,
      status: RecruitmentStatus.ACTIVE,
    },
  });

  if (existingActive) {
    throw new RecruitmentDomainError(
      "An active recruitment application already exists for this Crescent RRN. Students may submit only one active application at a time.",
      RecruitmentErrorCode.DUPLICATE_APPLICATION,
      409
    );
  }

  // 6. Safe creation with database constraint race handling
  try {
    const created = await prisma.recruitmentApplication.create({
      data: {
        rrnNormalized,
        name: cleanName,
        departmentId: department.id,
        academicDepartment: cleanAcademicDept,
        year: cleanYear,
        phone: phoneNormalized,
        status: RecruitmentStatus.ACTIVE,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      id: created.id,
      name: created.name,
      departmentId: created.departmentId,
      departmentName: created.department.name,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      whatsappGroupUrl: settings.whatsappGroupUrl || null,
    };
  } catch (error: any) {
    // P2002: Unique constraint violation (from PostgreSQL partial unique index ra_active_rrn_unique)
    if (error?.code === "P2002") {
      throw new RecruitmentDomainError(
        "An active recruitment application already exists for this Crescent RRN. Students may submit only one active application at a time.",
        RecruitmentErrorCode.DUPLICATE_APPLICATION,
        409
      );
    }
    throw error;
  }
}

/**
 * Retrieves recruitment applications for the admin console with optional filtering and search.
 */
export async function getAdminRecruitmentApplications(
  filters: AdminApplicationFilters = {}
): Promise<AdminRecruitmentApplicationItem[]> {
  const where: any = {};

  if (filters.departmentId && filters.departmentId !== "ALL") {
    where.departmentId = filters.departmentId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search && filters.search.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { rrnNormalized: { contains: search } },
      { academicDepartment: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const applications = await prisma.recruitmentApplication.findMany({
    where,
    include: {
      department: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 200,
    skip: filters.offset ?? 0,
  });

  return applications.map((app) => ({
    id: app.id,
    rrnNormalized: app.rrnNormalized,
    name: app.name,
    departmentId: app.departmentId,
    departmentName: app.department.name,
    departmentSlug: app.department.slug,
    academicDepartment: app.academicDepartment,
    year: app.year,
    phone: app.phone,
    status: app.status,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }));
}

/**
 * Retrieves a single application by ID for administrator inspection.
 */
export async function getAdminRecruitmentApplicationById(
  id: string
): Promise<AdminRecruitmentApplicationItem> {
  if (!id) {
    throw new RecruitmentDomainError(
      "Application ID is required.",
      RecruitmentErrorCode.INVALID_REQUEST,
      400
    );
  }

  const app = await prisma.recruitmentApplication.findUnique({
    where: { id },
    include: {
      department: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!app) {
    throw new RecruitmentDomainError(
      "Recruitment application not found.",
      RecruitmentErrorCode.APPLICATION_NOT_FOUND,
      404
    );
  }

  return {
    id: app.id,
    rrnNormalized: app.rrnNormalized,
    name: app.name,
    departmentId: app.departmentId,
    departmentName: app.department.name,
    departmentSlug: app.department.slug,
    academicDepartment: app.academicDepartment,
    year: app.year,
    phone: app.phone,
    status: app.status,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

/**
 * Updates application status by administrator.
 *
 * Allowed State Machine:
 * - ACTIVE -> SELECTED
 * - ACTIVE -> REJECTED
 * - ACTIVE -> WITHDRAWN
 * - SELECTED -> ACTIVE
 * - REJECTED -> ACTIVE
 * - WITHDRAWN -> ACTIVE (only if no other ACTIVE application exists for this RRN)
 * - SELECTED -> REJECTED
 * - REJECTED -> SELECTED
 * - Idempotent: transition to current status returns safely without writes
 */
export async function updateApplicationStatusByAdmin(
  id: string,
  adminId: string,
  input: AdminUpdateApplicationStatusInput
): Promise<AdminRecruitmentApplicationItem> {
  if (!id) {
    throw new RecruitmentDomainError(
      "Application ID is required.",
      RecruitmentErrorCode.INVALID_REQUEST,
      400
    );
  }

  if (!adminId) {
    throw new RecruitmentDomainError(
      "Admin ID is required for status updates.",
      RecruitmentErrorCode.UNAUTHORIZED,
      401
    );
  }

  const parsed = adminUpdateApplicationStatusSchema.parse(input);

  return await prisma.$transaction(async (tx) => {
    const app = await tx.recruitmentApplication.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!app) {
      throw new RecruitmentDomainError(
        "Recruitment application not found.",
        RecruitmentErrorCode.APPLICATION_NOT_FOUND,
        404
      );
    }

    // Idempotent: already in target status
    if (app.status === parsed.status) {
      return {
        id: app.id,
        rrnNormalized: app.rrnNormalized,
        name: app.name,
        departmentId: app.departmentId,
        departmentName: app.department.name,
        departmentSlug: app.department.slug,
        academicDepartment: app.academicDepartment,
        year: app.year,
        phone: app.phone,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
      };
    }

    // State machine transition validation
    const allowedTransitions = VALID_RECRUITMENT_TRANSITIONS[app.status] || [];
    if (!allowedTransitions.includes(parsed.status)) {
      throw new RecruitmentDomainError(
        `Cannot transition recruitment application from ${app.status} to ${parsed.status}.`,
        RecruitmentErrorCode.INVALID_STATUS_TRANSITION,
        400
      );
    }

    // If moving back to ACTIVE, ensure no competing ACTIVE application exists for this RRN
    if (parsed.status === RecruitmentStatus.ACTIVE) {
      const existingActive = await tx.recruitmentApplication.findFirst({
        where: {
          rrnNormalized: app.rrnNormalized,
          status: RecruitmentStatus.ACTIVE,
          NOT: { id: app.id },
        },
      });

      if (existingActive) {
        throw new RecruitmentDomainError(
          "Cannot reactivate this application because another active application already exists for this RRN.",
          RecruitmentErrorCode.DUPLICATE_APPLICATION,
          409
        );
      }
    }

    const updated = await tx.recruitmentApplication.update({
      where: { id },
      data: { status: parsed.status },
      include: {
        department: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    await createAuditLog(
      {
        actorId: adminId,
        action: RECRUITMENT_AUDIT_ACTIONS.STATUS_CHANGED,
        entityType: "RecruitmentApplication",
        entityId: updated.id,
        metadata: buildRecruitmentAuditMetadata({
          applicationId: updated.id,
          departmentId: updated.departmentId,
          departmentName: updated.department.name,
          fromStatus: app.status,
          toStatus: updated.status,
          notes: parsed.notes || null,
        }),
      },
      tx
    );

    return {
      id: updated.id,
      rrnNormalized: updated.rrnNormalized,
      name: updated.name,
      departmentId: updated.departmentId,
      departmentName: updated.department.name,
      departmentSlug: updated.department.slug,
      academicDepartment: updated.academicDepartment,
      year: updated.year,
      phone: updated.phone,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}

/**
 * Permanently deletes an application by an administrator.
 *
 * Rules:
 * - Releases the active RRN uniqueness lock.
 * - Allows the same student/RRN to submit a new application.
 * - Emits auditable administrative event (strictly scrubbed of RRN and phone).
 */
export async function deleteApplicationByAdmin(
  id: string,
  adminId: string
): Promise<{ success: true; id: string }> {
  if (!id) {
    throw new RecruitmentDomainError(
      "Application ID is required.",
      RecruitmentErrorCode.INVALID_REQUEST,
      400
    );
  }

  if (!adminId) {
    throw new RecruitmentDomainError(
      "Admin ID is required for deletion.",
      RecruitmentErrorCode.UNAUTHORIZED,
      401
    );
  }

  return await prisma.$transaction(async (tx) => {
    const app = await tx.recruitmentApplication.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!app) {
      throw new RecruitmentDomainError(
        "Recruitment application not found.",
        RecruitmentErrorCode.APPLICATION_NOT_FOUND,
        404
      );
    }

    await tx.recruitmentApplication.delete({
      where: { id },
    });

    await createAuditLog(
      {
        actorId: adminId,
        action: RECRUITMENT_AUDIT_ACTIONS.APPLICATION_DELETED,
        entityType: "RecruitmentApplication",
        entityId: app.id,
        metadata: buildRecruitmentAuditMetadata({
          applicationId: app.id,
          departmentId: app.departmentId,
          departmentName: app.department.name,
          fromStatus: app.status,
        }),
      },
      tx
    );

    return { success: true, id: app.id };
  });
}
