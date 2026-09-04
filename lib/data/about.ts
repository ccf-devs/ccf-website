/**
 * CCF About Page Static & Structured Data
 *
 * NOTE: All facts adhere strictly to the CCF Product Engineering Handbook v0.5 FINAL
 * and Section 7 confirmed organization details.
 *
 * Conservative content rules:
 * - No unverified marketing superlatives (e.g. premier, leading, flagship, largest).
 * - No fabricated historical claims (e.g. founding year, member counts, awards, rankings).
 * - Confirmed executive board only (Remi Kayalvizhi, Fizza Fathima, Zayan Ahmed) with no invented biographies.
 */

import { CCF_EYEBROW } from "@/components/site/navigation-data";

export interface AboutLeader {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface AboutPillar {
  id: string;
  title: string;
  description: string;
  iconName: "BookOpen" | "LineChart" | "Lightbulb" | "Users";
}

export interface AboutActivity {
  id: string;
  title: string;
  description: string;
  iconName: "Presentation" | "TrendingUp" | "Trophy" | "GraduationCap";
}

export interface AboutObjective {
  id: string;
  title: string;
  description: string;
}

export interface AboutVisionMission {
  vision: string;
  mission: string;
  objectives: readonly AboutObjective[];
}

/**
 * About page hero copy
 */
export const ABOUT_HERO = {
  eyebrow: "About CCF",
  institution: CCF_EYEBROW,
  title: "Student-Led Finance at Crescent College",
  subtitle:
    "Dedicated to financial literacy, market awareness, and practical learning across all disciplines at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
} as const;

/**
 * Verified organizational overview
 */
export const ABOUT_OVERVIEW = {
  summary:
    "The Crescent Club of Finance (CCF) is a student-driven initiative at B.S. Abdur Rahman Crescent Institute of Science and Technology, located in Vandalur, Chennai.",
  paragraphs: [
    "The Crescent Club of Finance (CCF) is the student finance organization of B.S. Abdur Rahman Crescent Institute of Science and Technology in Vandalur. Established as an inclusive campus platform, CCF brings together students from diverse academic disciplines—both undergraduate and postgraduate—to explore the principles of finance, fiscal management, and economic awareness.",
    "Our focus is practical learning. By connecting core economic concepts with practical applications, CCF encourages students, including those from non-finance backgrounds, to develop foundational money-management skills, understand market dynamics, and cultivate informed decision-making habits that endure beyond graduation.",
    "Through student-organized symposiums, investment events, interactive sessions, and collaborative projects, CCF provides a structured environment where students can collaborate, participate in academic activities, and build meaningful professional readiness.",
  ],
} as const;

/**
 * Stated Vision, Mission, and Objectives from Section 7 of the CCF Product Engineering Handbook.
 */
export const ABOUT_VISION_MISSION: AboutVisionMission = {
  vision:
    "To create a financially literate community in which students from all backgrounds gain confidence to make informed financial decisions for life.",
  mission:
    "To equip students, including non-finance majors, with essential financial knowledge and money-management skills through interactive learning and practical experiences.",
  objectives: [
    {
      id: "obj-skill-dev",
      title: "Holistic Skill Development",
      description:
        "Fostering financial competencies through workshops, interactive sessions, and practical learning exercises designed for all academic streams.",
    },
    {
      id: "obj-interdisciplinary",
      title: "Interdisciplinary Collaboration",
      description:
        "Integrating diverse perspectives across engineering, business, arts, and sciences through collaborative finance initiatives.",
    },
    {
      id: "obj-learning-hub",
      title: "Lifelong Financial Learning Hub",
      description:
        "Cultivating a durable campus environment that creates positive impact through financial literacy outreach and peer education.",
    },
  ],
} as const;

/**
 * Core Purpose Pillars
 */
export const ABOUT_PILLARS: readonly AboutPillar[] = [
  {
    id: "pillar-literacy",
    title: "Financial Literacy",
    description:
      "Demystifying personal budgeting, saving strategies, debt awareness, and fundamental financial concepts for students of all disciplines.",
    iconName: "BookOpen",
  },
  {
    id: "pillar-market",
    title: "Market Awareness",
    description:
      "Building structured understanding of economic indicators, capital market principles, corporate structures, and fiscal developments.",
    iconName: "LineChart",
  },
  {
    id: "pillar-practical",
    title: "Practical Learning",
    description:
      "Connecting academic concepts to practical applications through discussions, analysis, and student-led exercises.",
    iconName: "Lightbulb",
  },
  {
    id: "pillar-initiatives",
    title: "Student Initiatives",
    description:
      "Encouraging students to organize club events, collaborate across academic departments, and develop teamwork skills.",
    iconName: "Users",
  },
] as const;

/**
 * What CCF Does (Activities and Event Types)
 * Verified against documented CCF events: Magnora'26, FinRise'25, FinVibe Fiesta S2, etc.
 */
export const ABOUT_ACTIVITIES: readonly AboutActivity[] = [
  {
    id: "act-symposiums",
    title: "Finance & Business Symposiums",
    description:
      "Conferences and multi-event symposiums organized by CCF at Crescent Campus, bringing students together for academic discussions and structured competitions.",
    iconName: "Presentation",
  },
  {
    id: "act-investment",
    title: "Finance & Investment Events",
    description:
      "Sessions and discussions focused on understanding investment instruments, financial analysis, and broader economic perspectives.",
    iconName: "TrendingUp",
  },
  {
    id: "act-competitions",
    title: "Student Activities & Competitions",
    description:
      "Interactive finance challenges, quizzes, and problem-solving events that foster teamwork and critical thinking among participants.",
    iconName: "Trophy",
  },
  {
    id: "act-workshops",
    title: "Workshops & Learning Sessions",
    description:
      "Skill-building seminars and introductory discussions covering personal finance, fiscal awareness, and core business tools.",
    iconName: "GraduationCap",
  },
] as const;

/**
 * Present-focused narrative: Foundation & Purpose
 * Strictly avoids unverified historical dates, awards, rankings, or member statistics.
 */
export const ABOUT_FOUNDATION = {
  title: "Our Foundation & Focus",
  subtitle: "A student-driven initiative grounded in accessible financial education.",
  content: [
    "The Crescent Club of Finance was established at B.S. Abdur Rahman Crescent Institute of Science and Technology with a direct purpose: to make financial understanding accessible, practical, and engaging for every student on campus.",
    "Recognizing that financial literacy is an essential life skill regardless of whether a student studies engineering, computer science, architecture, or commerce, CCF operates as an open, interdisciplinary society.",
    "Rather than treating finance solely as an academic discipline, CCF approaches it as a foundational toolkit for everyday decision-making, professional readiness, and informed citizenship.",
    "Today, CCF continues to operate under student governance with institutional coordination, organizing events, symposiums, and collaborative projects that welcome both Crescent students and external participants.",
  ],
} as const;

/**
 * Confirmed executive leadership board from Section 7 of the handbook.
 * Unverified biographies or descriptions are strictly omitted.
 */
export const ABOUT_LEADERSHIP: readonly AboutLeader[] = [
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
