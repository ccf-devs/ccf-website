import { CCF_EYEBROW } from "@/components/site/navigation-data";

export interface CcfDepartment {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  focusAreas: readonly string[];
  iconName: "TrendingUp" | "Monitor" | "Megaphone" | "FolderKanban" | "CalendarDays";
}

/**
 * Five confirmed CCF departments as specified in Section 10.3 of the Product Engineering Handbook.
 * Factual and conservative descriptions adhering to verified project documentation.
 */
export const CCF_DEPARTMENTS: readonly CcfDepartment[] = [
  {
    id: "dept-finance",
    slug: "finance-management",
    name: "Finance Management",
    shortDescription:
      "Responsible for club budgeting, financial planning, and sponsorship tracking.",
    description:
      "Oversees budgeting, financial records, and sponsorship tracking for CCF club activities.",
    focusAreas: [
      "Club budgeting and planning",
      "Financial records and documentation",
      "Sponsorship and resource tracking",
    ],
    iconName: "TrendingUp",
  },
  {
    id: "dept-it-media",
    slug: "it-media",
    name: "IT & Media",
    shortDescription:
      "Manages the CCF web platform, technical systems, and digital media production.",
    description:
      "Maintains the CCF website, digital systems, and media assets for club initiatives.",
    focusAreas: [
      "CCF website and platform maintenance",
      "Digital media and creative assets",
      "Technical support for club systems",
    ],
    iconName: "Monitor",
  },
  {
    id: "dept-marketing",
    slug: "marketing-pr",
    name: "Marketing & PR",
    shortDescription:
      "Handles publicity, social channels, and student communications across campus.",
    description:
      "Coordinates club publicity, official social media channels, and campus communications.",
    focusAreas: [
      "Campus publicity and communications",
      "Official social media channels",
      "Student outreach for club initiatives",
    ],
    iconName: "Megaphone",
  },
  {
    id: "dept-projects",
    slug: "project-department",
    name: "Project Department",
    shortDescription:
      "Coordinates initiatives, workshops, and collaborative academic activities.",
    description:
      "Coordinates educational workshops, student initiatives, and collaborative learning activities.",
    focusAreas: [
      "Student workshops and seminars",
      "Collaborative learning projects",
      "Educational activities across disciplines",
    ],
    iconName: "FolderKanban",
  },
  {
    id: "dept-events",
    slug: "event-management",
    name: "Event Management",
    shortDescription:
      "Plans and executes club events, seminars, and student competitions.",
    description:
      "Coordinates logistics, venue scheduling, and on-ground operations for club events.",
    focusAreas: [
      "Event planning and logistics",
      "Venue coordination and scheduling",
      "On-ground event execution",
    ],
    iconName: "CalendarDays",
  },
] as const;

export const DEPARTMENTS_HERO = {
  eyebrow: CCF_EYEBROW,
  title: "Departments",
  subtitle:
    "The five operational departments of the Crescent Club of Finance at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
} as const;

export const DEPARTMENTS_OVERVIEW = {
  eyebrow: "Structure",
  heading: "Organizational Structure",
  description:
    "CCF includes five departments covering different areas of club activity at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
  pillars: [
    {
      title: "Functional Roles",
      description:
        "Each department focuses on specific club responsibilities, including events, media, communications, and finances.",
    },
    {
      title: "Campus Community",
      description:
        "Open to students from all academic disciplines at Crescent College who share an interest in finance.",
    },
    {
      title: "Practical Learning",
      description:
        "Provides opportunities for students to participate in club activities, workshops, and student events.",
    },
  ],
} as const;
