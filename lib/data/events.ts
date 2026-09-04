import { CCF_EYEBROW } from "@/components/site/navigation-data";

export type EventStatus = "UPCOMING" | "PREVIOUS EVENT";
export type EventStatusVariant = "warning" | "info";

export interface CcfEvent {
  id: string;
  slug: string;
  name: string;
  status: EventStatus;
  statusVariant: EventStatusVariant;
  dateText: string;
  venue?: string;
  venueText?: string;
  description: string;
  shortDescription: string;
  edition?: string;
  category?: string;
  registrationState?: string;
  imageObjectKey?: string;
}

/**
 * Confirmed CCF events from project documentation.
 * Current context: September 2026.
 * - Magnora’26: Upcoming/current 2026 symposium
 * - FinRise’25: Historical 2025 event (PREVIOUS EVENT)
 * - FinVibe Fiesta Season 02: Historical 2025 event (PREVIOUS EVENT)
 *
 * Registration states, fees, and capacity are strictly uninvented.
 */
export const CCF_EVENTS: readonly CcfEvent[] = [
  {
    id: "evt-magnora-26",
    slug: "magnora-26",
    name: "Magnora’26",
    edition: "2026",
    dateText: "2026",
    venue: "Crescent Campus, Vandalur",
    venueText: "Crescent Campus, Vandalur",
    description:
      "Finance and business symposium organized by CCF at Crescent College.",
    shortDescription:
      "Finance and business symposium organized by CCF at Crescent College.",
    status: "UPCOMING",
    statusVariant: "warning",
    category: "Symposium",
  },
  {
    id: "evt-finrise-25",
    slug: "finrise-25",
    name: "FinRise’25",
    edition: "2025",
    dateText: "2025",
    venue: "Crescent Campus, Vandalur",
    venueText: "Crescent Campus, Vandalur",
    description: "Finance and investment event organized by CCF.",
    shortDescription: "Finance and investment event organized by CCF.",
    status: "PREVIOUS EVENT",
    statusVariant: "info",
    category: "Convention",
  },
  {
    id: "evt-finvibe-s2",
    slug: "finvibe-fiesta-s2",
    name: "FinVibe Fiesta Season 02",
    edition: "Season 02",
    dateText: "April 2025",
    venue: "International Event • Crescent Campus",
    venueText: "International Event • Crescent Campus",
    description:
      "Finance event organized by CCF featuring student activities and competitions.",
    shortDescription:
      "Finance event organized by CCF featuring student activities and competitions.",
    status: "PREVIOUS EVENT",
    statusVariant: "info",
    category: "Festival",
  },
] as const;

export const CCF_UPCOMING_EVENTS: readonly CcfEvent[] = CCF_EVENTS.filter(
  (e) => e.status === "UPCOMING"
);

export const CCF_PAST_EVENTS: readonly CcfEvent[] = CCF_EVENTS.filter(
  (e) => e.status === "PREVIOUS EVENT"
);

/**
 * Resolves a canonical event by its URL slug.
 * Returns undefined if no matching event is found.
 */
export function getEventBySlug(slug: string): CcfEvent | undefined {
  return CCF_EVENTS.find((event) => event.slug === slug);
}

export const EVENTS_HERO = {
  eyebrow: CCF_EYEBROW,
  title: "Events",
  subtitle:
    "Explore the finance symposiums, competitions, and educational activities organized by Crescent Club of Finance.",
} as const;

export const EVENTS_DIRECTORY_INFO = {
  eyebrow: CCF_EYEBROW,
  upcomingHeading: "Upcoming Events",
  upcomingDescription:
    "Current and upcoming initiatives organized by CCF at Crescent Campus.",
  pastHeading: "Past Events",
  pastDescription:
    "Historical finance events and student activities completed by CCF.",
} as const;

export const EVENTS_CTA = {
  eyebrow: CCF_EYEBROW,
  heading: "Interested in CCF Initiatives?",
  description:
    "Connect with Crescent Club of Finance to explore upcoming activities or discover membership opportunities.",
  primaryCtaText: "Join CCF",
  primaryCtaHref: "/join-us",
  secondaryCtaText: "Meet the Team",
  secondaryCtaHref: "/members",
} as const;
