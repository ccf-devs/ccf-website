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
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

interface AdminModuleCardProps {
  title: string;
  description: string;
  href: string;
  iconName: AdminNavItem["iconName"];
  badge?: string;
  className?: string;
}

export function AdminModuleCard({
  title,
  description,
  href,
  iconName,
  badge = "Module Foundation",
  className = "",
}: AdminModuleCardProps) {
  const Icon = ICON_MAP[iconName] || LayoutDashboard;

  return (
    <Link
      href={href}
      className={`group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl ${className}`}
    >
      <Card
        hoverable
        className="h-full bg-ccf-surface border-border/60 p-6 flex flex-col justify-between space-y-6 shadow-sm group-hover:border-ccf-gold/50 transition-colors"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold shadow-xs group-hover:scale-105 transition-transform">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <Badge
              variant="outline"
              className="text-[11px] font-medium border-border/50 text-ccf-muted tracking-wide"
            >
              {badge}
            </Badge>
          </div>

          <CardHeader className="p-0 space-y-1.5">
            <CardTitle className="text-lg font-semibold text-ccf-offwhite group-hover:text-ccf-gold-light transition-colors">
              {title}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm text-ccf-muted leading-relaxed">
              {description}
            </CardDescription>
          </CardHeader>
        </div>

        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-ccf-gold">
          <span>Open Module</span>
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </Card>
    </Link>
  );
}
