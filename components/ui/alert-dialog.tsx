"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AlertDialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | null>(null);
const emptySubscribe = () => () => {};

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const dialogContent = (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
        {children}
      </div>
    </AlertDialogContext.Provider>
  );

  // Portal into document.body when mounted in a browser environment to escape any
  // parent containing block (e.g. headers with backdrop-filter/blur)
  if (typeof document !== "undefined" && isClient) {
    return createPortal(dialogContent, document.body);
  }

  // Fallback for SSR / static markup generation in test environments
  return dialogContent;
}

export function AlertDialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className={cn(
        "w-full max-w-md rounded-xl border border-border/80 bg-ccf-surface p-6 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AlertDialogHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-2 text-left", className)}>{children}</div>;
}

export function AlertDialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className={cn("text-base font-semibold text-ccf-offwhite", className)}>
      {children}
    </h3>
  );
}

export function AlertDialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-xs text-ccf-muted leading-relaxed", className)}>
      {children}
    </p>
  );
}

export function AlertDialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-3 pt-3 border-t border-border/40", className)}>
      {children}
    </div>
  );
}

export function AlertDialogCancel({
  className,
  children,
  onClick,
  disabled,
}: {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ctx = useContext(AlertDialogContext);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn("border-border/60 text-ccf-muted hover:text-ccf-offwhite", className)}
      onClick={() => {
        onClick?.();
        ctx?.onOpenChange(false);
      }}
    >
      {children || "Cancel"}
    </Button>
  );
}

export function AlertDialogAction({
  className,
  children,
  onClick,
  disabled,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ctx = useContext(AlertDialogContext);
  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
      className={cn("bg-red-600 hover:bg-red-700 text-white font-semibold", className)}
      onClick={() => {
        onClick?.();
        ctx?.onOpenChange(false);
      }}
    >
      {children}
    </Button>
  );
}
