import { Metadata } from "next";
import {
  RecruitmentHero,
  RecruitmentEligibility,
  RecruitmentDepartments,
  RecruitmentRequirements,
  RecruitmentProcess,
  RecruitmentCta,
} from "@/components/recruitment";

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

export default function JoinUsPage() {
  return (
    <div className="flex flex-col">
      {/* 1. Hero with Recruitment Status & Primary Actions */}
      <RecruitmentHero />

      {/* 2. Eligibility ("Who Can Apply") */}
      <RecruitmentEligibility />

      {/* 3. Five Canonical CCF Departments */}
      <RecruitmentDepartments />

      {/* 4. Required Application Information ("What You Will Need") */}
      <RecruitmentRequirements />

      {/* 5. Intended Application Flow */}
      <RecruitmentProcess />

      {/* 6. Application Preparation CTA */}
      <RecruitmentCta />
    </div>
  );
}
