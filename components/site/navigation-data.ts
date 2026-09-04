export interface NavItem {
  label: string;
  href: string;
  isCta?: boolean;
}

/**
 * Public navigation links established by CCF architecture.
 * Shared by both desktop and mobile navigation to ensure a single source of truth.
 */
export const PUBLIC_NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Departments", href: "/departments" },
  { label: "Members", href: "/members" },
  { label: "Events", href: "/events" },
  { label: "Contact", href: "/contact" },
  { label: "Join Us", href: "/join-us", isCta: true },
] as const;

/**
 * Verified official CCF public contact and social details.
 * Source: Project Handbook & Official specifications. No invented details.
 */
export const CCF_PUBLIC_INFO = {
  name: "Crescent Club of Finance",
  shortName: "CCF",
  affiliation: "B.S. Abdur Rahman Crescent Institute of Science and Technology",
  campus: "Crescent College, Vandalur",
  email: "crescentcluboffinance26@gmail.com",
  socials: {
    instagram: "https://www.instagram.com/crescentcluboffinance?igsh=MXIyYXpnMmdnNmMyeA==",
    linkedin: "https://www.linkedin.com/company/ccf-2024/",
  },
} as const;
