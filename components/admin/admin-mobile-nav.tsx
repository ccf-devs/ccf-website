"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "./admin-sidebar";
import { AdminUserProps } from "./admin-user-menu";

interface AdminMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user?: AdminUserProps | null;
}

export function AdminMobileNav({
  isOpen,
  onClose,
  user,
}: AdminMobileNavProps) {
  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
      className="fixed inset-0 z-50 lg:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-ccf-navy shadow-2xl flex flex-col z-10 border-r border-border/40 animate-in slide-in-from-left duration-200">
        <div className="p-3 flex justify-end border-b border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="h-8 w-8 p-0 text-ccf-muted hover:text-ccf-offwhite"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AdminSidebar user={user} onNavigate={onClose} className="border-r-0 w-full" />
        </div>
      </div>
    </div>
  );
}
