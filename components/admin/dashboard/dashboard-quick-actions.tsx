import React from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, UserPlus, Users, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardQuickActionsProps {
  className?: string;
}

export function DashboardQuickActions({
  className = "",
}: DashboardQuickActionsProps) {
  const actions = [
    {
      label: "Create Event",
      href: "/admin/events/new",
      icon: Plus,
      variant: "gold" as const,
      description: "Launch a new event form",
    },
    {
      label: "Registrations",
      href: "/admin/registrations",
      icon: ClipboardCheck,
      variant: "outline" as const,
      description: "Review participant rosters",
    },
    {
      label: "Recruitment",
      href: "/admin/recruitment",
      icon: UserPlus,
      variant: "outline" as const,
      description: "Manage student applications",
    },
    {
      label: "Members",
      href: "/admin/members",
      icon: Users,
      variant: "outline" as const,
      description: "Executive directory",
    },
    {
      label: "Media",
      href: "/admin/media",
      icon: ImageIcon,
      variant: "outline" as const,
      description: "Gallery asset library",
    },
  ];

  return (
    <div className={`space-y-2.5 ${className}`} aria-label="Quick Administrative Actions">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ccf-gold">
          Quick Actions
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.variant === "gold";

          return (
            <Button
              key={action.href}
              asChild
              variant={action.variant}
              className={`h-auto py-2.5 px-3 flex flex-col items-center justify-center text-center gap-1.5 rounded-xl border transition-all ${
                isPrimary
                  ? "bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light border-ccf-gold font-semibold shadow-xs"
                  : "bg-ccf-surface border-border/60 text-ccf-offwhite hover:border-ccf-gold/40 hover:bg-ccf-surface-elevated"
              }`}
            >
              <Link href={action.href}>
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium tracking-tight">
                  {action.label}
                </span>
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
