import { prisma } from "@/lib/db/client";

export interface ResolvedLeader {
  id: string;
  name: string;
  role: string;
  initials: string;
  photoObjectKey?: string;
  displayOrder: number;
}

export async function getActiveLeadership(): Promise<ResolvedLeader[]> {
  const members = await prisma.member.findMany({
    where: {
      visibility: true,
      position: {
        in: ["President", "Vice President", "Managing Director"],
      }
    },
    include: {
      photo: true,
    },
    orderBy: [
      { displayOrder: 'asc' },
      { name: 'asc' }
    ]
  });

  const roles = ["President", "Vice President", "Managing Director"];
  
  // Sort by the explicit roles order first, then displayOrder
  return members.sort((a, b) => {
    const rankA = roles.indexOf(a.position as string);
    const rankB = roles.indexOf(b.position as string);
    if (rankA !== -1 && rankB !== -1 && rankA !== rankB) return rankA - rankB;
    return a.displayOrder - b.displayOrder;
  }).map(m => {
    const initials = m.name.split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "M";
    return {
      id: m.id,
      name: m.name,
      role: m.position || "Leader",
      initials,
      photoObjectKey: m.photo?.objectKey || undefined,
      displayOrder: m.displayOrder
    };
  });
}
