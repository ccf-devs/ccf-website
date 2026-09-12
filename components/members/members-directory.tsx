import React from "react";
import { Users } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";
import {
  CCF_MEMBERS,
  MEMBERS_DIRECTORY_INFO,
  sortMembersByHierarchy,
} from "@/lib/data/members";
import { MemberAvatar } from "./member-avatar";

export interface DbMember {
  id: string;
  name: string;
  position: string | null;
  department: {
    name: string;
  };
  photoMedia?: {
    objectKey: string;
  } | null;
}

interface MembersDirectoryProps {
  members?: DbMember[];
  isError?: boolean;
}

export function MembersDirectory({ members, isError }: MembersDirectoryProps = {}) {
  if (isError) {
    return (
      <section id="directory" className="py-16 md:py-24 border-b border-border/30 bg-background">
        <Container className="space-y-4 text-center py-12">
          <p className="text-ccf-muted">Member information is temporarily unavailable. Please try again later.</p>
        </Container>
      </section>
    );
  }

  if (members !== undefined && members.length === 0) {
    return (
      <section id="directory" className="py-16 md:py-24 border-b border-border/30 bg-background">
        <Container className="space-y-4 text-center py-12">
          <p className="text-ccf-muted">Member profiles will be published here.</p>
        </Container>
      </section>
    );
  }

  let departmentGroups: {
    department: string;
    members: {
      id: string;
      name: string;
      designation: string;
      department: string;
      initials: string;
      photoObjectKey?: string;
    }[];
  }[] = [];

  if (members !== undefined) {
    const seen = new Set<string>();
    for (const member of members) {
      const deptName = member.department?.name || "General";
      if (!seen.has(deptName)) {
        seen.add(deptName);
        const deptMembers = members.filter(
          (m) => (m.department?.name || "General") === deptName
        );
        departmentGroups.push({
          department: deptName,
          members: deptMembers.map((m) => {
            const initials = m.name
              .split(" ")
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "M";
            return {
              id: m.id,
              name: m.name,
              designation: m.position || "Member",
              department: deptName,
              initials,
              photoObjectKey: m.photoMedia?.objectKey,
            };
          }),
        });
      }
    }
  } else {
    const seen = new Set<string>();
    for (const member of CCF_MEMBERS) {
      if (!seen.has(member.department)) {
        seen.add(member.department);
        const deptMembers = CCF_MEMBERS.filter(
          (m) => m.department === member.department
        );
        departmentGroups.push({
          department: member.department,
          members: sortMembersByHierarchy(deptMembers).map((m) => ({
            id: m.id,
            name: m.name,
            designation: m.designation,
            department: m.department,
            initials: m.initials,
            photoObjectKey: m.photoObjectKey,
          })),
        });
      }
    }
  }

  const countText =
    members !== undefined
      ? `${members.length} ${members.length === 1 ? "Member" : "Members"}`
      : MEMBERS_DIRECTORY_INFO.countText;

  return (
    <section id="directory" className="py-16 md:py-24 border-b border-border/30 bg-background">
      <Container className="space-y-16">
        {/* Section Header */}
        <FadeIn direction="up">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-border/30">
            <div className="space-y-1">
              <SectionHeading
                eyebrow="CRESCENT CLUB OF FINANCE"
                title={MEMBERS_DIRECTORY_INFO.heading}
                description={MEMBERS_DIRECTORY_INFO.description}
                align="left"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-ccf-gold/30 bg-ccf-surface-elevated/60 text-ccf-gold font-mono text-sm self-start md:self-auto shrink-0 shadow-xs">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="font-semibold">{countText}</span>
            </div>
          </div>
        </FadeIn>

        {/* Department Groups */}
        <div className="space-y-14">
          {departmentGroups.map((group) => (
            <div key={group.department} className="space-y-6">
              {/* Group Header */}
              <FadeIn direction="up">
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/20">
                  <h3 className="type-title text-ccf-offwhite font-display text-lg md:text-xl tracking-tight">
                    {group.department}
                  </h3>
                  <Badge variant="outline" className="text-xs text-ccf-muted border-border/40 font-mono">
                    {group.members.length} {group.members.length === 1 ? "Member" : "Members"}
                  </Badge>
                </div>
              </FadeIn>

              {/* Members Grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {group.members.map((member) => (
                  <Card
                    key={member.id}
                    hoverable
                    className="h-full bg-ccf-surface border-border/60 p-6 md:p-8 flex flex-col items-center text-center space-y-5 hover:border-ccf-gold/40 transition-colors shadow-sm"
                  >
                    {/* Primary visual element: 120-150px photo / initials avatar */}
                    <MemberAvatar
                      name={member.name}
                      initials={member.initials}
                      photoObjectKey={member.photoObjectKey}
                      sizeClassName="h-28 w-28 md:h-36 md:w-36"
                      textClassName="text-3xl md:text-4xl"
                    />

                    <CardHeader className="p-0 space-y-1.5 w-full">
                      <CardTitle className="text-lg md:text-xl font-semibold text-ccf-offwhite">
                        {member.name}
                      </CardTitle>
                      <CardDescription className="type-metadata text-xs md:text-sm text-ccf-gold font-medium pt-0.5">
                        {member.designation}
                      </CardDescription>
                    </CardHeader>

                    <div className="pt-2 w-full flex justify-center border-t border-border/20">
                      <Badge variant="outline" className="text-xs text-ccf-muted border-border/50">
                        {member.department}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
