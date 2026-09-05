import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminRole } from "@prisma/client";
import {
  ADMIN_NAV_SECTIONS,
  formatAdminRole,
  getNavSectionsForRole,
  isNavActive,
  AdminPageHeader,
  AdminModuleCard,
  AdminEmptyState,
  AdminUserMenu,
  AdminSidebar,
  AdminHeader,
  AdminShell,
} from "@/components/admin";

import { getServerSession } from "next-auth/next";
import AdminDashboardPage from "@/app/admin/dashboard/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  redirect: vi.fn(),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock next-auth/next
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

describe("Admin Dashboard Foundation Verification (Phase 5 Task 8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const CANONICAL_ADMIN_ROUTES = [
    "/admin/dashboard",
    "/admin/events",
    "/admin/members",
    "/admin/departments",
    "/admin/registrations",
    "/admin/recruitment",
    "/admin/media",
    "/admin/notifications",
    "/admin/settings",
  ];

  const FORBIDDEN_FABRICATED_TERMS = [
    "total revenue",
    "revenue generated",
    "total tickets sold",
    "gross earnings",
    "recent activity log",
    "live activity feed",
    "registration count: 1",
    "conversion rate",
    "average attendance",
    "popular event",
  ];

  describe("1. Canonical Navigation Hierarchy & Role Abstraction", () => {
    it("defines exactly four operational navigation sections", () => {
      expect(ADMIN_NAV_SECTIONS).toHaveLength(4);
      const sectionTitles = ADMIN_NAV_SECTIONS.map((s) => s.sectionTitle);
      expect(sectionTitles).toEqual([
        "Overview",
        "Content",
        "Operations",
        "System",
      ]);
    });

    it("contains all nine canonical administrative module routes", () => {
      const allRoutes = ADMIN_NAV_SECTIONS.flatMap((s) =>
        s.items.map((item) => item.href)
      );
      expect(allRoutes).toHaveLength(9);
      for (const route of CANONICAL_ADMIN_ROUTES) {
        expect(allRoutes).toContain(route);
      }
    });

    it("correctly formats admin role labels without inventing roles", () => {
      expect(formatAdminRole(AdminRole.CCF_ADMIN)).toBe("CCF Admin");
      expect(formatAdminRole(AdminRole.IT_ADMIN)).toBe("IT Admin");
      expect(formatAdminRole("CCF_ADMIN")).toBe("CCF Admin");
      expect(formatAdminRole("IT_ADMIN")).toBe("IT Admin");
      expect(formatAdminRole(null)).toBe("Administrator");
      expect(formatAdminRole(undefined)).toBe("Administrator");
    });

    it("grants full module access to both CCF_ADMIN and IT_ADMIN without restriction", () => {
      const ccfSections = getNavSectionsForRole(AdminRole.CCF_ADMIN);
      const itSections = getNavSectionsForRole(AdminRole.IT_ADMIN);

      const ccfRoutes = ccfSections.flatMap((s) => s.items.map((i) => i.href));
      const itRoutes = itSections.flatMap((s) => s.items.map((i) => i.href));

      expect(ccfRoutes).toHaveLength(9);
      expect(itRoutes).toHaveLength(9);
      expect(ccfRoutes).toEqual(itRoutes);
    });

    it("evaluates active navigation states accurately", () => {
      // Dashboard exact & root matching
      expect(isNavActive("/admin/dashboard", "/admin/dashboard")).toBe(true);
      expect(isNavActive("/admin", "/admin/dashboard")).toBe(true);
      expect(isNavActive("/admin/events", "/admin/dashboard")).toBe(false);

      // Submodules matching
      expect(isNavActive("/admin/events", "/admin/events")).toBe(true);
      expect(isNavActive("/admin/events/create", "/admin/events")).toBe(true);
      expect(isNavActive("/admin/events-archive", "/admin/events")).toBe(false);
      expect(isNavActive("/admin/registrations", "/admin/members")).toBe(false);
    });
  });

  describe("2. Admin UI Components Rendering", () => {
    it("renders AdminPageHeader with eyebrow, title, and description", () => {
      const html = renderToStaticMarkup(
        <AdminPageHeader
          eyebrow="Overview"
          title="Operations Dashboard"
          description="Central operations management."
        />
      );
      expect(html).toContain("Overview");
      expect(html).toContain("<h1");
      expect(html).toContain("Operations Dashboard");
      expect(html).toContain("Central operations management.");
    });

    it("renders AdminModuleCard with title, description, badge, and link", () => {
      const html = renderToStaticMarkup(
        <AdminModuleCard
          title="Events"
          description="Manage symposiums and competitions."
          href="/admin/events"
          iconName="Calendar"
          badge="Module Foundation"
        />
      );
      expect(html).toContain("Events");
      expect(html).toContain("Manage symposiums and competitions.");
      expect(html).toContain("Module Foundation");
      expect(html).toContain('href="/admin/events"');
      expect(html).toContain("Open Module");
    });

    it("renders AdminEmptyState with honest module foundation copy and no fake controls", () => {
      const html = renderToStaticMarkup(
        <AdminEmptyState
          moduleTitle="Registrations"
          description="The Registrations management interface will be connected in a later implementation stage."
          iconName="ClipboardCheck"
        />
      );
      expect(html).toContain("Registrations");
      expect(html).toContain("Module Foundation");
      expect(html).toContain(
        "The Registrations management interface will be connected in a later implementation stage."
      );
      expect(html).toContain('href="/admin/dashboard"');
      expect(html).toContain("Return to Dashboard");

      // No fake buttons or tables
      expect(html).not.toContain("<table");
      expect(html).not.toContain("Create New");
      expect(html).not.toContain("Export CSV");
    });

    it("renders AdminUserMenu with session-derived identity and logout action", () => {
      const mockUser = {
        name: "Ahmad Raza",
        email: "ahmad@crescent.education",
        role: AdminRole.CCF_ADMIN,
      };

      const html = renderToStaticMarkup(<AdminUserMenu user={mockUser} />);
      expect(html).toContain("Ahmad Raza");
      expect(html).toContain("ahmad@crescent.education");
      expect(html).toContain("CCF Admin");
      expect(html).toContain("Logout");
      expect(html).toContain('aria-label="Log out of admin session"');
    });

    it("renders AdminHeader with mobile menu button and compact user identity", () => {
      const mockUser = {
        name: "Sara Khan",
        email: "sara@crescent.education",
        role: AdminRole.IT_ADMIN,
      };

      const html = renderToStaticMarkup(
        <AdminHeader user={mockUser} onOpenMobileNav={() => {}} />
      );
      expect(html).toContain("<header");
      expect(html).toContain("CCF Administration");
      expect(html).toContain('aria-label="Open navigation menu"');
      expect(html).toContain("Sara Khan");
      expect(html).toContain("IT Admin");
      expect(html).toContain("Logout");
    });

    it("renders AdminSidebar with all navigation sections and active links", () => {
      const mockUser = {
        name: "Test Admin",
        email: "test@crescent.education",
        role: AdminRole.CCF_ADMIN,
      };

      const html = renderToStaticMarkup(<AdminSidebar user={mockUser} />);
      expect(html).toContain("<aside");
      expect(html).toContain('aria-label="Admin Sidebar Navigation"');
      expect(html).toContain("CCF Admin");
      expect(html).toContain("Operations Portal");

      // Check all section titles
      expect(html).toContain("Overview");
      expect(html).toContain("Content");
      expect(html).toContain("Operations");
      expect(html).toContain("System");

      // Check all module links
      for (const route of CANONICAL_ADMIN_ROUTES) {
        expect(html).toContain(`href="${route}"`);
      }

      // Check active state on current mocked route (/admin/dashboard)
      expect(html).toContain('aria-current="page"');
    });

    it("renders AdminShell with accessibility skip link and semantic landmarks", () => {
      const mockUser = {
        name: "Lead Admin",
        email: "lead@crescent.education",
        role: AdminRole.CCF_ADMIN,
      };

      const html = renderToStaticMarkup(
        <AdminShell user={mockUser}>
          <div id="test-content">Dashboard Content</div>
        </AdminShell>
      );

      // Skip link present
      expect(html).toContain('href="#admin-main"');
      expect(html).toContain("Skip to main content");

      // Main landmark present
      expect(html).toContain('<main id="admin-main"');
      expect(html).toContain("Dashboard Content");

      // Header and Sidebar present
      expect(html).toContain("<header");
      expect(html).toContain("<aside");
    });
  });

  describe("3. Anti-Fabrication & Security Invariants", () => {
    it("strictly prohibits fake statistics, fake revenue, and fake metrics", () => {
      const navText = JSON.stringify(ADMIN_NAV_SECTIONS).toLowerCase();
      for (const term of FORBIDDEN_FABRICATED_TERMS) {
        expect(navText).not.toContain(term);
      }
    });

    it("does NOT hardcode administrator names, emails, or credentials", () => {
      const navText = JSON.stringify(ADMIN_NAV_SECTIONS);
      expect(navText).not.toContain("@crescent.education");
      expect(navText).not.toContain("password");
      expect(navText).not.toContain("secret");
      expect(navText).not.toContain("totp");
    });

    it("does NOT expose sensitive authentication secrets in user menu", () => {
      const mockUser = {
        id: "admin-uuid-test",
        name: "Secret Admin",
        email: "secret@crescent.education",
        role: AdminRole.IT_ADMIN,
      };

      const html = renderToStaticMarkup(<AdminUserMenu user={mockUser} />);
      expect(html).not.toContain("admin-uuid-test");
      expect(html).not.toContain("recovery");
      expect(html).not.toContain("totpSecret");
      expect(html).not.toContain("bcrypt");
    });
  });

  describe("4. Admin Dashboard Landing Page Verified Content (Phase 5 Task 8 Corrections)", () => {
    it("renders corrected module count label, platform architecture status card, and access scope", async () => {
      const mockSession = {
        user: {
          id: "admin-uuid-1",
          name: "Test Admin",
          email: "admin@crescent.education",
          role: AdminRole.CCF_ADMIN,
          active: true,
        },
      };
      (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      const pageJsx = await AdminDashboardPage();
      const html = renderToStaticMarkup(pageJsx);

      // 1. Module count label correction
      expect(html).toContain("5 Core Modules");
      expect(html).not.toContain("5 Core Sections");

      // 2. Platform Architecture card title & description correction
      expect(html).toContain("Platform Architecture");
      expect(html).not.toContain("Platform &amp; Operational Status");
      expect(html).not.toContain("Platform & Operational Status");
      expect(html).toContain(
        "Core technical components powering the CCF administration platform."
      );
      expect(html).not.toContain(
        "Active architectural components for Crescent Club of Finance."
      );

      // 3. Admin Access label correction
      expect(html).toContain("Full Admin Access (MVP)");
      expect(html).not.toContain("Full Operational Permissions (MVP)");
      expect(html).not.toContain("Full Operational Permissions");
    });
  });
});
