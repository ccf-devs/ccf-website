"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Layers,
  ClipboardCheck,
  UserPlus,
  Image,
  Bell,
  Settings,
} from "lucide-react";
import {
  getNavSectionsForRole,
  isNavActive,
  AdminNavItem,
} from "./admin-nav";
import { AdminUserMenu, AdminUserProps } from "./admin-user-menu";
import { AdminRole } from "@prisma/client";

const ICON_MAP: Record<AdminNavItem["iconName"], React.ElementType> = {
  LayoutDashboard,
  Calendar,
  Users,
  Layers,
  ClipboardCheck,
  UserPlus,
  Image,
  Bell,
  Settings,
};

interface AdminSidebarProps {
  user?: AdminUserProps | null;
  className?: string;
  onNavigate?: () => void;
}

export function AdminSidebar({
  user,
  className = "",
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname() || "";
  const role = user?.role as AdminRole | undefined;
  const sections = getNavSectionsForRole(role);

  return (
    <aside
      aria-label="Admin Sidebar Navigation"
      className={`w-64 bg-ccf-navy border-r border-border/40 flex flex-col justify-between h-full ${className}`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Brand Header */}
        <div className="space-y-1 px-2">
          <Link
            href="/admin/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-lg"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ccf-gold/40 bg-ccf-surface-elevated text-xs font-bold text-ccf-gold shadow-sm group-hover:scale-105 transition-transform">
              CCF
            </div>
            <div className="min-w-0">
              <span className="type-eyebrow text-[10px] text-ccf-gold tracking-widest uppercase block leading-none">
                Operations Portal
              </span>
              <span className="text-base font-bold text-ccf-offwhite tracking-tight leading-tight block">
                CCF Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav aria-label="Admin Navigation Sections" className="space-y-6">
          {sections.map((section) => (
            <div key={section.sectionTitle} className="space-y-1.5">
              <p className="type-eyebrow text-[11px] font-semibold text-ccf-muted/70 tracking-wider uppercase px-2 mb-1">
                {section.sectionTitle}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
                  const active = isNavActive(pathname, item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                          active
                            ? "bg-ccf-surface-elevated text-ccf-gold border-l-2 border-ccf-gold font-semibold shadow-xs"
                            : "text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface/60"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? "text-ccf-gold" : "text-ccf-muted"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* User Information & Sign Out */}
      <div className="p-4 border-t border-border/40">
        <AdminUserMenu user={user} />
      </div>
    </aside>
  );
}
