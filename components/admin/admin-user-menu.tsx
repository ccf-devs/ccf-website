"use client";

import React, { useState } from "react";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAdminRole } from "./admin-nav";
import { AdminRole } from "@prisma/client";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";

export interface AdminUserProps {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: AdminRole | string | null;
}

interface AdminUserMenuProps {
  user?: AdminUserProps | null;
  compact?: boolean;
  className?: string;
  onOpenLogout?: () => void;
}

export function AdminUserMenu({
  user,
  compact = false,
  className = "",
  onOpenLogout,
}: AdminUserMenuProps) {
  const displayName = user?.name || "Administrator";
  const displayEmail = user?.email || "";
  const roleLabel = formatAdminRole(user?.role);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    if (onOpenLogout) {
      onOpenLogout();
    } else {
      setIsLogoutDialogOpen(true);
    }
  };

  // Compute initials for the avatar badge
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AD";

  if (compact) {
    return (
      <>
        <div className={`flex items-center gap-3 ${className}`}>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ccf-gold/30 bg-ccf-surface-elevated text-xs font-semibold text-ccf-gold"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-ccf-offwhite leading-none">
                {displayName}
              </p>
              <p className="text-[10px] text-ccf-muted mt-0.5 leading-none">
                {roleLabel}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogoutClick}
            aria-label="Log out of admin session"
            className="h-8 px-2.5 text-xs text-ccf-muted hover:text-ccf-offwhite hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            <span>Logout</span>
          </Button>
        </div>
        {!onOpenLogout && (
          <LogoutConfirmDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen} />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={`rounded-xl border border-border/60 bg-ccf-surface p-3.5 space-y-3 ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ccf-gold/30 bg-ccf-surface-elevated text-sm font-semibold text-ccf-gold"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ccf-offwhite truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-ccf-muted truncate">
              {displayEmail}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <Badge
            variant="outline"
            className="border-ccf-gold/30 bg-ccf-gold/10 text-ccf-gold text-[10px] font-semibold tracking-wider px-2 py-0.5"
          >
            <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
            <span>{roleLabel}</span>
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogoutClick}
            aria-label="Log out of admin session"
            className="h-7 px-2 text-xs text-ccf-muted hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
      {!onOpenLogout && (
        <LogoutConfirmDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen} />
      )}
    </>
  );
}

