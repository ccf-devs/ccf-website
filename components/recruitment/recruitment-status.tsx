import React from "react";
import { Badge } from "@/components/ui/badge";
import { RECRUITMENT_STATUS, RecruitmentStatus } from "@/lib/data/recruitment";

interface RecruitmentStatusBadgeProps {
  status?: RecruitmentStatus;
  className?: string;
}

export function RecruitmentStatusBadge({
  status = RECRUITMENT_STATUS,
  className = "",
}: RecruitmentStatusBadgeProps) {
  const isOpen = status === "OPEN";

  return (
    <div
      role="status"
      aria-label={`Recruitment status: ${isOpen ? "Open" : "Closed"}`}
      className={`inline-flex items-center ${className}`}
    >
      {isOpen ? (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold px-3 py-1 text-xs tracking-wider uppercase inline-flex items-center gap-2"
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>RECRUITMENT OPEN</span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-border/60 bg-ccf-surface-sunken text-ccf-muted font-semibold px-3 py-1 text-xs tracking-wider uppercase inline-flex items-center gap-2"
        >
          <span className="h-2 w-2 rounded-full bg-ccf-muted/60" aria-hidden="true" />
          <span>RECRUITMENT CLOSED</span>
        </Badge>
      )}
    </div>
  );
}
