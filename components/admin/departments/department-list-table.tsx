"use client";

import React, { useState } from "react";
import {
  Layers,
  Users,
  UserPlus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DepartmentDialog, DepartmentItem } from "./department-dialog";

interface DepartmentListTableProps {
  initialDepartments: DepartmentItem[];
}

export function DepartmentListTable({
  initialDepartments,
}: DepartmentListTableProps) {
  const [departments, setDepartments] = useState<DepartmentItem[]>(initialDepartments);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleInitializeCanonical = async () => {
    setInitializing(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/departments/initialize", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize canonical departments.");
      }

      // Refresh department list
      const fetchRes = await fetch("/api/admin/departments");
      const fetchData = await fetchRes.json();
      if (fetchRes.ok && Array.isArray(fetchData.departments)) {
        setDepartments(fetchData.departments);
      }

      setFeedback({
        type: "success",
        message: data.message || "Canonical departments initialized successfully.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Initialization failed.";
      setFeedback({ type: "error", message });
    } finally {
      setInitializing(false);
    }
  };

  const handleToggleActive = async (dept: DepartmentItem) => {
    setTogglingId(dept.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !dept.active }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to toggle department status.");
      }

      setDepartments((prev) =>
        prev.map((d) => (d.id === dept.id ? { ...d, active: !d.active } : d))
      );

      setFeedback({
        type: "success",
        message: `Department "${dept.name}" marked as ${!dept.active ? "Active" : "Inactive"}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to toggle status.";
      setFeedback({ type: "error", message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDepartmentSaved = (updated: DepartmentItem) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
    );
    setFeedback({
      type: "success",
      message: `Department "${updated.name}" updated successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-lg border p-4 flex items-start gap-3 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/40 bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span className="font-semibold flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="hover:text-ccf-offwhite font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Empty State / Initialize Action */}
      {departments.length === 0 ? (
        <Card className="bg-ccf-surface border-border/60 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-ccf-surface-elevated text-ccf-gold">
            <Layers className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ccf-offwhite">
              No Department Records in Database
            </h3>
            <p className="text-xs text-ccf-muted leading-relaxed">
              The Crescent Club of Finance defines five canonical operational departments. You can safely initialize these five departments without altering any existing data.
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={handleInitializeCanonical}
              disabled={initializing}
              className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs px-5"
            >
              {initializing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Initializing Departments...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  <span>Initialize 5 Canonical Departments</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        /* Department Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Card
              key={dept.id}
              className="bg-ccf-surface border-border/60 flex flex-col justify-between shadow-sm overflow-hidden"
            >
              <CardHeader className="space-y-2 p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-ccf-offwhite">
                      {dept.name}
                    </CardTitle>
                    <span className="font-mono text-[11px] text-ccf-gold block">
                      {dept.slug}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      dept.active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold text-[11px]"
                        : "border-border/60 text-ccf-muted text-[11px]"
                    }
                  >
                    {dept.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-ccf-muted line-clamp-3 leading-relaxed pt-1">
                  {dept.description || "No operational description provided."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-3 space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-ccf-surface-sunken p-3 rounded-lg border border-border/40 text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-ccf-muted" />
                    <div>
                      <span className="text-[10px] text-ccf-muted block">Members</span>
                      <span className="font-bold text-ccf-offwhite">
                        {dept._count?.members ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5 text-ccf-muted" />
                    <div>
                      <span className="text-[10px] text-ccf-muted block">Applications</span>
                      <span className="font-bold text-ccf-offwhite">
                        {dept._count?.recruitmentApplications ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <Button
                    onClick={() => handleToggleActive(dept)}
                    disabled={togglingId === dept.id}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-ccf-muted hover:text-ccf-offwhite px-2 h-8"
                  >
                    {togglingId === dept.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : dept.active ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-400">
                        <ToggleRight className="h-4 w-4" />
                        <span>Deactivate</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400">
                        <ToggleLeft className="h-4 w-4" />
                        <span>Activate</span>
                      </span>
                    )}
                  </Button>

                  <Button
                    onClick={() => setEditingDepartment(dept)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-border/60 text-ccf-offwhite hover:bg-ccf-surface-elevated h-8 px-3"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5 text-ccf-gold" />
                    <span>Edit</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <DepartmentDialog
        department={editingDepartment}
        isOpen={!!editingDepartment}
        onClose={() => setEditingDepartment(null)}
        onSaved={handleDepartmentSaved}
      />
    </div>
  );
}
