"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminUserMenu, AdminUserProps } from "./admin-user-menu";

interface AdminHeaderProps {
  user?: AdminUserProps | null;
  onOpenMobileNav: () => void;
  isMobileNavOpen?: boolean;
  className?: string;
}

export function AdminHeader({
  user,
  onOpenMobileNav,
  isMobileNavOpen = false,
  className = "",
}: AdminHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-20 h-16 bg-ccf-navy/90 backdrop-blur border-b border-border/40 flex items-center justify-between px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          aria-expanded={isMobileNavOpen}
          className="lg:hidden h-9 w-9 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="type-eyebrow text-xs text-ccf-gold uppercase tracking-wider hidden sm:inline">
            Internal Operations
          </span>
          <span className="text-sm font-semibold text-ccf-offwhite hidden sm:inline">
            •
          </span>
          <span className="text-sm font-semibold text-ccf-offwhite tracking-tight">
            CCF Administration
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <AdminUserMenu user={user} compact />
      </div>
    </header>
  );
}
