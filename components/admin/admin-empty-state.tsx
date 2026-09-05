import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Layers,
  ClipboardCheck,
  UserPlus,
  Image,
  Bell,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminNavItem } from "./admin-nav";

const ICON_MAP: Record<AdminNavItem["iconName"], React.ElementType> = {
  LayoutDashboard,
  Calendar,
  Users,
  Layers,
  ClipboardCheck,
  UserPlus,
  Image,
  Bell,
  Settings,
};

interface AdminEmptyStateProps {
  moduleTitle: string;
  description?: string;
  iconName?: AdminNavItem["iconName"];
  className?: string;
}

export function AdminEmptyState({
  moduleTitle,
  description,
  iconName = "Layers",
  className = "",
}: AdminEmptyStateProps) {
  const Icon = ICON_MAP[iconName] || Layers;
  const defaultDesc = `The ${moduleTitle} management interface will be connected in a later implementation stage.`;

  return (
    <Card
      className={`relative overflow-hidden bg-ccf-surface border-border/60 p-8 md:p-12 text-center shadow-sm max-w-2xl mx-auto space-y-6 ${className}`}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold shadow-sm">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <Badge
          variant="outline"
          className="border-ccf-gold/30 text-ccf-gold bg-ccf-gold/10 font-semibold px-3 py-1 text-xs tracking-wider uppercase"
        >
          Module Foundation
        </Badge>

        <div className="space-y-2">
          <h2 className="type-h3 text-xl md:text-2xl font-semibold text-ccf-offwhite">
            {moduleTitle}
          </h2>
          <p className="type-body text-sm text-ccf-muted leading-relaxed max-w-md mx-auto">
            {description || defaultDesc}
          </p>
        </div>
      </div>

      <div className="pt-2 flex justify-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Return to Dashboard</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
}
