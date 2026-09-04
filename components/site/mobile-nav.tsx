"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { X, Mail, ExternalLink } from "lucide-react";
import { NavItem, CCF_PUBLIC_INFO } from "./navigation-data";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  items: readonly NavItem[];
  pathname: string;
}

export function MobileNav({ isOpen, onClose, items, pathname }: MobileNavProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press and manage body scroll locking
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    // Focus the close button when opened
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in drawer from the right */}
      <div
        id="mobile-navigation"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border/40 bg-ccf-surface p-6 shadow-2xl transition-transform duration-200 ease-in-out"
      >
        {/* Header with logo name and close button */}
        <div className="flex items-center justify-between pb-6 border-b border-border/40">
          <span className="font-display text-lg font-bold tracking-tight text-ccf-offwhite">
            {CCF_PUBLIC_INFO.name}
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border/60 text-ccf-muted hover:bg-ccf-surface-elevated hover:text-ccf-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links list */}
        <nav className="flex-1 overflow-y-auto py-6" aria-label="Mobile Navigation">
          <ul className="space-y-2">
            {items.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              if (item.isCta) {
                return (
                  <li key={item.href} className="pt-4">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex w-full items-center justify-center rounded-md px-4 py-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-ccf-gold text-ccf-navy font-semibold ring-2 ring-ccf-gold"
                          : "bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center rounded-md px-3 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-ccf-surface-elevated text-ccf-gold font-semibold border-l-2 border-ccf-gold pl-4"
                        : "text-ccf-muted hover:bg-ccf-surface-elevated/50 hover:text-ccf-offwhite"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer info inside mobile drawer */}
        <div className="border-t border-border/40 pt-6 text-xs text-ccf-muted space-y-4">
          <div className="flex items-center gap-2 text-ccf-muted">
            <Mail className="h-4 w-4 shrink-0 text-ccf-gold" aria-hidden="true" />
            <a
              href={`mailto:${CCF_PUBLIC_INFO.email}`}
              className="hover:text-ccf-offwhite transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CCF_PUBLIC_INFO.email}
            </a>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <a
              href={CCF_PUBLIC_INFO.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ccf-muted hover:text-ccf-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Crescent Club of Finance Instagram (opens in a new tab)"
            >
              <span>Instagram</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>

            <a
              href={CCF_PUBLIC_INFO.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ccf-muted hover:text-ccf-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Crescent Club of Finance LinkedIn (opens in a new tab)"
            >
              <span>LinkedIn</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>

          <p className="text-[11px] text-slate-500 pt-2">
            {CCF_PUBLIC_INFO.campus}
          </p>
        </div>
      </div>
    </div>
  );
}
