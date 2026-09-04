import React from "react";
import { Header } from "./header";
import { Footer } from "./footer";

interface PublicShellProps {
  children: React.ReactNode;
}

/**
 * Reusable public application shell.
 * Provides the consistent public page architecture:
 * - "Skip to main content" accessible link
 * - Public navigation header (desktop + mobile)
 * - Flexible semantic <main> region with accessible anchor
 * - Public footer with verified official information
 */
export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Accessible skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-ccf-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ccf-navy focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Public Header */}
      <Header />

      {/* Primary Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      {/* Public Footer */}
      <Footer />
    </div>
  );
}
