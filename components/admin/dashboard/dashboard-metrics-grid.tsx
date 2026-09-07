import React from "react";
import Link from "next/link";
import {
  Calendar,
  ClipboardCheck,
  CreditCard,
  UserPlus,
  Users,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardMetrics } from "@/lib/admin/types";

interface DashboardMetricsGridProps {
  metrics: DashboardMetrics;
  className?: string;
}

export function DashboardMetricsGrid({
  metrics,
  className = "",
}: DashboardMetricsGridProps) {
  const { events, registrations, payments, recruitment } = metrics;

  return (
    <div className={`space-y-4 ${className}`} aria-label="System Metrics">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ccf-offwhite tracking-tight">
          Operational Overview
        </h2>
        <span className="text-xs text-ccf-muted">
          Live Database Aggregations
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Events KPI */}
        <Card className="bg-ccf-surface border-border/60 p-5 flex flex-col justify-between shadow-sm hover:border-ccf-gold/30 transition-colors">
          <CardHeader className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="type-caption text-xs font-semibold uppercase tracking-wider text-ccf-gold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Events</span>
              </span>
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono"
              >
                {events.published} Published
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-ccf-offwhite tracking-tight">
              {events.total}
              <span className="text-xs font-normal text-ccf-muted ml-1.5">total</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 pt-4 space-y-2 text-xs border-t border-border/40 mt-4">
            <div className="flex items-center justify-between text-ccf-muted">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-sky-400" />
                <span>Upcoming Events</span>
              </span>
              <span className="font-semibold text-ccf-offwhite font-mono">
                {events.upcoming}
              </span>
            </div>
            <div className="flex items-center justify-between text-ccf-muted">
              <span>Draft Events</span>
              <span className="font-semibold text-ccf-muted/80 font-mono">
                {events.draft}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/admin/events"
                className="text-[11px] font-semibold text-ccf-gold hover:text-ccf-gold-light inline-flex items-center gap-1 group"
              >
                <span>Manage Events</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 2. Registrations & Participation KPI */}
        <Card className="bg-ccf-surface border-border/60 p-5 flex flex-col justify-between shadow-sm hover:border-ccf-gold/30 transition-colors">
          <CardHeader className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="type-caption text-xs font-semibold uppercase tracking-wider text-ccf-gold flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Registrations</span>
              </span>
              <Badge
                variant="outline"
                className="border-sky-500/40 bg-sky-500/10 text-sky-400 text-[10px] font-mono"
              >
                {registrations.active} Active
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-ccf-offwhite tracking-tight">
              {registrations.total}
              <span className="text-xs font-normal text-ccf-muted ml-1.5">records</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 pt-4 space-y-2 text-xs border-t border-border/40 mt-4">
            <div className="flex items-center justify-between text-ccf-muted">
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>Total Participants</span>
              </span>
              <span className="font-semibold text-ccf-offwhite font-mono">
                {registrations.totalParticipants}
              </span>
            </div>
            <div className="flex items-center justify-between text-ccf-muted">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Active Teams</span>
              </span>
              <span className="font-semibold text-ccf-offwhite font-mono">
                {registrations.activeTeams}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/admin/registrations"
                className="text-[11px] font-semibold text-ccf-gold hover:text-ccf-gold-light inline-flex items-center gap-1 group"
              >
                <span>View Registrations</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 3. Payment Operations KPI */}
        <Card
          className={`bg-ccf-surface p-5 flex flex-col justify-between shadow-sm transition-colors ${
            payments.pending > 0
              ? "border-amber-500/40 hover:border-amber-500/60"
              : "border-border/60 hover:border-ccf-gold/30"
          }`}
        >
          <CardHeader className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="type-caption text-xs font-semibold uppercase tracking-wider text-ccf-gold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Payments</span>
              </span>
              {payments.pending > 0 ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] font-mono font-semibold animate-pulse"
                >
                  {payments.pending} Pending
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono"
                >
                  All Verified
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-ccf-offwhite tracking-tight">
              {payments.verified}
              <span className="text-xs font-normal text-ccf-muted ml-1.5">verified</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 pt-4 space-y-2 text-xs border-t border-border/40 mt-4">
            <div className="flex items-center justify-between text-ccf-muted">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Pending Verification</span>
              </span>
              <span
                className={`font-semibold font-mono ${
                  payments.pending > 0 ? "text-amber-400" : "text-ccf-muted"
                }`}
              >
                {payments.pending}
              </span>
            </div>
            <div className="flex items-center justify-between text-ccf-muted">
              <span>Rejected Payments</span>
              <span className="font-semibold text-rose-400 font-mono">
                {payments.rejected}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/admin/registrations"
                className="text-[11px] font-semibold text-ccf-gold hover:text-ccf-gold-light inline-flex items-center gap-1 group"
              >
                <span>Verify Payments</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 4. Recruitment Intake KPI */}
        <Card className="bg-ccf-surface border-border/60 p-5 flex flex-col justify-between shadow-sm hover:border-ccf-gold/30 transition-colors">
          <CardHeader className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="type-caption text-xs font-semibold uppercase tracking-wider text-ccf-gold flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Recruitment</span>
              </span>
              <Badge
                variant="outline"
                className={
                  recruitment.isOpen
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold"
                    : "border-zinc-600 bg-zinc-800 text-zinc-400 text-[10px] font-semibold"
                }
              >
                {recruitment.isOpen ? "PORTAL OPEN" : "PORTAL CLOSED"}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-ccf-offwhite tracking-tight">
              {recruitment.total}
              <span className="text-xs font-normal text-ccf-muted ml-1.5">applications</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 pt-4 space-y-2 text-xs border-t border-border/40 mt-4">
            <div className="flex items-center justify-between text-ccf-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Selected Applicants</span>
              </span>
              <span className="font-semibold text-emerald-400 font-mono">
                {recruitment.selected}
              </span>
            </div>
            <div className="flex items-center justify-between text-ccf-muted">
              <span>Active Review</span>
              <span className="font-semibold text-sky-400 font-mono">
                {recruitment.active}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/admin/recruitment"
                className="text-[11px] font-semibold text-ccf-gold hover:text-ccf-gold-light inline-flex items-center gap-1 group"
              >
                <span>Recruitment Console</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
