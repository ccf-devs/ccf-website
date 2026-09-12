"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { AdminMobileNav } from "./admin-mobile-nav";
import { AdminUserProps } from "./admin-user-menu";
import { NavProgressBar } from "@/components/site/nav-progress-bar";
import { AdminKeyboardShortcut } from "./admin-keyboard-shortcut";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";

interface AdminShellProps {
  user?: AdminUserProps | null;
  children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Prevent viewing stale admin data on browser back after logout (bfcache mitigation)
  React.useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <div className="min-h-screen bg-ccf-navy-deep text-ccf-offwhite flex flex-col">
      {/* Navigation progress bar */}
      <NavProgressBar />

      {/* Admin keyboard shortcut — navigation convenience */}
      <AdminKeyboardShortcut />

      {/* Accessibility Skip Link */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ccf-surface focus:text-ccf-gold focus:border focus:border-ccf-gold/40 focus:rounded-md shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar (Fixed Left) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64">
        <AdminSidebar
          user={user}
          className="w-full"
          onOpenLogout={() => setIsLogoutDialogOpen(true)}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      <AdminMobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
        onOpenLogout={() => setIsLogoutDialogOpen(true)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <AdminHeader
          user={user}
          isMobileNavOpen={isMobileNavOpen}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenLogout={() => setIsLogoutDialogOpen(true)}
        />

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Single shared viewport-centered logout confirmation dialog */}
      <LogoutConfirmDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
      />
    </div>
  );
}
