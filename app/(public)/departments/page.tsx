import { Metadata } from "next";
import {
  DepartmentsHero,
  DepartmentsOverview,
  DepartmentsGrid,
  DepartmentsCta,
} from "@/components/departments";

export const metadata: Metadata = {
  title: "Departments — Crescent Club of Finance | Crescent College",
  description:
    "Explore the five operational departments of the Crescent Club of Finance (CCF) at B.S. Abdur Rahman Crescent Institute of Science and Technology: Finance Management, IT & Media, Marketing & PR, Project Department, and Event Management.",
  openGraph: {
    title: "Departments — Crescent Club of Finance",
    description:
      "Explore the operational divisions of the Crescent Club of Finance: Finance Management, IT & Media, Marketing & PR, Project Department, and Event Management.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

export default function DepartmentsPage() {
  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <DepartmentsHero />

      {/* 2. Organizational Overview */}
      <DepartmentsOverview />

      {/* 3. Core Operational Departments Grid */}
      <DepartmentsGrid />

      {/* 4. Recruitment & Engagement CTA */}
      <DepartmentsCta />
    </div>
  );
}
