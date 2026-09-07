import React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardAlert } from "@/lib/admin/types";

interface DashboardAlertBannerProps {
  alerts: DashboardAlert[];
  className?: string;
}

export function DashboardAlertBanner({
  alerts,
  className = "",
}: DashboardAlertBannerProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`} aria-label="Operational Alerts">
      {alerts.map((alert) => {
        const isWarning = alert.severity === "warning";
        const isInfo = alert.severity === "info";
        const isSuccess = alert.severity === "success";

        return (
          <div
            key={alert.id}
            role="alert"
            className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors ${
              isWarning
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : isInfo
                ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                : isSuccess
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-border/60 bg-ccf-surface text-ccf-offwhite"
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="shrink-0 mt-0.5 sm:mt-0">
                {isWarning ? (
                  <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden="true" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-sky-400" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold tracking-tight text-ccf-offwhite">
                  {alert.title}
                </h3>
                <p className="text-xs text-ccf-muted leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>

            {alert.actionUrl && alert.actionLabel && (
              <div className="shrink-0 pl-8 sm:pl-0">
                <Button
                  asChild
                  size="sm"
                  variant={isWarning ? "gold" : "outline"}
                  className="h-8 text-xs font-semibold px-3 inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Link href={alert.actionUrl}>
                    <span>{alert.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
