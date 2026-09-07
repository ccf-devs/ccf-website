import { RecruitmentStatus } from "@prisma/client";

/**
 * Standard Handbook-defined Error Codes for the Recruitment System
 */
export const RecruitmentErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  RECRUITMENT_CLOSED: "RECRUITMENT_CLOSED",
  INVALID_RRN: "INVALID_RRN",
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_DEPARTMENT: "INVALID_DEPARTMENT",
  DEPARTMENT_NOT_ACTIVE: "DEPARTMENT_NOT_ACTIVE",
  DUPLICATE_APPLICATION: "DUPLICATE_APPLICATION",
  APPLICATION_NOT_FOUND: "APPLICATION_NOT_FOUND",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  UNAUTHORIZED: "UNAUTHORIZED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type RecruitmentErrorCode =
  (typeof RecruitmentErrorCode)[keyof typeof RecruitmentErrorCode];

/**
 * Canonical Recruitment Application State Machine Transitions:
 * - ACTIVE    -> SELECTED | REJECTED | WITHDRAWN
 * - SELECTED  -> ACTIVE | REJECTED
 * - REJECTED  -> ACTIVE | SELECTED
 * - WITHDRAWN -> ACTIVE (only if no competing ACTIVE application for RRN)
 * - Same-status is idempotent
 */
export const VALID_RECRUITMENT_TRANSITIONS: Record<
  RecruitmentStatus,
  readonly RecruitmentStatus[]
> = {
  [RecruitmentStatus.ACTIVE]: [
    RecruitmentStatus.SELECTED,
    RecruitmentStatus.REJECTED,
    RecruitmentStatus.WITHDRAWN,
  ],
  [RecruitmentStatus.SELECTED]: [
    RecruitmentStatus.ACTIVE,
    RecruitmentStatus.REJECTED,
  ],
  [RecruitmentStatus.REJECTED]: [
    RecruitmentStatus.ACTIVE,
    RecruitmentStatus.SELECTED,
  ],
  [RecruitmentStatus.WITHDRAWN]: [
    RecruitmentStatus.ACTIVE,
  ],
} as const;


/**
 * Application domain error for Recruitment operations
 */
export class RecruitmentDomainError extends Error {
  public readonly code: RecruitmentErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: RecruitmentErrorCode,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "RecruitmentDomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Persisted recruitment settings stored in site_settings
 */
export interface RecruitmentSettings {
  isOpen: boolean;
  whatsappGroupUrl?: string | null;
}

/**
 * Public safe recruitment status view
 */
export interface PublicRecruitmentStatusView {
  isOpen: boolean;
}


/**
 * Public recruitment application submission payload
 */
export interface PublicApplicationSubmissionInput {
  name: string;
  rrn: string;
  departmentId: string;
  academicDepartment: string;
  year: string;
  phone: string;
}

/**
 * Safe confirmation response returned to public applicant
 * Strictly excludes RRN, phone, and internal database metadata
 */
export interface PublicApplicationConfirmationView {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  status: RecruitmentStatus;
  createdAt: string;
  whatsappGroupUrl?: string | null;
}

/**
 * Administrator view of a recruitment application
 */
export interface AdminRecruitmentApplicationItem {
  id: string;
  rrnNormalized: string;
  name: string;
  departmentId: string;
  departmentName: string;
  departmentSlug: string;
  academicDepartment: string;
  year: string;
  phone: string;
  status: RecruitmentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filter options for querying applications in the admin console
 */
export interface AdminApplicationFilters {
  search?: string;
  departmentId?: string;
  status?: RecruitmentStatus;
  limit?: number;
  offset?: number;
}

/**
 * Admin input for updating application status
 */
export interface AdminUpdateApplicationStatusInput {
  status: RecruitmentStatus;
  notes?: string;
}

/**
 * Admin input for updating recruitment settings
 */
export interface AdminUpdateRecruitmentSettingsInput {
  isOpen: boolean;
  whatsappGroupUrl?: string | null;
}
