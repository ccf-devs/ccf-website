import { prisma } from "@/lib/db/client";
import {
  EventStatus,
  RegistrationStatus,
  PaymentStatus,
  RecruitmentStatus,
} from "@prisma/client";
import {
  AdminDashboardResult,
  DashboardAlert,
  RecentActivityItem,
  RecentRegistrationItem,
} from "./types";

const RECRUITMENT_SETTINGS_KEY = "recruitment_status";

/**
 * Maps audit log action types and safe metadata to a concise, human-readable summary.
 * Strictly guarantees that no sensitive fields (RRN, phone numbers, auth secrets)
 * are ever presented on the dashboard.
 */
function formatAuditSummary(
  action: string,
  entityType: string,
  metadata: any
): string {
  const meta = metadata && typeof metadata === "object" ? metadata : {};

  switch (action) {
    case "EVENT_CREATED":
      return `Created event "${meta.eventName || "New Event"}"`;
    case "EVENT_UPDATED":
      return `Updated event configuration`;
    case "EVENT_STATUS_CHANGED":
      return `Changed event status from ${meta.fromStatus || "DRAFT"} to ${meta.toStatus || "PUBLISHED"}`;
    case "PAYMENT_VERIFIED":
      return `Verified payment for ${meta.registrationCode || "registration"}`;
    case "PAYMENT_REJECTED":
      return `Rejected payment for ${meta.registrationCode || "registration"}`;
    case "RECRUITMENT_SETTINGS_UPDATED":
      return `Updated recruitment intake settings (${meta.isOpen ? "Opened" : "Closed"})`;
    case "RECRUITMENT_STATUS_CHANGED":
      return `Updated recruitment application status to ${meta.toStatus || "Updated"}`;
    case "RECRUITMENT_APPLICATION_DELETED":
      return `Deleted recruitment application and released active lock`;
    case "REGISTRATION_CANCELLED":
      return `Cancelled registration ${meta.registrationCode || ""}`.trim();
    default:
      return `${action.replace(/_/g, " ").toLowerCase()} on ${entityType.toLowerCase()}`;
  }
}

/**
 * Loads aggregated operational dashboard data for the CCF administrator console.
 *
 * Executes parallel, indexed queries across Events, Registrations, Payments,
 * Recruitment, and Audit Logs. Fails closed cleanly on any database connectivity
 * failure without leaking raw Prisma exceptions.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardResult> {
  const generatedAt = new Date().toISOString();

  try {
    const now = new Date();

    const [
      totalEvents,
      publishedEvents,
      upcomingEvents,
      draftEvents,
      totalRegistrations,
      activeRegistrations,
      totalParticipants,
      activeTeams,
      pendingPayments,
      verifiedPayments,
      rejectedPayments,
      recruitmentSetting,
      totalApplications,
      activeApplications,
      selectedApplications,
      rejectedApplications,
      recentAuditLogs,
      recentRegistrationsRaw,
    ] = await Promise.all([
      // Events counts
      prisma.event.count(),
      prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
      prisma.event.count({
        where: {
          status: EventStatus.PUBLISHED,
          startsAt: { gte: now },
        },
      }),
      prisma.event.count({ where: { status: EventStatus.DRAFT } }),

      // Registrations & participation counts
      prisma.registration.count(),
      prisma.registration.count({
        where: { status: RegistrationStatus.ACTIVE },
      }),
      prisma.eventParticipant.count(),
      prisma.team.count({
        where: { registration: { status: RegistrationStatus.ACTIVE } },
      }),

      // Payment operations counts
      prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
      prisma.payment.count({ where: { status: PaymentStatus.VERIFIED } }),
      prisma.payment.count({ where: { status: PaymentStatus.REJECTED } }),

      // Recruitment intake settings & counts (authoritative query; throws on DB error)
      prisma.siteSetting.findUnique({
        where: { key: RECRUITMENT_SETTINGS_KEY },
      }),
      prisma.recruitmentApplication.count(),
      prisma.recruitmentApplication.count({
        where: { status: RecruitmentStatus.ACTIVE },
      }),
      prisma.recruitmentApplication.count({
        where: { status: RecruitmentStatus.SELECTED },
      }),
      prisma.recruitmentApplication.count({
        where: { status: RecruitmentStatus.REJECTED },
      }),

      // Bounded recent activity stream (take: 8)
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),

      // Bounded recent registrations (take: 5)
      prisma.registration.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          registrationCode: true,
          registrationType: true,
          status: true,
          participantType: true,
          createdAt: true,
          event: {
            select: {
              name: true,
            },
          },
          payment: {
            select: {
              status: true,
            },
          },
        },
      }),
    ]);

    // Parse recruitment portal open status from siteSetting safely
    const recruitmentIsOpen = Boolean(
      recruitmentSetting?.value &&
        typeof recruitmentSetting.value === "object" &&
        (recruitmentSetting.value as Record<string, any>).isOpen
    );

    // Build operational alerts
    const alerts: DashboardAlert[] = [];

    if (pendingPayments > 0) {
      alerts.push({
        id: "alert-pending-payments",
        title: "Pending Payment Verifications",
        message: `${pendingPayments} ${pendingPayments === 1 ? "payment is" : "payments are"} awaiting administrator review and verification.`,
        severity: "warning",
        actionUrl: "/admin/registrations",
        actionLabel: "Review Payments",
      });
    }

    if (recruitmentIsOpen) {
      alerts.push({
        id: "alert-recruitment-open",
        title: "Recruitment Portal Active",
        message: `Public student intake is currently OPEN (${activeApplications} active ${activeApplications === 1 ? "application" : "applications"}).`,
        severity: "info",
        actionUrl: "/admin/recruitment",
        actionLabel: "Manage Intake",
      });
    }

    // Format recent activity items
    const recentActivities: RecentActivityItem[] = recentAuditLogs.map(
      (log) => ({
        id: log.id,
        actorName: log.actor?.name || log.actor?.email || "System",
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        summary: formatAuditSummary(log.action, log.entityType, log.metadata),
        createdAt: log.createdAt.toISOString(),
      })
    );

    // Format recent registration summary
    const recentRegistrations: RecentRegistrationItem[] =
      recentRegistrationsRaw.map((reg) => ({
        id: reg.id,
        eventName: reg.event?.name || "Event",
        registrationCode: reg.registrationCode,
        registrationType: reg.registrationType,
        status: reg.status,
        participantType: reg.participantType,
        paymentStatus: reg.payment?.status || null,
        createdAt: reg.createdAt.toISOString(),
      }));

    return {
      success: true,
      metrics: {
        events: {
          total: totalEvents,
          published: publishedEvents,
          upcoming: upcomingEvents,
          draft: draftEvents,
        },
        registrations: {
          total: totalRegistrations,
          active: activeRegistrations,
          totalParticipants,
          activeTeams,
        },
        payments: {
          pending: pendingPayments,
          verified: verifiedPayments,
          rejected: rejectedPayments,
        },
        recruitment: {
          isOpen: recruitmentIsOpen,
          total: totalApplications,
          active: activeApplications,
          selected: selectedApplications,
          rejected: rejectedApplications,
        },
      },
      alerts,
      recentActivities,
      recentRegistrations,
      generatedAt,
    };
  } catch (err: any) {
    // Fail closed cleanly on database exception without exposing raw Prisma or SQL errors
    console.error(
      "[AdminDashboardService] Failed to load dashboard data, failing closed:",
      err?.message || err
    );

    return {
      success: false,
      error: "Live operational data is temporarily unavailable.",
      generatedAt,
    };
  }
}
