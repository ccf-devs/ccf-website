import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardErrorStateProps {
  error?: string;
  className?: string;
}

export function DashboardErrorState({
  error = "Live operational data is temporarily unavailable.",
  className = "",
}: DashboardErrorStateProps) {
  return (
    <Card
      role="alert"
      className={`bg-ccf-surface border-amber-500/30 p-6 sm:p-8 space-y-6 shadow-md ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <CardTitle className="text-lg font-bold text-ccf-offwhite tracking-tight">
            Operational Data Temporarily Unavailable
          </CardTitle>
          <CardDescription className="text-sm text-ccf-muted leading-relaxed">
            {error} The platform failed closed safely to protect data integrity and avoid displaying inaccurate or unverified metrics.
          </CardDescription>
        </div>
      </div>

      <div className="rounded-lg border border-border/40 bg-ccf-surface-sunken p-4 text-xs space-y-2">
        <p className="font-semibold text-ccf-offwhite">
          System Integrity Notice
        </p>
        <p className="text-ccf-muted leading-relaxed">
          Zero metrics or fabricated numbers are not rendered when database connectivity is offline. Administrative modules remain accessible through direct module routes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          asChild
          variant="gold"
          size="sm"
          className="text-xs font-semibold px-4 h-9"
        >
          <Link href="/admin/dashboard">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Retry Connection</span>
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="text-xs text-ccf-muted hover:text-ccf-offwhite px-4 h-9"
        >
          <Link href="/admin/events">
            <span>Go to Events Console</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
