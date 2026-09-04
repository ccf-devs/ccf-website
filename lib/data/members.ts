import { CCF_EYEBROW } from "@/components/site/navigation-data";

export interface CcfMember {
  id: string;
  name: string;
  department: string;
  designation: string;
  photoObjectKey?: string;
  displayOrder: number;
  initials: string;
}

export interface CcfLeader {
  id: string;
  name: string;
  role: string;
  initials: string;
}

/**
 * 50 Approved CCF Member Records from the official member directory spreadsheet.
 * Preserves exact approved spellings, designations, and department/team labels.
 */
export const CCF_MEMBERS: readonly CcfMember[] = [
  {
    id: "mem-01-remi-kayalvizhi",
    name: "Remi Kayalvizhi",
    department: "Admin Board",
    designation: "President",
    displayOrder: 1,
    initials: "RK",
  },
  {
    id: "mem-02-fizza-fathima",
    name: "Fizza Fathima",
    department: "Admin Board",
    designation: "Vice-President",
    displayOrder: 2,
    initials: "FF",
  },
  {
    id: "mem-03-zayan-ahmed",
    name: "Zayan Ahmed",
    department: "Admin Board",
    designation: "Managing Director",
    displayOrder: 3,
    initials: "ZA",
  },
  {
    id: "mem-04-siddhartha-bharathi",
    name: "Siddhartha Bharathi",
    department: "Project Management",
    designation: "Director",
    displayOrder: 4,
    initials: "SB",
  },
  {
    id: "mem-05-roshan-begum",
    name: "Roshan Begum",
    department: "IT/Media/Photography",
    designation: "Director",
    displayOrder: 5,
    initials: "RB",
  },
  {
    id: "mem-06-sarah-hameed",
    name: "Sarah Hameed",
    department: "Event Management",
    designation: "Director",
    displayOrder: 6,
    initials: "SH",
  },
  {
    id: "mem-07-hameed-thufail",
    name: "Hameed Thufail",
    department: "Finance",
    designation: "Director",
    displayOrder: 7,
    initials: "HT",
  },
  {
    id: "mem-08-fazidi-afridi",
    name: "Fazidi Afridi",
    department: "Marketing & Public Relation",
    designation: "Director",
    displayOrder: 8,
    initials: "FA",
  },
  {
    id: "mem-09-varshini",
    name: "Varshini",
    department: "Project Drafting",
    designation: "Joint Director",
    displayOrder: 9,
    initials: "VA",
  },
  {
    id: "mem-10-mohammed-yahya",
    name: "Mohammed Yahya",
    department: "Media",
    designation: "Joint Director",
    displayOrder: 10,
    initials: "MY",
  },
  {
    id: "mem-11-arshad-ahamed",
    name: "Arshad Ahamed",
    department: "IT",
    designation: "Joint Director",
    displayOrder: 11,
    initials: "AA",
  },
  {
    id: "mem-12-suriya-krishna",
    name: "Suriya Krishna",
    department: "Photography",
    designation: "Joint Director",
    displayOrder: 12,
    initials: "SK",
  },
  {
    id: "mem-13-aafreen-khateeja",
    name: "Aafreen Khateeja",
    department: "Marketing",
    designation: "Joint Director",
    displayOrder: 13,
    initials: "AK",
  },
  {
    id: "mem-14-dimple-jain",
    name: "Dimple Jain",
    department: "Event Management (Finance)",
    designation: "Joint Director",
    displayOrder: 14,
    initials: "DJ",
  },
  {
    id: "mem-15-niha-fathima",
    name: "Niha Fathima",
    department: "Event Management (Non-Finance)",
    designation: "Joint Director",
    displayOrder: 15,
    initials: "NF",
  },
  {
    id: "mem-16-shaikh-juhair",
    name: "Shaikh Juhair",
    department: "Finance",
    designation: "Joint Director",
    displayOrder: 16,
    initials: "SJ",
  },
  {
    id: "mem-17-thariq-ansari",
    name: "Thariq Ansari",
    department: "Public Relations",
    designation: "Joint Director",
    displayOrder: 17,
    initials: "TA",
  },
  {
    id: "mem-18-chandru",
    name: "Chandru",
    department: "Event Management (Finance)",
    designation: "Executive Member",
    displayOrder: 18,
    initials: "CH",
  },
  {
    id: "mem-19-haaziq",
    name: "Haaziq",
    department: "Event Management (Finance)",
    designation: "Executive Member",
    displayOrder: 19,
    initials: "HA",
  },
  {
    id: "mem-20-ayesha-zafreen",
    name: "Ayesha Zafreen",
    department: "Event Management (Finance)",
    designation: "Executive Member",
    displayOrder: 20,
    initials: "AZ",
  },
  {
    id: "mem-21-mikkel-thomas",
    name: "Mikkel Thomas",
    department: "Event Management (Finance)",
    designation: "Executive Member",
    displayOrder: 21,
    initials: "MT",
  },
  {
    id: "mem-22-sakina-banu",
    name: "Sakina Banu",
    department: "Event Management (Non-Finance)",
    designation: "Executive Member",
    displayOrder: 22,
    initials: "SB",
  },
  {
    id: "mem-23-syed-omar",
    name: "Syed Omar",
    department: "Event Management (Non-Finance)",
    designation: "Executive Member",
    displayOrder: 23,
    initials: "SO",
  },
  {
    id: "mem-24-nawfal",
    name: "Nawfal",
    department: "Event Management (Non-Finance)",
    designation: "Executive Member",
    displayOrder: 24,
    initials: "NA",
  },
  {
    id: "mem-25-vijay",
    name: "Vijay",
    department: "Event Management (Non-Finance)",
    designation: "Executive Member",
    displayOrder: 25,
    initials: "VI",
  },
  {
    id: "mem-26-aparna",
    name: "Aparna",
    department: "Finance Team",
    designation: "Executive Member",
    displayOrder: 26,
    initials: "AP",
  },
  {
    id: "mem-27-pooja",
    name: "Pooja",
    department: "Finance Team",
    designation: "Executive Member",
    displayOrder: 27,
    initials: "PO",
  },
  {
    id: "mem-28-aaliya-anjum",
    name: "Aaliya Anjum",
    department: "Finance Team",
    designation: "Executive Member",
    displayOrder: 28,
    initials: "AA",
  },
  {
    id: "mem-29-shanas",
    name: "Shanas",
    department: "Marketing Team",
    designation: "Executive Member",
    displayOrder: 29,
    initials: "SH",
  },
  {
    id: "mem-30-saifullah",
    name: "Saifullah",
    department: "Marketing Team",
    designation: "Executive Member",
    displayOrder: 30,
    initials: "SA",
  },
  {
    id: "mem-31-naazia",
    name: "Naazia",
    department: "Marketing Team",
    designation: "Executive Member",
    displayOrder: 31,
    initials: "NA",
  },
  {
    id: "mem-32-priyanka-devaraj",
    name: "Priyanka Devaraj",
    department: "Public Relations",
    designation: "Executive Member",
    displayOrder: 32,
    initials: "PD",
  },
  {
    id: "mem-33-rithanya",
    name: "Rithanya",
    department: "Public Relations",
    designation: "Executive Member",
    displayOrder: 33,
    initials: "RI",
  },
  {
    id: "mem-34-sharath",
    name: "Sharath",
    department: "Public Relations",
    designation: "Executive Member",
    displayOrder: 34,
    initials: "SH",
  },
  {
    id: "mem-35-syed-azza",
    name: "Syed Azza",
    department: "IT Team",
    designation: "Executive Member",
    displayOrder: 35,
    initials: "SA",
  },
  {
    id: "mem-36-yamuna-shri",
    name: "Yamuna Shri",
    department: "IT Team",
    designation: "Executive Member",
    displayOrder: 36,
    initials: "YS",
  },
  {
    id: "mem-37-elakkiya",
    name: "Elakkiya",
    department: "Media Team",
    designation: "Executive Member",
    displayOrder: 37,
    initials: "EL",
  },
  {
    id: "mem-38-pooja",
    name: "Pooja",
    department: "Media Team",
    designation: "Executive Member",
    displayOrder: 38,
    initials: "PO",
  },
  {
    id: "mem-39-nandhana-priya",
    name: "Nandhana Priya",
    department: "Project Management",
    designation: "Executive Member",
    displayOrder: 39,
    initials: "NP",
  },
  {
    id: "mem-40-irfan-mohamed",
    name: "Irfan Mohamed",
    department: "Project Management",
    designation: "Executive Member",
    displayOrder: 40,
    initials: "IM",
  },
  {
    id: "mem-41-mithra",
    name: "Mithra",
    department: "Drafting Team",
    designation: "Executive Member",
    displayOrder: 41,
    initials: "MI",
  },
  {
    id: "mem-42-ramya-lakshmi",
    name: "Ramya Lakshmi",
    department: "Drafting Team",
    designation: "Executive Member",
    displayOrder: 42,
    initials: "RL",
  },
  {
    id: "mem-43-jahid",
    name: "Jahid",
    department: "IT/Media/Photography",
    designation: "Head of Subcommitee",
    displayOrder: 43,
    initials: "JA",
  },
  {
    id: "mem-44-dinesh",
    name: "Dinesh",
    department: "Event Management",
    designation: "Head of Subcommitee",
    displayOrder: 44,
    initials: "DI",
  },
  {
    id: "mem-45-kaamesh",
    name: "Kaamesh",
    department: "Project Management",
    designation: "Head of Subcommitee",
    displayOrder: 45,
    initials: "KA",
  },
  {
    id: "mem-46-latheefa",
    name: "Latheefa",
    department: "Marketing",
    designation: "Head of Subcommitee",
    displayOrder: 46,
    initials: "LA",
  },
  {
    id: "mem-47-abdullah",
    name: "Abdullah",
    department: "Finance",
    designation: "Head of Subcommitee",
    displayOrder: 47,
    initials: "AB",
  },
  {
    id: "mem-48-pathamapriya",
    name: "Pathamapriya",
    department: "Advisory Board",
    designation: "Senior Mentor",
    displayOrder: 48,
    initials: "PA",
  },
  {
    id: "mem-49-sumetha",
    name: "Sumetha",
    department: "Advisory Board",
    designation: "Senior Mentor",
    displayOrder: 49,
    initials: "SU",
  },
  {
    id: "mem-50-theshani-s-s",
    name: "Theshani S S",
    department: "Project Management",
    designation: "Joint Director",
    displayOrder: 50,
    initials: "TS",
  },
] as const;

/**
 * Admin Board leadership records filtered directly from canonical CCF_MEMBERS.
 */
export const CCF_ADMIN_BOARD_LEADERS: readonly CcfMember[] = CCF_MEMBERS.filter(
  (member) => member.department === "Admin Board"
);

/**
 * Confirmed CCF executive leadership board maintained for backward compatibility
 * with homepage and about pages and their existing test suites.
 */
export const CCF_LEADERSHIP: readonly CcfLeader[] = [
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

export const MEMBERS_HERO = {
  eyebrow: CCF_EYEBROW,
  title: "Members",
  subtitle: "Meet the members of Crescent Club of Finance.",
} as const;

export const MEMBERS_DIRECTORY_INFO = {
  eyebrow: "Directory",
  heading: "Member Directory",
  countText: `${CCF_MEMBERS.length} Members`,
  description:
    "Explore the student members, team leads, and executive board of Crescent Club of Finance.",
} as const;

export const MEMBERS_CTA = {
  heading: "Interested in joining CCF?",
  description:
    "Explore membership opportunities or discover upcoming CCF events.",
  primaryCtaText: "Join CCF",
  primaryCtaHref: "/join-us",
  secondaryCtaText: "Explore Events",
  secondaryCtaHref: "/events",
} as const;

/**
 * Utility helper to get clean initials for a member name.
 */
export function getMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Resolves a public URL for a member's photo when photoObjectKey is present.
 * Supports absolute URLs, root-relative paths, or R2-backed paths via
 * NEXT_PUBLIC_MEDIA_URL or NEXT_PUBLIC_R2_PUBLIC_URL.
 * If photoObjectKey is absent or cannot be resolved, returns null so the UI
 * renders a clean monogram/initials fallback.
 *
 * Strictly avoids inventing unverified public domains.
 */
export function getMemberPhotoUrl(photoObjectKey?: string): string | null {
  if (!photoObjectKey || typeof photoObjectKey !== "string") {
    return null;
  }
  const trimmed = photoObjectKey.trim();
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_MEDIA_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
  }
  return null;
}

/**
 * Organizational hierarchy rank map for CCF designations.
 * Lower numerical values represent higher organizational ranks.
 *
 * Hierarchy:
 * 1. President
 * 2. Vice-President
 * 3. Managing Director
 * 10. Director
 * 20. Joint Director
 * 30. Executive Member
 * 40. Head of Subcommitee
 * 50. Senior Mentor (Advisory Board)
 */
export const DESIGNATION_HIERARCHY_RANK: Record<string, number> = {
  President: 1,
  "Vice-President": 2,
  "Managing Director": 3,
  Director: 10,
  "Joint Director": 20,
  "Executive Member": 30,
  "Head of Subcommitee": 40,
  "Senior Mentor": 50,
};

/**
 * Returns the numerical hierarchy rank for a given designation.
 * Unrecognized or lower-ranking roles receive higher rank numbers.
 */
export function getDesignationRank(designation: string): number {
  return DESIGNATION_HIERARCHY_RANK[designation] ?? 999;
}

/**
 * Sorts an array of CCF members according to organizational hierarchy:
 * 1. Designation hierarchy rank (Director -> Joint Director -> Executive Member -> Head of Subcommitee)
 * 2. Underlying displayOrder (as deterministic secondary sort key for same-rank members)
 */
export function sortMembersByHierarchy<T extends CcfMember>(
  members: readonly T[]
): T[] {
  return [...members].sort((a, b) => {
    const rankDiff =
      getDesignationRank(a.designation) - getDesignationRank(b.designation);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.displayOrder - b.displayOrder;
  });
}
