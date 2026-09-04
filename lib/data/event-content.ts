export interface CcfEventMedia {
  id: string;
  objectKey: string;
  altText: string;
  displayOrder: number;
  width?: number;
  height?: number;
  caption?: string;
}

export interface CcfEventContent {
  slug: string;
  about?: string;
  highlights?: readonly string[];
  notes?: string;
  media?: readonly CcfEventMedia[];
}

export const EVENT_NOTICES = {
  upcoming: "Additional event details will be published as they are confirmed.",
  past: "This event has concluded. Registrations and submissions are closed.",
  emptyHighlights: "Event highlights will be added here.",
  emptyGallery: "Event media will be added here.",
} as const;

/**
 * Factual event content records keyed strictly by canonical event slug.
 * Does not duplicate event identity metadata (names, dates, venues, categories, etc.)
 * which remains authoritatively defined in lib/data/events.ts.
 */
export const CCF_EVENT_CONTENTS: readonly CcfEventContent[] = [
  {
    slug: "magnora-26",
    about:
      "Finance and business symposium organized by CCF at Crescent College.",
    notes: EVENT_NOTICES.upcoming,
    media: [],
  },
  {
    slug: "finrise-25",
    about: "Finance and investment event organized by CCF.",
    notes: EVENT_NOTICES.past,
    media: [],
  },
  {
    slug: "finvibe-fiesta-s2",
    about:
      "Finance event organized by CCF featuring student activities and competitions.",
    notes: EVENT_NOTICES.past,
    media: [],
  },
] as const;

/**
 * Resolves event rich content and media configuration by its canonical slug.
 */
export function getEventContentBySlug(slug: string): CcfEventContent | undefined {
  return CCF_EVENT_CONTENTS.find((content) => content.slug === slug);
}

/**
 * Resolves a public URL for event media when objectKey is present.
 * Supports absolute URLs, root-relative paths, or R2-backed paths via
 * NEXT_PUBLIC_MEDIA_URL or NEXT_PUBLIC_R2_PUBLIC_URL.
 * If objectKey is absent or no base URL is configured, returns null to trigger
 * the approved empty state without inventing unverified domains.
 */
export function getEventMediaUrl(objectKey?: string): string | null {
  if (!objectKey || typeof objectKey !== "string") {
    return null;
  }
  const trimmed = objectKey.trim();
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_MEDIA_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
  }
  return null;
}
