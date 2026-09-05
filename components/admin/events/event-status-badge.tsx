import React from "react";
import { Badge } from "@/components/ui/badge";
import { EventStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface EventStatusBadgeProps {
  status: EventStatus | string;
  className?: string;
}

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  switch (status) {
    case EventStatus.PUBLISHED:
    case "PUBLISHED":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold px-2.5 py-0.5 text-xs tracking-wider uppercase inline-flex items-center gap-1.5",
            className
          )}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Published</span>
        </Badge>
      );

    case EventStatus.DRAFT:
    case "DRAFT":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-slate-600/60 bg-slate-800/40 text-slate-300 font-medium px-2.5 py-0.5 text-xs tracking-wider uppercase inline-flex items-center gap-1.5",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          <span>Draft</span>
        </Badge>
      );

    case EventStatus.CLOSED:
    case "CLOSED":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-amber-500/40 bg-amber-500/10 text-amber-400 font-medium px-2.5 py-0.5 text-xs tracking-wider uppercase inline-flex items-center gap-1.5",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          <span>Closed</span>
        </Badge>
      );

    case EventStatus.ARCHIVED:
    case "ARCHIVED":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-border/60 bg-ccf-surface-sunken text-ccf-muted font-medium px-2.5 py-0.5 text-xs tracking-wider uppercase inline-flex items-center gap-1.5",
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-ccf-muted" aria-hidden="true" />
          <span>Archived</span>
        </Badge>
      );

    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-border/60 bg-ccf-surface text-ccf-offwhite px-2.5 py-0.5 text-xs",
            className
          )}
        >
          {status}
        </Badge>
      );
  }
}
