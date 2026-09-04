import { CCF_EYEBROW } from "@/components/site/navigation-data";
import { CCF_DEPARTMENTS } from "@/lib/data/departments";

export type RecruitmentStatus = "OPEN" | "CLOSED";

/**
 * Current recruitment status.
 * Architected to support future administrative / backend toggling.
 */
export const RECRUITMENT_STATUS: RecruitmentStatus = "OPEN";

export interface RecruitmentHeroData {
  eyebrow: string;
  title: string;
  subtitle: string;
  statusLabel: string;
}

export interface RecruitmentEligibilityItem {
  id: string;
  title: string;
  description: string;
  iconName: "GraduationCap" | "BookOpen" | "Calendar" | "CheckCircle2";
}

export interface RecruitmentRequirementField {
  id: string;
  label: string;
  description: string;
}

export interface RecruitmentProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface RecruitmentCtaData {
  eyebrow: string;
  heading: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
  closedHeading: string;
  closedDescription: string;
}

export const RECRUITMENT_HERO: RecruitmentHeroData = {
  eyebrow: CCF_EYEBROW,
  title: "Join Crescent Club of Finance",
  subtitle:
    "Recruitment is open to eligible Crescent students across all academic departments and year levels.",
  statusLabel: "Recruitment Open",
};

export const RECRUITMENT_ELIGIBILITY = {
  eyebrow: "Eligibility",
  heading: "Who Can Apply",
  description:
    "CCF recruitment is open to eligible students across the Crescent Institute campus community.",
  ruleNotice: "Applicants may apply for ONE department per application.",
  items: [
    {
      id: "crescent-students",
      title: "Crescent Students Only",
      description:
        "Applicants must be enrolled students at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
      iconName: "GraduationCap",
    },
    {
      id: "any-department",
      title: "Academic Departments",
      description: "Open to students from any academic department.",
      iconName: "BookOpen",
    },
    {
      id: "any-year",
      title: "Year of Study",
      description:
        "Students from any year of study are eligible to submit an application.",
      iconName: "Calendar",
    },
    {
      id: "ug-pg",
      title: "Study Programs",
      description:
        "Open to both undergraduate (UG) and postgraduate (PG) students as applicable.",
      iconName: "CheckCircle2",
    },
  ] as const satisfies readonly RecruitmentEligibilityItem[],
} as const;

export const RECRUITMENT_DEPARTMENTS = {
  eyebrow: "Teams",
  heading: "CCF Departments",
  description:
    "Explore the five departments of Crescent Club of Finance. Applicants may apply for ONE department per application.",
  singleDepartmentNotice:
    "Important: Applicants must choose one desired department for their application.",
  departments: CCF_DEPARTMENTS,
} as const;

export const RECRUITMENT_REQUIREMENTS = {
  eyebrow: "Preparation",
  heading: "What You Will Need",
  description:
    "The application will collect the details listed above. Prepare these items in advance.",
  notice: "The application will collect the details listed above.",
  fields: [
    {
      id: "req-name",
      label: "Full Name",
      description: "Official student name as registered at Crescent Institute.",
    },
    {
      id: "req-rrn",
      label: "RRN",
      description: "Your Crescent RRN.",
    },
    {
      id: "req-dept",
      label: "Desired CCF Department",
      description:
        "Selection of one operational department from the five official CCF teams.",
    },
    {
      id: "req-academic-dept",
      label: "Current Academic Department",
      description: "Your enrolled academic department at Crescent Institute.",
    },
    {
      id: "req-year",
      label: "Year of Study",
      description: "Your current academic year of study.",
    },
    {
      id: "req-whatsapp",
      label: "WhatsApp-Enabled Phone Number",
      description: "A WhatsApp-enabled phone number.",
    },
  ] as const satisfies readonly RecruitmentRequirementField[],
} as const;

export const RECRUITMENT_PROCESS = {
  eyebrow: "Process",
  heading: "Application Flow",
  description:
    "The high-level recruitment process for eligible students applying to Crescent Club of Finance.",
  steps: [
    {
      step: "01",
      title: "Check Eligibility",
      description:
        "Confirm enrollment at Crescent Institute across any academic department or year level.",
    },
    {
      step: "02",
      title: "Choose a Department",
      description:
        "Review the five CCF departments and select the single department matching your interest.",
    },
    {
      step: "03",
      title: "Submit Your Application",
      description:
        "Prepare the required student and academic details for application submission.",
    },
    {
      step: "04",
      title: "Await Administrative Review",
      description:
        "Submitted applications undergo administrative review.",
    },
  ] as const satisfies readonly RecruitmentProcessStep[],
} as const;

export const RECRUITMENT_CTA: RecruitmentCtaData = {
  eyebrow: CCF_EYEBROW,
  heading: "Ready to Apply?",
  description:
    "Application submission will be connected to the CCF recruitment workflow in the next implementation stage.",
  primaryActionLabel: "Review Requirements",
  primaryActionHref: "#requirements",
  secondaryActionLabel: "Explore Departments",
  secondaryActionHref: "/departments",
  closedHeading: "Recruitment Closed",
  closedDescription:
    "Recruitment for the Crescent Club of Finance is currently closed. Follow our official channels for future recruitment notices.",
};
