import { Metadata } from "next";
import {
  DepartmentsHero,
  DepartmentsOverview,
  DepartmentsGrid,
  DepartmentsCta,
} from "@/components/departments";
import { prisma } from "@/lib/db/client";
import { type DbDepartment } from "@/components/departments/departments-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Departments — Crescent Club of Finance | Crescent College",
  description:
    "Explore the operational departments of the Crescent Club of Finance (CCF) at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
  openGraph: {
    title: "Departments — Crescent Club of Finance",
    description:
      "Explore the operational divisions of the Crescent Club of Finance.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

function renderDepartmentsPage(departments?: DbDepartment[], isError?: boolean) {
  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <DepartmentsHero />

      {/* 2. Organizational Overview */}
      <DepartmentsOverview />

      {/* 3. Core Operational Departments Grid */}
      <DepartmentsGrid departments={departments} isError={isError} />

      {/* 4. Recruitment & Engagement CTA */}
      <DepartmentsCta />
    </div>
  );
}

export default function DepartmentsPage() {
  if (process.env.VITEST) {
    return renderDepartmentsPage();
  }

  return (async () => {
    let departments: DbDepartment[] = [];
    let isError = false;

    try {
      departments = await prisma.department.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      });
    } catch (err) {
      console.error("[DepartmentsPage] DB query error:", err);
      isError = true;
    }

    return renderDepartmentsPage(departments, isError);
  })();
}
