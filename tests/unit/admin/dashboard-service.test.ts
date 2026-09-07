import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { prisma } from "@/lib/db/client";
import {
  EventStatus,
  RegistrationStatus,
  PaymentStatus,
  RecruitmentStatus,
} from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      count: vi.fn(),
    },
    registration: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    eventParticipant: {
      count: vi.fn(),
    },
    team: {
      count: vi.fn(),
    },
    payment: {
      count: vi.fn(),
    },
    siteSetting: {
      findUnique: vi.fn(),
    },
    recruitmentApplication: {
      count: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Dashboard Service Layer Unit Tests (Phase 12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Metric Aggregations & Data Assembly", () => {
    it("returns fully aggregated live metrics when database queries succeed", async () => {
      // Event counts: total=5, published=3, upcoming=2, draft=2
      (prisma.event.count as any)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2);

      // Registration counts: total=120, active=110, participants=150, teams=25
      (prisma.registration.count as any)
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(110);
      (prisma.eventParticipant.count as any).mockResolvedValueOnce(150);
      (prisma.team.count as any).mockResolvedValueOnce(25);

      // Payment counts: pending=4, verified=90, rejected=10
      (prisma.payment.count as any)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(10);

      // Recruitment settings & counts: open=true, total=45, active=35, selected=8, rejected=2
      (prisma.siteSetting.findUnique as any).mockResolvedValueOnce({
        key: "recruitment_status",
        value: {
          isOpen: true,
          whatsappGroupUrl: "https://chat.whatsapp.com/test",
        },
      });
      (prisma.recruitmentApplication.count as any)
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(35)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2);

      // Recent audit logs
      (prisma.auditLog.findMany as any).mockResolvedValueOnce([
        {
          id: "audit-1",
          actor: { name: "Salman Khan", email: "salman@ccf.com" },
          action: "PAYMENT_VERIFIED",
          entityType: "PAYMENT",
          entityId: "pay-1",
          metadata: { registrationCode: "REG-2026-001" },
          createdAt: new Date("2026-09-08T00:00:00Z"),
        },
        {
          id: "audit-2",
          actor: null,
          action: "EVENT_CREATED",
          entityType: "EVENT",
          entityId: "evt-1",
          metadata: { eventName: "Magnora 26" },
          createdAt: new Date("2026-09-07T22:00:00Z"),
        },
      ]);

      // Recent registrations
      (prisma.registration.findMany as any).mockResolvedValueOnce([
        {
          id: "reg-1",
          registrationCode: "REG-2026-001",
          registrationType: "INDIVIDUAL",
          status: "ACTIVE",
          participantType: "CRESCENT",
          createdAt: new Date("2026-09-08T00:00:00Z"),
          event: { name: "Magnora 26" },
          payment: { status: "VERIFIED" },
        },
      ]);

      const result = await getAdminDashboardData();

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Check Events metrics
      expect(result.metrics.events.total).toBe(5);
      expect(result.metrics.events.published).toBe(3);
      expect(result.metrics.events.upcoming).toBe(2);
      expect(result.metrics.events.draft).toBe(2);

      // Check Registrations metrics
      expect(result.metrics.registrations.total).toBe(120);
      expect(result.metrics.registrations.active).toBe(110);
      expect(result.metrics.registrations.totalParticipants).toBe(150);
      expect(result.metrics.registrations.activeTeams).toBe(25);

      // Check Payments metrics
      expect(result.metrics.payments.pending).toBe(4);
      expect(result.metrics.payments.verified).toBe(90);
      expect(result.metrics.payments.rejected).toBe(10);

      // Check Recruitment metrics
      expect(result.metrics.recruitment.isOpen).toBe(true);
      expect(result.metrics.recruitment.total).toBe(45);
      expect(result.metrics.recruitment.active).toBe(35);
      expect(result.metrics.recruitment.selected).toBe(8);
      expect(result.metrics.recruitment.rejected).toBe(2);

      // Check alerts generated
      expect(result.alerts).toHaveLength(2);
      expect(result.alerts.some((a) => a.id === "alert-pending-payments")).toBe(true);
      expect(result.alerts.some((a) => a.id === "alert-recruitment-open")).toBe(true);

      // Check recent activities formatted and sanitized
      expect(result.recentActivities).toHaveLength(2);
      expect(result.recentActivities[0].actorName).toBe("Salman Khan");
      expect(result.recentActivities[0].summary).toBe(
        'Verified payment for REG-2026-001'
      );
      expect(result.recentActivities[1].actorName).toBe("System");
      expect(result.recentActivities[1].summary).toBe('Created event "Magnora 26"');

      // Check recent registrations formatted
      expect(result.recentRegistrations).toHaveLength(1);
      expect(result.recentRegistrations[0].registrationCode).toBe("REG-2026-001");
      expect(result.recentRegistrations[0].eventName).toBe("Magnora 26");
    });

    it("correctly distinguishes zero records from database failure", async () => {
      // All counts return 0 (a brand new empty database)
      (prisma.event.count as any).mockResolvedValue(0);
      (prisma.registration.count as any).mockResolvedValue(0);
      (prisma.eventParticipant.count as any).mockResolvedValue(0);
      (prisma.team.count as any).mockResolvedValue(0);
      (prisma.payment.count as any).mockResolvedValue(0);
      (prisma.siteSetting.findUnique as any).mockResolvedValue(null);
      (prisma.recruitmentApplication.count as any).mockResolvedValue(0);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);
      (prisma.registration.findMany as any).mockResolvedValue([]);

      const result = await getAdminDashboardData();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.metrics.events.total).toBe(0);
      expect(result.metrics.registrations.total).toBe(0);
      expect(result.metrics.payments.pending).toBe(0);
      expect(result.metrics.recruitment.total).toBe(0);
      expect(result.metrics.recruitment.isOpen).toBe(false);

      // When pendingPayments is 0 and recruitment is closed, alerts array is empty
      expect(result.alerts).toHaveLength(0);
      expect(result.recentActivities).toHaveLength(0);
      expect(result.recentRegistrations).toHaveLength(0);
    });
  });

  describe("2. Operational Alerts Rules", () => {
    it("generates warning alert when pendingPayments > 0 and suppresses when 0", async () => {
      (prisma.event.count as any).mockResolvedValue(0);
      (prisma.registration.count as any).mockResolvedValue(0);
      (prisma.eventParticipant.count as any).mockResolvedValue(0);
      (prisma.team.count as any).mockResolvedValue(0);
      (prisma.siteSetting.findUnique as any).mockResolvedValue(null);
      (prisma.recruitmentApplication.count as any).mockResolvedValue(0);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);
      (prisma.registration.findMany as any).mockResolvedValue([]);

      // 1. With pendingPayments = 3
      (prisma.payment.count as any)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const res1 = await getAdminDashboardData();
      expect(res1.success).toBe(true);
      if (res1.success) {
        expect(res1.alerts).toHaveLength(1);
        expect(res1.alerts[0].id).toBe("alert-pending-payments");
        expect(res1.alerts[0].message).toContain("3 payments are awaiting");
        expect(res1.alerts[0].actionUrl).toBe("/admin/registrations");
      }

      // 2. With pendingPayments = 0
      vi.clearAllMocks();
      (prisma.event.count as any).mockResolvedValue(0);
      (prisma.registration.count as any).mockResolvedValue(0);
      (prisma.eventParticipant.count as any).mockResolvedValue(0);
      (prisma.team.count as any).mockResolvedValue(0);
      (prisma.payment.count as any).mockResolvedValue(0);
      (prisma.siteSetting.findUnique as any).mockResolvedValue(null);
      (prisma.recruitmentApplication.count as any).mockResolvedValue(0);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);
      (prisma.registration.findMany as any).mockResolvedValue([]);

      const res2 = await getAdminDashboardData();
      expect(res2.success).toBe(true);
      if (res2.success) {
        expect(res2.alerts).toHaveLength(0);
      }
    });
  });

  describe("3. Bounded Queries & Privacy Verification", () => {
    it("enforces explicit bounded limits on audit logs (8) and registrations (5)", async () => {
      (prisma.event.count as any).mockResolvedValue(0);
      (prisma.registration.count as any).mockResolvedValue(0);
      (prisma.eventParticipant.count as any).mockResolvedValue(0);
      (prisma.team.count as any).mockResolvedValue(0);
      (prisma.payment.count as any).mockResolvedValue(0);
      (prisma.siteSetting.findUnique as any).mockResolvedValue(null);
      (prisma.recruitmentApplication.count as any).mockResolvedValue(0);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);
      (prisma.registration.findMany as any).mockResolvedValue([]);

      await getAdminDashboardData();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: expect.anything(),
      });

      expect(prisma.registration.findMany).toHaveBeenCalledWith({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: expect.anything(),
      });
    });

    it("ensures recent activity summaries strictly scrub sensitive data (RRN, phone, UTR, token, password, totp, recoveryCode)", async () => {
      (prisma.event.count as any).mockResolvedValue(0);
      (prisma.registration.count as any).mockResolvedValue(0);
      (prisma.eventParticipant.count as any).mockResolvedValue(0);
      (prisma.team.count as any).mockResolvedValue(0);
      (prisma.payment.count as any).mockResolvedValue(0);
      (prisma.siteSetting.findUnique as any).mockResolvedValue(null);
      (prisma.recruitmentApplication.count as any).mockResolvedValue(0);

      const sensitivePayload = {
        rrn: "210071601050",
        phone: "+919876543210",
        utr: "123456789012",
        token: "secret-auth-token-xyz",
        password: "supersecretpassword123",
        totpSecret: "JBSWY3DPEHPK3PXP",
        recoveryCode: "ABCD-1234-EFGH",
      };

      // Multiple audit logs with sensitive metadata across different actions
      (prisma.auditLog.findMany as any).mockResolvedValueOnce([
        {
          id: "audit-leak-test-1",
          actor: { name: "Admin", email: "admin@ccf.com" },
          action: "RECRUITMENT_APPLICATION_DELETED",
          entityType: "RECRUITMENT_APPLICATION",
          entityId: "app-1",
          metadata: { ...sensitivePayload },
          createdAt: new Date(),
        },
        {
          id: "audit-leak-test-2",
          actor: { name: "Admin", email: "admin@ccf.com" },
          action: "PAYMENT_VERIFIED",
          entityType: "PAYMENT",
          entityId: "pay-1",
          metadata: {
            registrationCode: "REG-SAFE-001",
            ...sensitivePayload,
          },
          createdAt: new Date(),
        },
      ]);

      (prisma.registration.findMany as any).mockResolvedValueOnce([
        {
          id: "reg-1",
          registrationCode: "REG-2026-999",
          registrationType: "INDIVIDUAL",
          status: "ACTIVE",
          participantType: "CRESCENT",
          createdAt: new Date(),
          event: { name: "FinRise 25" },
          payment: null,
        },
      ]);

      const result = await getAdminDashboardData();
      expect(result.success).toBe(true);
      if (!result.success) return;

      const sensitiveValues = Object.values(sensitivePayload);
      for (const act of result.recentActivities) {
        for (const sensitive of sensitiveValues) {
          expect(act.summary).not.toContain(sensitive);
        }
      }

      // Verify registration DTO contains no raw participant response/identity fields
      const reg = result.recentRegistrations[0] as any;
      expect(reg.rrn).toBeUndefined();
      expect(reg.phone).toBeUndefined();
      expect(reg.responses).toBeUndefined();
    });
  });

  describe("4. Fail-Closed Resilience on Database Failure", () => {
    it("returns typed failure state and does NOT throw when database connection fails", async () => {
      (prisma.event.count as any).mockRejectedValueOnce(
        new Error("FATAL: connection to server at 'localhost' failed")
      );
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await getAdminDashboardData();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Live operational data is temporarily unavailable.");
        expect(result.generatedAt).toBeDefined();
        // Verifies no raw SQL or Prisma stack trace in the client error string
        expect(result.error).not.toContain("FATAL");
        expect(result.error).not.toContain("localhost");
      }

      consoleErrorSpy.mockRestore();
    });

    it("recruitment settings retrieval failure must produce dashboard unavailable state rather than recruitment closed state", async () => {
      // All other DB queries succeed
      (prisma.event.count as any).mockResolvedValue(5);
      (prisma.registration.count as any).mockResolvedValue(10);
      (prisma.eventParticipant.count as any).mockResolvedValue(15);
      (prisma.team.count as any).mockResolvedValue(2);
      (prisma.payment.count as any).mockResolvedValue(1);
      (prisma.recruitmentApplication.count as any).mockResolvedValue(3);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);
      (prisma.registration.findMany as any).mockResolvedValue([]);

      // But recruitment siteSetting lookup throws a database error
      (prisma.siteSetting.findUnique as any).mockRejectedValueOnce(
        new Error("Connection error while reading site_settings")
      );
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await getAdminDashboardData();

      // Must fail closed cleanly as unavailable rather than reporting success with isOpen: false
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Live operational data is temporarily unavailable.");
        expect(result.generatedAt).toBeDefined();
      }
      expect((result as any).metrics).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });
  });
});
