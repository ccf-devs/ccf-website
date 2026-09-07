import React from "react";
import Link from "next/link";
import {
  Activity,
  ClipboardList,
  ArrowRight,
  Shield,
  CreditCard,
  UserPlus,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecentActivityItem, RecentRegistrationItem } from "@/lib/admin/types";

interface DashboardRecentActivityProps {
  activities: RecentActivityItem[];
  recentRegistrations: RecentRegistrationItem[];
  className?: string;
}

function formatIST(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getActivityBadge(entityType: string) {
  switch (entityType.toUpperCase()) {
    case "EVENT":
    case "EVENT_FIELD":
    case "FORM_VERSION":
      return (
        <Badge
          variant="outline"
          className="border-sky-500/40 bg-sky-500/10 text-sky-400 font-mono text-[10px]"
        >
          EVENT
        </Badge>
      );
    case "PAYMENT":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-[10px]"
        >
          PAYMENT
        </Badge>
      );
    case "RECRUITMENT":
    case "RECRUITMENT_APPLICATION":
      return (
        <Badge
          variant="outline"
          className="border-ccf-gold/40 bg-ccf-gold/10 text-ccf-gold font-mono text-[10px]"
        >
          RECRUITMENT
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="border-zinc-600 bg-zinc-800 text-zinc-400 font-mono text-[10px]"
        >
          SYSTEM
        </Badge>
      );
  }
}

export function DashboardRecentActivity({
  activities,
  recentRegistrations,
  className = "",
}: DashboardRecentActivityProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${className}`}>
      {/* 1. Recent Administrative Actions (8 cols) */}
      <Card className="lg:col-span-7 bg-ccf-surface border-border/60 p-6 flex flex-col justify-between shadow-sm space-y-4">
        <CardHeader className="p-0 space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Activity className="w-4 h-4 text-ccf-gold" aria-hidden="true" />
              <span>Recent Administrative Activity</span>
            </CardTitle>
            <span className="text-xs text-ccf-muted font-mono">Audit Log</span>
          </div>
          <CardDescription className="text-xs text-ccf-muted">
            Auditable system actions and status changes performed across the platform.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 flex-1">
          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-ccf-muted">
              No recent administrative actions recorded.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {getActivityBadge(item.entityType)}
                      <span className="font-semibold text-ccf-offwhite truncate">
                        {item.summary}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-ccf-muted text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3 h-3 text-ccf-gold" />
                        <span>{item.actorName}</span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[11px] text-ccf-muted/80 font-mono whitespace-nowrap">
                      {formatIST(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Recent Event Registrations (5 cols) */}
      <Card className="lg:col-span-5 bg-ccf-surface border-border/60 p-6 flex flex-col justify-between shadow-sm space-y-4">
        <CardHeader className="p-0 space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-ccf-gold" aria-hidden="true" />
              <span>Recent Registrations</span>
            </CardTitle>
            <Link
              href="/admin/registrations"
              className="text-xs font-semibold text-ccf-gold hover:text-ccf-gold-light inline-flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <CardDescription className="text-xs text-ccf-muted">
            Latest student and team registrations received.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 flex-1">
          {recentRegistrations.length === 0 ? (
            <div className="py-8 text-center text-xs text-ccf-muted">
              No event registrations submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="py-3 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-semibold text-ccf-offwhite truncate">
                      {reg.eventName}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-ccf-muted">
                      <span className="font-mono text-ccf-gold">
                        {reg.registrationCode}
                      </span>
                      <span>•</span>
                      <span>{reg.registrationType}</span>
                      <span>•</span>
                      <span
                        className={
                          reg.participantType === "CRESCENT"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {reg.participantType}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    <Badge
                      variant="outline"
                      className={
                        reg.status === "ACTIVE"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono"
                          : "border-zinc-600 bg-zinc-800 text-zinc-400 text-[10px] font-mono"
                      }
                    >
                      {reg.status}
                    </Badge>
                    <div className="text-[10px] text-ccf-muted/70 font-mono">
                      {formatIST(reg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
