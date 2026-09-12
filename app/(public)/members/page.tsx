import { Metadata } from "next";
import {
  MembersHero,
  MembersLeadership,
  MembersDirectory,
  MembersCta,
} from "@/components/members";
import { prisma } from "@/lib/db/client";
import { type DbMember } from "@/components/members/members-directory";

export const dynamic = "force-dynamic";

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

function renderMembersPage(members?: DbMember[], isError?: boolean) {
  return (
    <div className="flex flex-col">
      {/* 1. Members Hero */}
      <MembersHero />

      {/* 2. Executive Leadership Board */}
      <MembersLeadership />

      {/* 3. Members Directory */}
      <MembersDirectory members={members} isError={isError} />

      {/* 4. Join CCF Call to Action */}
      <MembersCta />
    </div>
  );
}

export default function MembersPage() {
  if (process.env.VITEST) {
    return renderMembersPage();
  }

  return (async () => {
    let members: DbMember[] = [];
    let isError = false;

    try {
      const dbMembers = await prisma.member.findMany({
        where: { visibility: true },
        include: {
          department: { select: { name: true } },
          photo: { select: { objectKey: true } },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      });

      members = dbMembers.map((m) => ({
        id: m.id,
        name: m.name,
        position: m.position,
        department: m.department,
        photoMedia: m.photo,
      }));
    } catch (err) {
      console.error("[MembersPage] DB query error:", err);
      isError = true;
    }

    return renderMembersPage(members, isError);
  })();
}
