import { Metadata } from "next";
import {
  Hero,
  ClubIntro,
  FeaturedEvents,
  ValuePropositionSection,
  DepartmentsPreview,
  LeadershipPreview,
  JoinCta,
} from "@/components/home";
import { prisma } from "@/lib/db/client";
import { toPublicEventSummary, type CcfEvent } from "@/lib/data/events";
import { EventStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crescent Club of Finance (CCF) — Crescent College, Vandalur",
  description:
    "The student finance club of B.S. Abdur Rahman Crescent Institute of Science and Technology. Dedicated to financial literacy, market awareness, and student initiatives.",
  openGraph: {
    title: "Crescent Club of Finance (CCF)",
    description:
      "The student finance club of B.S. Abdur Rahman Crescent Institute of Science and Technology, Vandalur.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

export default async function HomePage() {
  let events: CcfEvent[] | undefined = undefined;
  let isError = false;

  if (!process.env.VITEST) {
    try {
      const dbEvents = await prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED },
        include: { content: true },
        orderBy: { startsAt: "asc" },
        take: 3,
      });
      events = dbEvents.map(toPublicEventSummary);
    } catch (error) {
      console.error("[HomePage] Failed to query featured events:", error);
      isError = true;
      events = [];
    }
  }

  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Club Introduction */}
      <ClubIntro />

      {/* 3. Featured & Upcoming Events */}
      <FeaturedEvents events={events} isError={isError} />

      {/* 4. Value Proposition & Pillars */}
      <ValuePropositionSection />

      {/* 5. Departments Preview */}
      <DepartmentsPreview />

      {/* 6. Executive Leadership Preview */}
      <LeadershipPreview />

      {/* 7. Recruitment / Join CCF Call-to-Action */}
      <JoinCta />
    </div>
  );
}
