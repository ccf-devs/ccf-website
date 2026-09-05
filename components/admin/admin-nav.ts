import { AdminRole } from "@prisma/client";

export interface AdminNavItem {
  title: string;
  href: string;
  iconName:
    | "LayoutDashboard"
    | "Calendar"
    | "Users"
    | "Layers"
    | "ClipboardCheck"
    | "UserPlus"
    | "Image"
    | "Bell"
    | "Settings";
  description: string;
  allowedRoles?: AdminRole[];
  badge?: string;
}

export interface AdminNavSection {
  sectionTitle: string;
  items: readonly AdminNavItem[];
}

/**
 * Formats an AdminRole enum into a human-readable display label.
 * Verified mapping:
 * CCF_ADMIN -> CCF Admin
 * IT_ADMIN -> IT Admin
 */
export function formatAdminRole(role?: AdminRole | string | null): string {
  if (!role) return "Administrator";
  if (role === AdminRole.CCF_ADMIN || role === "CCF_ADMIN") {
    return "CCF Admin";
  }
  if (role === AdminRole.IT_ADMIN || role === "IT_ADMIN") {
    return "IT Admin";
  }
  return String(role);
}

/**
 * Canonical CCF Admin navigation structure organized into 4 operational sections:
 * OVERVIEW, CONTENT, OPERATIONS, SYSTEM.
 */
export const ADMIN_NAV_SECTIONS: readonly AdminNavSection[] = [
  {
    sectionTitle: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        iconName: "LayoutDashboard",
        description: "Central administrative overview and operational health.",
      },
    ],
  },
  {
    sectionTitle: "Content",
    items: [
      {
        title: "Events",
        href: "/admin/events",
        iconName: "Calendar",
        description: "Configure upcoming and past symposiums and workshops.",
      },
      {
        title: "Members",
        href: "/admin/members",
        iconName: "Users",
        description: "Manage executive directory and department assignments.",
      },
      {
        title: "Departments",
        href: "/admin/departments",
        iconName: "Layers",
        description: "Operational management of the five CCF departments.",
      },
    ],
  },
  {
    sectionTitle: "Operations",
    items: [
      {
        title: "Registrations",
        href: "/admin/registrations",
        iconName: "ClipboardCheck",
        description: "Participant records, team allocations, and capacity.",
      },
      {
        title: "Recruitment",
        href: "/admin/recruitment",
        iconName: "UserPlus",
        description: "Student recruitment applications and reviewer workflow.",
      },
      {
        title: "Media",
        href: "/admin/media",
        iconName: "Image",
        description: "Photo gallery assets and production media delivery.",
      },
    ],
  },
  {
    sectionTitle: "System",
    items: [
      {
        title: "Notifications",
        href: "/admin/notifications",
        iconName: "Bell",
        description: "Broadcast alerts and system communications.",
      },
      {
        title: "Settings",
        href: "/admin/settings",
        iconName: "Settings",
        description: "Platform configuration and administrative preferences.",
      },
    ],
  },
] as const;

/**
 * Returns navigation sections filtered for the specified admin role.
 * Currently both CCF_ADMIN and IT_ADMIN have full controls.
 * This abstraction provides a clean foundation for future granular permissions.
 */
export function getNavSectionsForRole(role?: AdminRole): AdminNavSection[] {
  if (!role) {
    return ADMIN_NAV_SECTIONS.map((section) => ({ ...section }));
  }

  return ADMIN_NAV_SECTIONS.map((section) => ({
    sectionTitle: section.sectionTitle,
    items: section.items.filter(
      (item) => !item.allowedRoles || item.allowedRoles.includes(role)
    ),
  }));
}

/**
 * Determines whether a navigation item is currently active.
 * Matches exact route for dashboard, or prefix match for submodules.
 */
export function isNavActive(currentPathname: string, itemHref: string): boolean {
  if (itemHref === "/admin/dashboard") {
    return currentPathname === "/admin/dashboard" || currentPathname === "/admin";
  }
  return (
    currentPathname === itemHref ||
    currentPathname.startsWith(`${itemHref}/`)
  );
}
