import { Metadata } from "next";
import {
  EventsHero,
  EventsOverview,
  EventsList,
  EventsCta,
} from "@/components/events";

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

export default function EventsPage() {
  return (
    <div className="flex flex-col">
      {/* 1. Events Hero */}
      <EventsHero />

      {/* 2. Events Summary Overview */}
      <EventsOverview />

      {/* 3. Events Directory (Upcoming and Past) */}
      <EventsList />

      {/* 4. Join / Contact CTA */}
      <EventsCta />
    </div>
  );
}
