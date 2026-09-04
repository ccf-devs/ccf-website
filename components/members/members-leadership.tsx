import React from "react";
import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { CCF_ADMIN_BOARD_LEADERS } from "@/lib/data/members";
import { MemberAvatar } from "./member-avatar";

export function MembersLeadership() {
  return (
    <section className="py-16 md:py-24 bg-ccf-navy-secondary/30 border-b border-border/30">
      <Container className="space-y-12">
        {/* Section Header */}
        <FadeIn direction="up">
          <SectionHeading
            eyebrow="CRESCENT CLUB OF FINANCE"
            title="Admin Board"
            description="Meet the executive leadership directing CCF activities and operations."
          />
        </FadeIn>

        {/* Leadership Grid */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {CCF_ADMIN_BOARD_LEADERS.map((leader) => (
            <StaggerItem key={leader.id}>
              <Card
                hoverable
                className="h-full bg-ccf-surface border-border/60 p-8 md:p-10 flex flex-col items-center text-center space-y-5"
              >
                {/* Photo / Avatar as primary visual element (120-150px) */}
                <MemberAvatar
                  name={leader.name}
                  initials={leader.initials}
                  photoObjectKey={leader.photoObjectKey}
                  sizeClassName="h-28 w-28 md:h-36 md:w-36"
                  textClassName="text-3xl md:text-4xl"
                />

                <CardHeader className="p-0 space-y-2">
                  <CardTitle className="text-xl md:text-2xl font-semibold text-ccf-offwhite">
                    {leader.name}
                  </CardTitle>
                  <CardDescription className="type-metadata text-ccf-gold flex items-center justify-center gap-1.5 pt-1 font-medium">
                    <ShieldCheck className="h-4 w-4 text-ccf-gold shrink-0" aria-hidden="true" />
                    <span>{leader.designation}</span>
                  </CardDescription>
                </CardHeader>

                <div className="pt-2">
                  <Badge variant="outline" className="text-xs text-ccf-muted border-border/50">
                    {leader.department}
                  </Badge>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
