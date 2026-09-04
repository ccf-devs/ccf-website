import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Container } from "@/components/site/container";
import {
  EventDetailHero,
  EventDetails,
  EventContent,
  EventGallery,
  EventDetailCta,
} from "@/components/events";
import { CCF_EVENTS, getEventBySlug } from "@/lib/data/events";
import { getEventContentBySlug } from "@/lib/data/event-content";

interface EventDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return CCF_EVENTS.map((event) => ({
    slug: event.slug,
  }));
}

export async function generateMetadata({
  params,
}: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);

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
  const event = getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const content = getEventContentBySlug(slug);

  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <EventDetailHero event={event} />

      {/* 2. Structured Body Sections */}
      <Container className="space-y-4">
        <EventDetails event={event} />
        <EventContent event={event} content={content} />
        <EventGallery media={content?.media} />
        <EventDetailCta event={event} />
      </Container>
    </div>
  );
}
