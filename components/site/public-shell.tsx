import React from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { AdminKeyboardShortcut } from "@/components/admin/admin-keyboard-shortcut";
import { NavProgressBar } from "./nav-progress-bar";

import type { PublicContactSettings } from "@/lib/site-settings/service";

interface PublicShellProps {
  children: React.ReactNode;
  contactSettings?: PublicContactSettings;
}

/**
 * Reusable public application shell.
 * Provides the consistent public page architecture:
 * - "Skip to main content" accessible link
 * - Public navigation header (desktop + mobile)
 * - Flexible semantic <main> region with accessible anchor
 * - Public footer with verified official information
 * - Admin keyboard shortcut (Ctrl+Alt+A / Cmd+Option+A → /admin)
 * - Global navigation progress bar
 */
export function PublicShell({ children, contactSettings }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navigation progress bar */}
      <NavProgressBar />

      {/* Admin keyboard shortcut — navigation convenience, not a security mechanism */}
      <AdminKeyboardShortcut />

      {/* Accessible skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-ccf-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ccf-navy focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Public Header */}
      <Header contactSettings={contactSettings} />

      {/* Primary Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      {/* Public Footer */}
      <Footer contactSettings={contactSettings} />
    </div>
  );
}
