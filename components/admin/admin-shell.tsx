"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { AdminMobileNav } from "./admin-mobile-nav";
import { AdminUserProps } from "./admin-user-menu";

interface AdminShellProps {
  user?: AdminUserProps | null;
  children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ccf-navy-deep text-ccf-offwhite flex flex-col">
      {/* Accessibility Skip Link */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ccf-surface focus:text-ccf-gold focus:border focus:border-ccf-gold/40 focus:rounded-md shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar (Fixed Left) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64">
        <AdminSidebar user={user} className="w-full" />
      </div>

      {/* Mobile Navigation Drawer */}
      <AdminMobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <AdminHeader
          user={user}
          isMobileNavOpen={isMobileNavOpen}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
