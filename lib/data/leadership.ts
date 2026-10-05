import { prisma } from "@/lib/db/client";
import { CCF_LEADERSHIP } from "@/lib/data/members";

export interface ResolvedLeader {
  id: string;
  name: string;
  role: string;
  initials: string;
  photoObjectKey?: string;
  displayOrder: number;
}

/**
 * Supported executive leadership role designations.
 * Supports both hyphenated ('Vice-President') and unhyphenated ('Vice President') variants.
 */
export const LEADERSHIP_ROLES = [
  "President",
  "Vice President",
  "Vice-President",
  "Managing Director",
] as const;

/**
 * Returns canonical hierarchy rank for leadership positions:
 * 1. President
 * 2. Vice-President / Vice President
 * 3. Managing Director
 */
function getLeadershipRoleRank(position: string | null | undefined): number {
  if (!position) return 999;
  const normalized = position.replace(/-/g, " ").trim().toLowerCase();
  if (normalized === "president") return 1;
  if (normalized === "vice president") return 2;
  if (normalized === "managing director") return 3;
  return 100;
}

/**
 * Resolves active CCF executive leadership board from the database.
 * Falls back to canonical static leadership (CCF_LEADERSHIP) if the database
 * is unseeded, unreachable, or returns no matching records.
 */
export async function getActiveLeadership(): Promise<ResolvedLeader[]> {
  try {
    const members = await prisma.member.findMany({
      where: {
        visibility: true,
        position: {
          in: [
            "President",
            "Vice President",
            "Vice-President",
            "Managing Director",
          ],
        },
      },
      include: {
        photo: true,
      },
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    if (members.length > 0) {
      return members
        .sort((a, b) => {
          const rankA = getLeadershipRoleRank(a.position);
          const rankB = getLeadershipRoleRank(b.position);
          if (rankA !== rankB) return rankA - rankB;
          return a.displayOrder - b.displayOrder;
        })
        .map((m) => {
          const initials =
            m.name
              .split(" ")
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "M";
          return {
            id: m.id,
            name: m.name,
            role: m.position || "Leader",
            initials,
            photoObjectKey: m.photo?.objectKey || undefined,
            displayOrder: m.displayOrder,
          };
        });
    }
  } catch (error) {
    console.error("[getActiveLeadership] Failed to fetch leadership from database:", error);
  }

  // Fallback to confirmed executive board
  return CCF_LEADERSHIP.map((leader, index) => ({
    id: leader.id,
    name: leader.name,
    role: leader.role,
    initials: leader.initials,
    displayOrder: index + 1,
  }));
}

