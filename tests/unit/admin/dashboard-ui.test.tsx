import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminRole } from "@prisma/client";
import {
  DashboardMetricsGrid,
  DashboardAlertBanner,
  DashboardRecentActivity,
  DashboardQuickActions,
  DashboardErrorState,
} from "@/components/admin/dashboard";
import AdminDashboardPage from "@/app/admin/dashboard/page";
import * as authSession from "@/lib/auth/session";
import * as dashboardService from "@/lib/admin/dashboard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  redirect: vi.fn(),
}));

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
  requireAdmin: vi.fn(),
  requireRole: vi.fn(),
}));

// Mock dashboard service
vi.mock("@/lib/admin/dashboard", () => ({
  getAdminDashboardData: vi.fn(),
}));

describe("Admin Dashboard UI Components & Page Unit Tests (Phase 12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMetrics = {
    events: {
      total: 8,
      published: 5,
      upcoming: 3,
      draft: 3,
    },
    registrations: {
      total: 240,
      active: 220,
      totalParticipants: 310,
      activeTeams: 45,
    },
    payments: {
      pending: 7,
      verified: 190,
      rejected: 15,
    },
    recruitment: {
      isOpen: true,
      total: 85,
      active: 65,
      selected: 12,
      rejected: 8,
    },
  };

  describe("1. DashboardMetricsGrid Component", () => {
    it("renders all four core KPI cards with verified database counts", () => {
      const html = renderToStaticMarkup(
        <DashboardMetricsGrid metrics={mockMetrics} />
      );

      // Events
      expect(html).toContain("Events");
      expect(html).toContain("8");
      expect(html).toContain("5 Published");
      expect(html).toContain("3"); // upcoming
      expect(html).toContain("Manage Events");

      // Registrations
      expect(html).toContain("Registrations");
      expect(html).toContain("240");
      expect(html).toContain("220 Active");
      expect(html).toContain("310"); // total participants
      expect(html).toContain("45"); // active teams
      expect(html).toContain("View Registrations");

      // Payments
      expect(html).toContain("Payments");
      expect(html).toContain("190"); // verified
      expect(html).toContain("7 Pending");
      expect(html).toContain("15"); // rejected
      expect(html).toContain("Verify Payments");

      // Recruitment
      expect(html).toContain("Recruitment");
      expect(html).toContain("85");
      expect(html).toContain("PORTAL OPEN");
      expect(html).toContain("12"); // selected
      expect(html).toContain("65"); // active review
      expect(html).toContain("Recruitment Console");
    });

    it("displays 'All Verified' badge when pending payment count is zero", () => {
      const zeroPendingMetrics = {
        ...mockMetrics,
        payments: {
          pending: 0,
          verified: 200,
          rejected: 10,
        },
      };

      const html = renderToStaticMarkup(
        <DashboardMetricsGrid metrics={zeroPendingMetrics} />
      );

      expect(html).toContain("All Verified");
      expect(html).not.toContain("0 Pending");
    });
  });

  describe("2. DashboardAlertBanner Component", () => {
    it("renders alert banner with title, message, and action link", () => {
      const alerts = [
        {
          id: "alert-pending-payments",
          title: "Pending Payment Verifications",
          message: "7 payments are awaiting administrator review and verification.",
          severity: "warning" as const,
          actionUrl: "/admin/registrations",
          actionLabel: "Review Payments",
        },
      ];

      const html = renderToStaticMarkup(<DashboardAlertBanner alerts={alerts} />);

      expect(html).toContain("Pending Payment Verifications");
      expect(html).toContain("7 payments are awaiting");
      expect(html).toContain("Review Payments");
      expect(html).toContain('href="/admin/registrations"');
    });

    it("renders nothing when alerts array is empty", () => {
      const html = renderToStaticMarkup(<DashboardAlertBanner alerts={[]} />);
      expect(html).toBe("");
    });
  });

  describe("3. DashboardRecentActivity Component", () => {
    const mockActivities = [
      {
        id: "act-1",
        actorName: "Fatima Admin",
        action: "PAYMENT_VERIFIED",
        entityType: "PAYMENT",
        entityId: "pay-1",
        summary: "Verified payment for REG-2026-001",
        createdAt: "2026-09-08T00:00:00Z",
      },
    ];

    const mockRecentRegs = [
      {
        id: "reg-1",
        eventName: "Magnora 26",
        registrationCode: "REG-2026-001",
        registrationType: "INDIVIDUAL" as const,
        status: "ACTIVE" as const,
        participantType: "CRESCENT" as const,
        paymentStatus: "VERIFIED",
        createdAt: "2026-09-08T00:00:00Z",
      },
    ];

    it("renders recent activity items and recent registrations with safe fields", () => {
      const html = renderToStaticMarkup(
        <DashboardRecentActivity
          activities={mockActivities}
          recentRegistrations={mockRecentRegs}
        />
      );

      // Administrative Activity
      expect(html).toContain("Recent Administrative Activity");
      expect(html).toContain("Verified payment for REG-2026-001");
      expect(html).toContain("Fatima Admin");
      expect(html).toContain("PAYMENT");

      // Registrations
      expect(html).toContain("Recent Registrations");
      expect(html).toContain("Magnora 26");
      expect(html).toContain("REG-2026-001");
      expect(html).toContain("INDIVIDUAL");
      expect(html).toContain("CRESCENT");
      expect(html).toContain("ACTIVE");
    });

    it("renders empty placeholders when no recent activities or registrations exist", () => {
      const html = renderToStaticMarkup(
        <DashboardRecentActivity activities={[]} recentRegistrations={[]} />
      );

      expect(html).toContain("No recent administrative actions recorded.");
      expect(html).toContain("No event registrations submitted yet.");
    });
  });

  describe("4. DashboardQuickActions Component", () => {
    it("renders all five primary administrative workflow shortcuts", () => {
      const html = renderToStaticMarkup(<DashboardQuickActions />);

      expect(html).toContain("Quick Actions");
      expect(html).toContain('href="/admin/events/new"');
      expect(html).toContain("Create Event");
      expect(html).toContain('href="/admin/registrations"');
      expect(html).toContain("Registrations");
      expect(html).toContain('href="/admin/recruitment"');
      expect(html).toContain("Recruitment");
      expect(html).toContain('href="/admin/members"');
      expect(html).toContain("Members");
      expect(html).toContain('href="/admin/media"');
      expect(html).toContain("Media");
    });
  });

  describe("5. DashboardErrorState Component", () => {
    it("renders fail-closed notice without fake metrics or stack traces", () => {
      const html = renderToStaticMarkup(
        <DashboardErrorState error="Live operational data is temporarily unavailable." />
      );

      expect(html).toContain("Operational Data Temporarily Unavailable");
      expect(html).toContain(
        "Live operational data is temporarily unavailable."
      );
      expect(html).toContain("System Integrity Notice");
      expect(html).toContain("Zero metrics or fabricated numbers are not rendered");
      expect(html).toContain("Retry Connection");
      expect(html).toContain("Go to Events Console");
    });
  });

  describe("6. Full Page Assembly & Authorization (AdminDashboardPage)", () => {
    const mockAdmin = {
      id: "admin-1",
      name: "Super Administrator",
      email: "superadmin@crescent.education",
      role: AdminRole.CCF_ADMIN,
    };

    it("redirects unauthenticated users to /admin/auth/login", async () => {
      const { redirect } = await import("next/navigation");
      (authSession.getCurrentAdmin as any).mockResolvedValueOnce(null);

      await AdminDashboardPage();

      expect(redirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/dashboard"
      );
    });

    it("renders operational dashboard with metrics, alerts, and activity when DB succeeds", async () => {
      (authSession.getCurrentAdmin as any).mockResolvedValueOnce(mockAdmin);
      (dashboardService.getAdminDashboardData as any).mockResolvedValueOnce({
        success: true,
        metrics: mockMetrics,
        alerts: [
          {
            id: "alert-1",
            title: "Pending Payment Verifications",
            message: "7 payments need review",
            severity: "warning",
            actionUrl: "/admin/registrations",
            actionLabel: "Review",
          },
        ],
        recentActivities: [],
        recentRegistrations: [],
        generatedAt: new Date().toISOString(),
      });

      const pageJsx = await AdminDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      // Identity & Session
      expect(html).toContain("Welcome, Super Administrator");
      expect(html).toContain("superadmin@crescent.education");
      expect(html).toContain("CCF Admin");

      // Operational Alerts
      expect(html).toContain("Pending Payment Verifications");

      // Metrics Grid
      expect(html).toContain("Operational Overview");
      expect(html).toContain("8"); // events total
      expect(html).toContain("240"); // registrations total

      // Anti-fabrication check
      expect(html).not.toContain("Total Revenue");
      expect(html).not.toContain("Gross Earnings");
      expect(html).not.toContain("Conversion Rate");
    });

    it("renders fail-closed DashboardErrorState when database query fails", async () => {
      (authSession.getCurrentAdmin as any).mockResolvedValueOnce(mockAdmin);
      (dashboardService.getAdminDashboardData as any).mockResolvedValueOnce({
        success: false,
        error: "Live operational data is temporarily unavailable.",
        generatedAt: new Date().toISOString(),
      });

      const pageJsx = await AdminDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      // Does NOT render metrics grid
      expect(html).not.toContain("Operational Overview");

      // Renders fail-closed error state
      expect(html).toContain("Operational Data Temporarily Unavailable");
      expect(html).toContain(
        "Zero metrics or fabricated numbers are not rendered when database connectivity is offline."
      );

      // Renders canonical module navigation cards so admin can still access individual modules
      expect(html).toContain("5 Core Modules");
      expect(html).toContain("Events");
      expect(html).toContain("Registrations");
      expect(html).toContain("Recruitment");
    });
  });
});
