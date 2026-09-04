import React from "react";
import Link from "next/link";
import { CcfLogo } from "./logo";
import { Mail, ExternalLink } from "lucide-react";
import { Container } from "./container";
import { PUBLIC_NAV_ITEMS, CCF_PUBLIC_INFO } from "./navigation-data";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-ccf-navy-deep text-ccf-muted">
      {/* Restrained Gold Accent Top Rule */}
      <div className="gold-rule w-full" aria-hidden="true" />

      <Container className="py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 lg:grid-cols-4">
          {/* Column 1: Brand & Affiliation */}
          <div className="space-y-4 md:col-span-2 lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${CCF_PUBLIC_INFO.name} Home`}
            >
              <CcfLogo size="sm" />
              <span className="font-display text-lg font-bold tracking-tight text-ccf-offwhite">
                {CCF_PUBLIC_INFO.name}
              </span>
            </Link>

            <p className="max-w-md text-sm leading-relaxed text-ccf-muted">
              The premier finance club of {CCF_PUBLIC_INFO.affiliation}, dedicated to financial literacy, market acumen, and career excellence.
            </p>

            <p className="text-xs text-slate-400">
              {CCF_PUBLIC_INFO.campus}
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-3">
            <h3 className="type-metadata text-ccf-offwhite">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              {PUBLIC_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-ccf-offwhite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Official Contact & Socials */}
          <div className="space-y-3">
            <h3 className="type-metadata text-ccf-offwhite">
              Official Contact
            </h3>
            <div className="space-y-3 text-sm">
              <a
                href={`mailto:${CCF_PUBLIC_INFO.email}`}
                className="group flex items-start gap-2.5 transition-colors hover:text-ccf-offwhite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                aria-label={`Email CCF at ${CCF_PUBLIC_INFO.email}`}
              >
                <Mail className="h-4 w-4 shrink-0 text-ccf-gold mt-0.5" aria-hidden="true" />
                <span className="break-all">{CCF_PUBLIC_INFO.email}</span>
              </a>

              <div className="pt-2">
                <h4 className="type-metadata text-slate-400 mb-2 text-[10px]">
                  Official Channels
                </h4>
                <div className="flex flex-col space-y-2">
                  <a
                    href={CCF_PUBLIC_INFO.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-ccf-muted hover:text-ccf-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                    aria-label="Crescent Club of Finance Instagram (opens in a new tab)"
                  >
                    <span>Instagram</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>

                  <a
                    href={CCF_PUBLIC_INFO.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-ccf-muted hover:text-ccf-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                    aria-label="Crescent Club of Finance LinkedIn (opens in a new tab)"
                  >
                    <span>LinkedIn</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright and Attribution */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>© {currentYear} {CCF_PUBLIC_INFO.name}. All rights reserved.</p>
          <p>{CCF_PUBLIC_INFO.campus}</p>
        </div>
      </Container>
    </footer>
  );
}
