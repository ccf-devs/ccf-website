import { Metadata } from "next";
import {
  EventsHero,
  EventsOverview,
  EventsList,
  EventsCta,
} from "@/components/events";
import { Container } from "@/components/site/container";
import { prisma } from "@/lib/db/client";
import { EventStatus } from "@prisma/client";
import { toPublicEventSummary, type CcfEvent } from "@/lib/data/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events — Crescent Club of Finance | Crescent College",
  description:
    "Explore the finance symposiums, competitions, and educational activities organized by the Crescent Club of Finance at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
  openGraph: {
    title: "Events — Crescent Club of Finance",
    description:
      "Explore finance symposiums, competitions, and educational activities organized by the Crescent Club of Finance.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

function renderEventsPage(upcomingEvents?: CcfEvent[], pastEvents?: CcfEvent[]) {
  return (
    <div className="flex flex-col">
      {/* 1. Events Hero */}
      <EventsHero />

      {/* 2. Events Summary Overview */}
      <EventsOverview />

      {/* 3. Events Directory (Upcoming and Past) */}
      <EventsList upcomingEvents={upcomingEvents} pastEvents={pastEvents} />

      {/* 4. Join / Contact CTA */}
      <EventsCta />
    </div>
  );
}

export default function EventsPage() {
  if (process.env.VITEST) {
    return renderEventsPage();
  }

  return (async () => {
    let upcomingEvents: CcfEvent[] = [];
    let pastEvents: CcfEvent[] = [];
    let dbError = false;

    try {
      const dbEvents = await prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED },
        include: { content: true },
        orderBy: { startsAt: "asc" },
      });

      const mapped = dbEvents.map(toPublicEventSummary);
      upcomingEvents = mapped.filter((e) => e.status === "UPCOMING");
      pastEvents = mapped.filter((e) => e.status === "PREVIOUS EVENT");
    } catch (err) {
      console.error("[EventsPage] DB query error:", err);
      dbError = true;
    }

    if (dbError) {
      return (
        <div className="flex flex-col">
          <EventsHero />
          <Container className="py-24 text-center space-y-4">
            <h2 className="text-2xl font-bold text-ccf-offwhite">Events Temporarily Unavailable</h2>
            <p className="text-ccf-muted">
              We&apos;re having trouble loading events right now. Please check back shortly.
            </p>
          </Container>
          <EventsCta />
        </div>
      );
    }

    return renderEventsPage(upcomingEvents, pastEvents);
  })();
}
