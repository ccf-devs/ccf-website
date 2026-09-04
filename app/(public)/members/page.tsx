import { Metadata } from "next";
import {
  MembersHero,
  MembersLeadership,
  MembersDirectory,
  MembersCta,
} from "@/components/members";

export const metadata: Metadata = {
  title: "Members — Crescent Club of Finance | Crescent College",
  description:
    "Meet the student members and executive leadership of the Crescent Club of Finance (CCF) at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
  openGraph: {
    title: "Members — Crescent Club of Finance",
    description:
      "Meet the student members and executive leadership of the Crescent Club of Finance.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

export default function MembersPage() {
  return (
    <div className="flex flex-col">
      {/* 1. Members Hero */}
      <MembersHero />

      {/* 2. Executive Leadership Board */}
      <MembersLeadership />

      {/* 3. Members Directory */}
      <MembersDirectory />

      {/* 4. Join CCF Call to Action */}
      <MembersCta />
    </div>
  );
}
