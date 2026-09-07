import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Shield, CheckCircle2, Server, Database, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AdminShell,
  AdminPageHeader,
  AdminModuleCard,
  formatAdminRole,
} from "@/components/admin";
import {
  DashboardMetricsGrid,
  DashboardAlertBanner,
  DashboardRecentActivity,
  DashboardQuickActions,
  DashboardErrorState,
} from "@/components/admin/dashboard";
import { getAdminDashboardData } from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard — Crescent Club of Finance",
  description:
    "Internal administration and operations platform for Crescent Club of Finance.",
};

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  if (
    !admin ||
    (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN)
  ) {
    redirect("/admin/auth/login?callbackUrl=/admin/dashboard");
    return null;
  }

  const roleLabel = formatAdminRole(admin.role);
  const adminName = admin.name || "Administrator";
  const adminEmail = admin.email || "";

  // Authoritative server-side load of live operational dashboard data
  const dashboardResult = await getAdminDashboardData();

  return (
    <AdminShell user={admin}>
      {/* 1. Page Header */}
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Central administrative overview and operational health for Crescent Club of Finance."
      >
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold px-3 py-1 text-xs tracking-wider uppercase inline-flex items-center gap-2"
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Active Session</span>
        </Badge>
      </AdminPageHeader>

      {/* 2. Welcome & Administrator Identity Block */}
      <Card className="bg-ccf-surface border-border/60 p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="type-eyebrow text-xs text-ccf-gold uppercase tracking-wider font-semibold">
              Authenticated Session
            </p>
            <h2 className="text-xl font-bold text-ccf-offwhite tracking-tight">
              Welcome, {adminName}
            </h2>
            <p className="text-xs text-ccf-muted">
              Signed in as <span className="font-mono text-ccf-offwhite">{adminEmail}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated px-3 py-1.5 text-right">
              <span className="text-[10px] text-ccf-muted uppercase tracking-wider block font-semibold">
                Assigned Role
              </span>
              <span className="text-xs font-bold text-ccf-gold inline-flex items-center gap-1">
                <Shield className="h-3 w-3" aria-hidden="true" />
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Operational Action Shortcuts */}
      <DashboardQuickActions />

      {/* 4. Operational Alerts or Fail-Closed State */}
      {!dashboardResult.success ? (
        <DashboardErrorState error={dashboardResult.error} />
      ) : (
        <>
          {/* Actionable Alerts (e.g. pending payments) */}
          <DashboardAlertBanner alerts={dashboardResult.alerts} />

          {/* Aggregated Operational Metrics */}
          <DashboardMetricsGrid metrics={dashboardResult.metrics} />

          {/* Recent Audit & Registration Activity */}
          <DashboardRecentActivity
            activities={dashboardResult.recentActivities}
            recentRegistrations={dashboardResult.recentRegistrations}
          />
        </>
      )}

      {/* 5. Canonical Operational Modules Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ccf-offwhite tracking-tight">
            Operational Modules
          </h2>
          <span className="text-xs text-ccf-muted">
            5 Core Modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AdminModuleCard
            title="Events"
            description="Configure upcoming and past symposiums, workshops, and student initiatives."
            href="/admin/events"
            iconName="Calendar"
          />
          <AdminModuleCard
            title="Registrations"
            description="Review participant records, team allocations, and event capacity allocations."
            href="/admin/registrations"
            iconName="ClipboardCheck"
          />
          <AdminModuleCard
            title="Recruitment"
            description="Oversee student recruitment applications across CCF operational departments."
            href="/admin/recruitment"
            iconName="UserPlus"
          />
          <AdminModuleCard
            title="Members"
            description="Manage student executive profiles and department directory assignments."
            href="/admin/members"
            iconName="Users"
          />
          <AdminModuleCard
            title="Media"
            description="Manage photo gallery assets and production media delivery."
            href="/admin/media"
            iconName="Image"
          />
        </div>
      </div>

      {/* 6. Platform Architecture Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <Card className="lg:col-span-6 bg-ccf-surface border-border/60 p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <CardHeader className="p-0 space-y-1">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Server className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Platform Architecture</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Core technical components powering the CCF administration platform.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-3 pt-2">
            <div className="flex items-center justify-between py-2 border-b border-border/40 text-xs">
              <span className="text-ccf-muted">Platform Architecture</span>
              <span className="font-semibold text-ccf-offwhite">Next.js 16 + React 19</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/40 text-xs">
              <span className="text-ccf-muted">Authentication Engine</span>
              <span className="font-semibold text-ccf-offwhite inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                <span>Auth.js (Magic Link + TOTP)</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/40 text-xs">
              <span className="text-ccf-muted">Database Layer</span>
              <span className="font-semibold text-ccf-offwhite inline-flex items-center gap-1.5">
                <Database className="h-3 w-3 text-ccf-gold" aria-hidden="true" />
                <span>PostgreSQL + Prisma ORM</span>
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-ccf-muted">Access Scope</span>
              <span className="font-semibold text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Full Admin Access (MVP)</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 bg-ccf-surface border-border/60 p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <CardHeader className="p-0 space-y-1">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Operational Systems Status</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Live status across completed CCF operational subsystems.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-3 pt-2">
            <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-2 text-xs">
              <p className="font-semibold text-ccf-offwhite">
                Live Subsystems Verified
              </p>
              <p className="text-ccf-muted leading-relaxed">
                Events, Dynamic Form Engine, Individual and Team Registrations, Manual UPI Payment Tracking, and Student Recruitment are fully connected to transactional PostgreSQL workflows with audit logging.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
