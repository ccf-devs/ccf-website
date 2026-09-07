import { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { getRecruitmentSettings } from "@/lib/recruitment/service";
import {
  RecruitmentHero,
  RecruitmentEligibility,
  RecruitmentDepartments,
  RecruitmentRequirements,
  RecruitmentProcess,
  RecruitmentCta,
  RecruitmentForm,
  type DepartmentOption,
} from "@/components/recruitment";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Us — Crescent Club of Finance | Crescent College",
  description:
    "Recruitment is open for the Crescent Club of Finance at B.S. Abdur Rahman Crescent Institute of Science and Technology. Explore eligibility, departments, and application requirements.",
  openGraph: {
    title: "Join Us — Crescent Club of Finance",
    description:
      "Recruitment is open for the Crescent Club of Finance at B.S. Abdur Rahman Crescent Institute of Science and Technology. Explore eligibility, departments, and application requirements.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

export default async function JoinUsPage() {
  let isOpen = false;
  let departments: DepartmentOption[] = [];

  try {
    const [settings, deptRecords] = await Promise.all([
      getRecruitmentSettings(),
      prisma.department.findMany({
        where: { active: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
    ]);
    isOpen = settings.isOpen;
    departments = deptRecords;
  } catch (error) {
    console.error("[JoinUsPage] Failed to fetch recruitment data, failing closed:", error);
    isOpen = false;
    departments = [];
  }

  const status = isOpen ? "OPEN" : "CLOSED";

  return (
    <div className="flex flex-col">
      {/* 1. Hero with Recruitment Status & Primary Actions */}
      <RecruitmentHero status={status} />

      {/* 2. Eligibility ("Who Can Apply") */}
      <RecruitmentEligibility />

      {/* 3. Five Canonical CCF Departments */}
      <RecruitmentDepartments />

      {/* 4. Application Section: Form when open, closed notice when closed */}
      {isOpen ? (
        <section
          id="apply"
          className="py-16 md:py-24 bg-ccf-surface-sunken border-t border-b border-border/40 scroll-mt-16"
        >
          <Container className="max-w-2xl">
            <div className="text-center mb-8 space-y-2">
              <span className="type-eyebrow text-ccf-gold">Application</span>
              <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
                Submit Your Application
              </h2>
              <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
                Complete the student and department details below to apply for membership in Crescent Club of Finance.
              </p>
            </div>
            <RecruitmentForm departments={departments} />
          </Container>
        </section>
      ) : (
        <section
          id="closed-notice"
          className="py-16 md:py-24 bg-ccf-surface-sunken border-t border-b border-border/40"
        >
          <Container className="max-w-xl">
            <Card className="p-8 text-center bg-ccf-surface border-border/60 space-y-4 shadow-sm">
              <div
                className="w-12 h-12 rounded-full bg-ccf-gold/10 text-ccf-gold flex items-center justify-center mx-auto"
                aria-hidden="true"
              >
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="type-h3 text-xl font-bold text-ccf-offwhite tracking-tight">
                Recruitment Currently Closed
              </h3>
              <p className="type-body text-sm text-ccf-muted leading-relaxed">
                Recruitment for the Crescent Club of Finance is currently closed. Applications are not being accepted at this time. Please explore our departments and eligibility criteria below in preparation for our next recruitment cycle.
              </p>
            </Card>
          </Container>
        </section>
      )}

      {/* 5. Required Application Information ("What You Will Need") */}
      <RecruitmentRequirements />

      {/* 6. Intended Application Flow */}
      <RecruitmentProcess />

      {/* 7. Application Preparation CTA */}
      <RecruitmentCta status={status} />
    </div>
  );
}
