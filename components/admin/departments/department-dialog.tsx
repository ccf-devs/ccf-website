"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Loader2, AlertTriangle, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface DepartmentItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  _count?: {
    members: number;
    recruitmentApplications: number;
  };
}

interface DepartmentDialogProps {
  department: DepartmentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: DepartmentItem) => void;
}

export function DepartmentDialog({
  department,
  isOpen,
  onClose,
  onSaved,
}: DepartmentDialogProps) {
  if (!isOpen) return null;

  return (
    <DepartmentDialogInner
      key={department ? department.id : "new-dept"}
      department={department}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function DepartmentDialogInner({
  department,
  onClose,
  onSaved,
}: {
  department: DepartmentItem | null;
  onClose: () => void;
  onSaved: (updated: DepartmentItem) => void;
}) {
  const isEditing = !!department;
  const [name, setName] = useState(department?.name || "");
  const [slug, setSlug] = useState(department?.slug || "");
  const [description, setDescription] = useState(department?.description || "");
  const [active, setActive] = useState(department?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const method = isEditing ? "PATCH" : "POST";
      const url = isEditing ? `/api/admin/departments/${department.id}` : "/api/admin/departments";

      const payload = isEditing ? {
        description: description.trim() || null,
        active
      } : {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        active
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update department.");
      }

      onSaved(data.department);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update department.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dept-dialog-title"
    >
      <Card className="bg-ccf-surface border-border/60 w-full max-w-lg shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 id="dept-dialog-title" className="text-base font-semibold text-ccf-offwhite">
                {isEditing ? "Edit Department" : "Add Department"}
              </h3>
              {isEditing && <p className="text-xs text-ccf-muted">{department.name}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEditing ? (
            <div className="grid grid-cols-2 gap-3 bg-ccf-surface-sunken p-3.5 rounded-lg border border-border/40">
              <div>
                <span className="text-[10px] text-ccf-muted uppercase font-semibold block">Department Name</span>
                <span className="text-xs font-bold text-ccf-offwhite">{department.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-ccf-muted uppercase font-semibold block">Canonical Slug</span>
                <span className="font-mono text-xs text-ccf-gold">{department.slug}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name" className="text-xs font-semibold text-ccf-offwhite">Department Name</Label>
                <Input id="dept-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Media" className="bg-ccf-surface-sunken border-border/60 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept-slug" className="text-xs font-semibold text-ccf-offwhite">Slug</Label>
                <Input id="dept-slug" required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. media" className="bg-ccf-surface-sunken border-border/60 text-xs font-mono" />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="dept-description" className="text-xs font-semibold text-ccf-offwhite">
              Description
            </Label>
            <textarea
              id="dept-description"
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational scope and description of this department..."
              className="w-full rounded-md border border-border/60 bg-ccf-surface-sunken p-3 text-xs text-ccf-offwhite placeholder:text-ccf-muted/60 focus:border-ccf-gold focus:outline-none"
            />
            <p className="text-[11px] text-ccf-muted text-right">
              {description.length} / 1000 characters
            </p>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-ccf-surface-sunken p-4">
            <div className="space-y-0.5">
              <Label htmlFor="dept-active" className="text-xs font-semibold text-ccf-offwhite cursor-pointer">
                Department Active Status
              </Label>
              <p className="text-[11px] text-ccf-muted">
                Controls whether new members can be assigned and whether recruitment applications are accepted.
              </p>
            </div>
            <input
              id="dept-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-border/60 text-ccf-gold focus:ring-ccf-gold cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs border-border/60 text-ccf-muted hover:text-ccf-offwhite"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs px-5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
