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
  registrationMode?: "NONE" | "INTERNAL" | "EXTERNAL";
  registrationMethod?: "NONE" | "BUILT_IN" | "GOOGLE_FORM";
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  externalRegistrationUrl?: string | null;
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
    registrationMode: "INTERNAL",
    registrationMethod: "BUILT_IN",
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
    registrationMode: "NONE",
    registrationMethod: "NONE",
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
    registrationMode: "NONE",
    registrationMethod: "NONE",
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

/**
 * Adapts a database Event (with optional EventContent) to the public CcfEvent shape.
 */
export function toPublicEventSummary(dbEvent: {
  id: string;
  slug: string;
  name: string;
  status: string;
  startsAt: Date | string | null;
  endsAt?: Date | string | null;
  venue?: string | null;
  registrationMode?: string | null;
  registrationMethod?: string | null;
  registrationOpensAt?: Date | string | null;
  registrationClosesAt?: Date | string | null;
  content?: {
    descriptionRich?: string | null;
    rulesRich?: string | null;
    instructionsRich?: string | null;
    eligibilityRich?: string | null;
    notesRich?: string | null;
  } | null;
}): CcfEvent {
  const now = new Date();
  const startsAtDate = dbEvent.startsAt ? new Date(dbEvent.startsAt) : null;
  const isUpcoming = !startsAtDate || startsAtDate >= now;

  let dateText = "TBA";
  if (startsAtDate && !isNaN(startsAtDate.getTime())) {
    dateText = startsAtDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const desc = dbEvent.content?.descriptionRich || "";
  const shortDesc = desc.length > 160 ? desc.slice(0, 157) + "..." : desc;

  let externalRegistrationUrl: string | null = null;
  const potentialUrl = dbEvent.content?.instructionsRich || dbEvent.content?.notesRich || "";
  const match = potentialUrl.match(/https?:\/\/[^\s"']+/);
  if (match) {
    externalRegistrationUrl = match[0];
  }

  return {
    id: dbEvent.id,
    slug: dbEvent.slug,
    name: dbEvent.name,
    status: isUpcoming ? "UPCOMING" : "PREVIOUS EVENT",
    statusVariant: isUpcoming ? "warning" : "info",
    dateText,
    venue: dbEvent.venue || "Crescent Campus, Vandalur",
    venueText: dbEvent.venue || "Crescent Campus, Vandalur",
    description: desc,
    shortDescription: shortDesc,
    registrationMode: (dbEvent.registrationMode as any) || "NONE",
    registrationMethod: (dbEvent.registrationMethod as any) || "NONE",
    registrationOpensAt: dbEvent.registrationOpensAt
      ? new Date(dbEvent.registrationOpensAt).toISOString()
      : null,
    registrationClosesAt: dbEvent.registrationClosesAt
      ? new Date(dbEvent.registrationClosesAt).toISOString()
      : null,
    externalRegistrationUrl,
  };
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
