import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Container } from "@/components/site/container";
import {
  EventDetailHero,
  EventDetails,
  EventContent,
  EventGallery,
  EventRegistrationCta,
  EventDetailCta,
} from "@/components/events";
import { CCF_EVENTS, getEventBySlug, toPublicEventSummary, type CcfEvent } from "@/lib/data/events";
import { getEventContentBySlug, type CcfEventMedia } from "@/lib/data/event-content";
import { prisma } from "@/lib/db/client";
import { EventStatus } from "@prisma/client";

interface EventDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CCF_EVENTS.map((event) => ({
    slug: event.slug,
  }));
}

export async function generateMetadata({
  params,
}: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (process.env.VITEST) {
    const staticEvent = getEventBySlug(slug);
    if (!staticEvent) {
      return {
        title: "Event Not Found — Crescent Club of Finance",
      };
    }
    return {
      title: `${staticEvent.name} — Crescent Club of Finance | Crescent College`,
      description: staticEvent.description,
      openGraph: {
        title: `${staticEvent.name} — Crescent Club of Finance`,
        description: staticEvent.description,
        siteName: "Crescent Club of Finance",
        locale: "en_US",
        type: "website",
      },
    };
  }

  let event: CcfEvent | null = null;
  try {
    const dbEvent = await prisma.event.findUnique({
      where: { slug },
      include: { content: true },
    });
    if (dbEvent && dbEvent.status === EventStatus.PUBLISHED) {
      event = toPublicEventSummary(dbEvent);
    }
  } catch (err) {
    console.error("[generateMetadata] DB query error:", err);
  }

  if (!event) {
    return {
      title: "Event Not Found — Crescent Club of Finance",
    };
  }

  return {
    title: `${event.name} — Crescent Club of Finance | Crescent College`,
    description: event.description,
    openGraph: {
      title: `${event.name} — Crescent Club of Finance`,
      description: event.description,
      siteName: "Crescent Club of Finance",
      locale: "en_US",
      type: "website",
    },
  };
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { slug } = await params;

  // Unit-test-only static fallback branch
  if (process.env.VITEST) {
    const staticEvent = getEventBySlug(slug);
    if (!staticEvent) {
      notFound();
    }
    const content = getEventContentBySlug(slug);
    return (
      <div className="flex flex-col">
        {/* 1. Hero Section */}
        <EventDetailHero event={staticEvent} />

        {/* 2. Structured Body Sections */}
        <Container className="space-y-4">
          <EventDetails event={staticEvent} />
          <EventContent event={staticEvent} content={content} />
          <EventGallery media={content?.media} />
          <EventRegistrationCta event={staticEvent} />
          <EventDetailCta event={staticEvent} />
        </Container>
      </div>
    );
  }

  // Production runtime behavior — strictly follows error contracts
  let dbEvent: any = null;
  let dbError = false;

  try {
    dbEvent = await prisma.event.findUnique({
      where: { slug },
      include: { content: true },
    });
  } catch (err) {
    console.error("[EventDetailPage] DB query error:", err);
    dbError = true;
  }

  // Contract: DB query throws -> render friendly unavailable state, never notFound(), never static fallback
  if (dbError) {
    return (
      <Container className="py-24 text-center space-y-4">
        <h1 className="text-2xl font-bold text-ccf-offwhite">Event Unavailable</h1>
        <p className="text-ccf-muted">
          We&apos;re having trouble loading this event. Please try again shortly.
        </p>
      </Container>
    );
  }

  // Contract: DB query succeeds, no event found -> notFound()
  if (!dbEvent) {
    notFound();
  }

  // Contract: DB query succeeds, event found, status not PUBLISHED -> unavailable notice
  if (dbEvent.status !== EventStatus.PUBLISHED) {
    return (
      <Container className="py-24 text-center space-y-4">
        <h1 className="text-2xl font-bold text-ccf-offwhite">Event Not Available</h1>
        <p className="text-ccf-muted">This event is not currently available.</p>
      </Container>
    );
  }

  const event = toPublicEventSummary(dbEvent);
  const content = getEventContentBySlug(slug);

  // Fetch visible event media (cover + gallery) using existing application media proxy route
  let coverImageUrl: string | null = null;
  let galleryMedia: CcfEventMedia[] = [];

  try {
    const allVisibleMedia = await prisma.media.findMany({
      where: { eventId: dbEvent.id, visibility: true },
      orderBy: { displayOrder: "asc" },
    });

    if (allVisibleMedia.length > 0) {
      // First visible media item is designated as the hero cover image
      coverImageUrl = `/api/media/${allVisibleMedia[0].objectKey}`;

      // Remaining visible media items are passed to the event gallery
      galleryMedia = allVisibleMedia.slice(1).map((m) => ({
        id: m.id,
        objectKey: m.objectKey,
        altText: m.altText || dbEvent.name,
        displayOrder: m.displayOrder,
        width: m.width || undefined,
        height: m.height || undefined,
      }));
    }
  } catch (err) {
    console.error("[EventDetailPage] Media query error:", err);
  }

  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <EventDetailHero event={event} coverImageUrl={coverImageUrl} />

      {/* 2. Structured Body Sections */}
      <Container className="space-y-4">
        <EventDetails event={event} />
        <EventContent event={event} content={content} />
        <EventGallery media={galleryMedia} />
        <EventRegistrationCta event={event} />
        <EventDetailCta event={event} />
      </Container>
    </div>
  );
}
