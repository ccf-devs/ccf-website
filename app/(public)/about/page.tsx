import { Metadata } from "next";
import {
  AboutHero,
  AboutIntro,
  VisionMissionSection,
  PurposePillars,
  WhatCCFDoes,
  FoundationSection,
  AboutLeadership,
  AboutCta,
} from "@/components/about";

export const metadata: Metadata = {
  title: "About CCF — Crescent Club of Finance | Crescent College",
  description:
    "Learn about the Crescent Club of Finance (CCF), the student finance society of B.S. Abdur Rahman Crescent Institute of Science and Technology, Vandalur. Explore our purpose, vision, activities, and leadership.",
  openGraph: {
    title: "About CCF — Crescent Club of Finance",
    description:
      "The student finance society of B.S. Abdur Rahman Crescent Institute of Science and Technology, Vandalur. Dedicated to financial literacy, market awareness, and practical learning.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* 1. About Hero */}
      <AboutHero />

      {/* 2. Official Overview / Introduction */}
      <AboutIntro />

      {/* 3. Vision, Mission & Strategic Objectives */}
      <VisionMissionSection />

      {/* 4. Purpose Pillars (Literacy, Market, Practical, Initiatives) */}
      <PurposePillars />

      {/* 5. What CCF Does (Activities, Symposiums, Competitions, Workshops) */}
      <WhatCCFDoes />

      {/* 6. Foundation & Context (Present-focused, factual narrative) */}
      <FoundationSection />

      {/* 7. Confirmed Executive Leadership */}
      <AboutLeadership />

      {/* 8. Call to Action (Events & Join Us) */}
      <AboutCta />
    </div>
  );
}
