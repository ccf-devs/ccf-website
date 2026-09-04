/**
 * CCF Homepage Static & Mock Data
 *
 * NOTE: This file isolates mock and preview data used on the public home page.
 * All facts adhere strictly to the CCF Product Engineering Handbook v0.5 FINAL.
 *
 * Future Phase integration:
 * - featuredEvents -> replaced by Prisma query `prisma.event.findMany({ where: { status: { in: [...] } } })`
 * - departments -> replaced by Prisma query `prisma.department.findMany({ where: { active: true } })`
 * - leadership -> replaced by Prisma query `prisma.member.findMany(...)`
 */

import { CCF_DEPARTMENTS, type CcfDepartment } from "@/lib/data/departments";

export type HomepageDepartment = CcfDepartment;

/**
 * Five confirmed CCF departments shared from canonical departments data.
 */
export const HOMEPAGE_DEPARTMENTS: readonly HomepageDepartment[] = CCF_DEPARTMENTS;

export interface HomepageEvent {
  id: string;
  slug: string;
  name: string;
  edition?: string;
  dateText: string;
  venueText?: string;
  shortDescription: string;
  status: "UPCOMING" | "REGISTRATION NOT OPEN" | "PREVIOUS EVENT" | "REGISTRATION CLOSED";
  statusVariant: "success" | "warning" | "destructive" | "info";
  category?: string;
}

export interface HomepageLeader {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface ValueProposition {
  id: string;
  title: string;
  description: string;
  iconName: "BookOpen" | "LineChart" | "Trophy" | "Users";
}

/**
 * Confirmed CCF events from project documentation.
 * Historical events are marked as previous events, avoiding stale or unverified registration claims.
 */
export const HOMEPAGE_FEATURED_EVENTS: readonly HomepageEvent[] = [
  {
    id: "evt-magnora-26",
    slug: "magnora-26",
    name: "Magnora’26",
    edition: "2026",
    dateText: "2026",
    venueText: "Crescent Campus, Vandalur",
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
    venueText: "Crescent Campus, Vandalur",
    shortDescription:
      "Finance and investment event organized by CCF.",
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
    venueText: "International Event • Crescent Campus",
    shortDescription:
      "Finance event organized by CCF featuring student activities and competitions.",
    status: "PREVIOUS EVENT",
    statusVariant: "info",
    category: "Festival",
  },
] as const;

/**
 * Confirmed CCF executive leadership board from project documentation.
 */
export const HOMEPAGE_LEADERSHIP: readonly HomepageLeader[] = [
  {
    id: "lead-president",
    name: "Remi Kayalvizhi",
    role: "President",
    initials: "RK",
  },
  {
    id: "lead-vp",
    name: "Fizza Fathima",
    role: "Vice President",
    initials: "FF",
  },
  {
    id: "lead-md",
    name: "Zayan Ahmed",
    role: "Managing Director",
    initials: "ZA",
  },
] as const;

/**
 * Core value proposition pillars reflecting CCF's mission at Crescent College.
 * Descriptions are conservative and defensible.
 */
export const HOMEPAGE_VALUE_PROPS: readonly ValueProposition[] = [
  {
    id: "vp-learning",
    title: "Financial Literacy & Learning",
    description:
      "Introductory and practical discussions covering personal finance, basic market concepts, and fiscal awareness.",
    iconName: "BookOpen",
  },
  {
    id: "vp-exposure",
    title: "Practical Market Exposure",
    description:
      "Interactive sessions, case discussions, and applied exercises connecting theory with practical understanding.",
    iconName: "LineChart",
  },
  {
    id: "vp-competitions",
    title: "Events & Competitions",
    description:
      "Symposiums, quizzes, and inter-collegiate challenges hosted for students interested in finance.",
    iconName: "Trophy",
  },
  {
    id: "vp-community",
    title: "Collaborative Finance Community",
    description:
      "A student community bringing together peers across disciplines at Crescent College who share an interest in finance.",
    iconName: "Users",
  },
] as const;
