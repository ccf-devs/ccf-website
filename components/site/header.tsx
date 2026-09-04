"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CcfLogo } from "./logo";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Container } from "./container";
import { MobileNav } from "./mobile-nav";
import { PUBLIC_NAV_ITEMS, CCF_PUBLIC_INFO } from "./navigation-data";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-ccf-navy/90 backdrop-blur-md">
      <Container className="flex h-18 items-center justify-between">
        {/* Brand identity / Logo link */}
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-md py-1 pr-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${CCF_PUBLIC_INFO.name} Home`}
        >
          <CcfLogo size="md" priority />

          <div className="flex flex-col">
            <span className="font-display text-lg font-bold tracking-tight text-ccf-offwhite sm:text-xl">
              <span className="hidden sm:inline">{CCF_PUBLIC_INFO.name}</span>
              <span className="sm:hidden">{CCF_PUBLIC_INFO.shortName}</span>
            </span>
            <span className="hidden text-[11px] font-medium tracking-wide text-ccf-muted sm:block">
              {CCF_PUBLIC_INFO.campus}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Main Navigation"
        >
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : (pathname?.startsWith(item.href) ?? false);

              if (item.isCta) {
                return (
                  <li key={item.href} className="ml-3">
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                    className={cn(
                      "relative rounded-md px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "text-ccf-gold font-semibold"
                        : "text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface/60"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                    {isActive && (
                      <span
                        className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-full bg-ccf-gold"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border/50 bg-ccf-surface/80 text-ccf-muted hover:bg-ccf-surface-elevated hover:text-ccf-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </Container>

      {/* Accessible mobile drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        items={PUBLIC_NAV_ITEMS}
        pathname={pathname}
      />
    </header>
  );
}
