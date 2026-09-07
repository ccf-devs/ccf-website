"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Phone,
  Power,
  Filter,
  Users,
  Check,
  X,
  AlertTriangle,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AdminRecruitmentApplicationItem,
  RecruitmentSettings,
  VALID_RECRUITMENT_TRANSITIONS,
} from "@/lib/recruitment/types";
import { RecruitmentStatus } from "@prisma/client";

interface DepartmentOption {
  id: string;
  name: string;
}

interface RecruitmentManagerProps {
  initialSettings: RecruitmentSettings;
  initialApplications: AdminRecruitmentApplicationItem[];
  departments: DepartmentOption[];
}

export function RecruitmentManager({
  initialSettings,
  initialApplications,
  departments,
}: RecruitmentManagerProps) {
  // Settings state
  const [settings, setSettings] = useState<RecruitmentSettings>(initialSettings);
  const [whatsappUrlInput, setWhatsappUrlInput] = useState(
    initialSettings.whatsappGroupUrl || ""
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Applications state
  const [applications, setApplications] =
    useState<AdminRecruitmentApplicationItem[]>(initialApplications);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Interaction state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingApp, setDeletingApp] =
    useState<AdminRecruitmentApplicationItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Counts
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((a) => a.status === RecruitmentStatus.ACTIVE).length;
    const selected = applications.filter((a) => a.status === RecruitmentStatus.SELECTED).length;
    const rejected = applications.filter((a) => a.status === RecruitmentStatus.REJECTED).length;
    const withdrawn = applications.filter((a) => a.status === RecruitmentStatus.WITHDRAWN).length;
    return { total, active, selected, rejected, withdrawn };
  }, [applications]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (selectedDepartment !== "ALL" && app.departmentId !== selectedDepartment) {
        return false;
      }
      if (selectedStatus !== "ALL" && app.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = app.name.toLowerCase().includes(q);
        const matchesRrn = app.rrnNormalized.toLowerCase().includes(q);
        const matchesAcademic = app.academicDepartment.toLowerCase().includes(q);
        if (!matchesName && !matchesRrn && !matchesAcademic) {
          return false;
        }
      }
      return true;
    });
  }, [applications, selectedDepartment, selectedStatus, searchQuery]);

  // Toggle recruitment open/closed
  const handleToggleRecruitment = async () => {
    setActionError(null);
    setActionSuccess(null);
    setSavingSettings(true);

    try {
      const res = await fetch("/api/admin/recruitment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOpen: !settings.isOpen,
          whatsappGroupUrl: whatsappUrlInput.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update recruitment status.");
      }

      setSettings(data.settings);
      setActionSuccess(
        `Recruitment status updated to: ${data.settings.isOpen ? "OPEN" : "CLOSED"}`
      );
    } catch (err: any) {
      setActionError(err.message || "Failed to update recruitment status.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Save WhatsApp group URL
  const handleSaveWhatsappUrl = async () => {
    setActionError(null);
    setActionSuccess(null);
    setSavingSettings(true);

    try {
      const res = await fetch("/api/admin/recruitment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOpen: settings.isOpen,
          whatsappGroupUrl: whatsappUrlInput.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update WhatsApp group link.");
      }

      setSettings(data.settings);
      setActionSuccess("WhatsApp group link saved successfully.");
    } catch (err: any) {
      setActionError(err.message || "Failed to update WhatsApp group link.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Update application status
  const handleUpdateStatus = async (id: string, newStatus: RecruitmentStatus) => {
    setActionError(null);
    setActionSuccess(null);
    setUpdatingId(id);

    try {
      const res = await fetch(`/api/admin/recruitment/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update application status.");
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: data.application.status } : app
        )
      );
      setActionSuccess(`Application status updated to ${newStatus}.`);
    } catch (err: any) {
      setActionError(err.message || "Failed to update application status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete application
  const handleDeleteApplication = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    setUpdatingId(id);

    try {
      const res = await fetch(`/api/admin/recruitment/applications/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete application.");
      }

      setApplications((prev) => prev.filter((app) => app.id !== id));
      setDeletingApp(null);
      setActionSuccess(
        "Application deleted successfully. Active RRN lock has been released."
      );
    } catch (err: any) {
      setActionError(err.message || "Failed to delete application.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: RecruitmentStatus) => {
    switch (status) {
      case RecruitmentStatus.ACTIVE:
        return (
          <Badge
            variant="outline"
            className="border-sky-500/40 bg-sky-500/10 text-sky-400 font-mono text-xs"
          >
            ACTIVE
          </Badge>
        );
      case RecruitmentStatus.SELECTED:
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs"
          >
            SELECTED
          </Badge>
        );
      case RecruitmentStatus.REJECTED:
        return (
          <Badge
            variant="outline"
            className="border-rose-500/40 bg-rose-500/10 text-rose-400 font-mono text-xs"
          >
            REJECTED
          </Badge>
        );
      case RecruitmentStatus.WITHDRAWN:
        return (
          <Badge
            variant="outline"
            className="border-zinc-500/40 bg-zinc-500/10 text-zinc-400 font-mono text-xs"
          >
            WITHDRAWN
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-ccf-muted text-xs">
            {status}
          </Badge>
        );
    }
  };

  const formatIST = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Global Notifications */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Recruitment Configuration Panel */}
      <Card className="p-6 bg-ccf-surface border-border/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="type-h3 text-lg font-bold text-ccf-offwhite">
                Recruitment Status & Intake
              </h3>
              {settings.isOpen ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold px-2.5 py-0.5 text-xs inline-flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  OPEN
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-zinc-600 bg-zinc-800 text-zinc-400 font-semibold px-2.5 py-0.5 text-xs inline-flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  CLOSED
                </Badge>
              )}
            </div>
            <p className="type-body text-xs md:text-sm text-ccf-muted">
              Control whether the public application portal accepts new student registrations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={settings.isOpen ? "destructive" : "gold"}
              onClick={handleToggleRecruitment}
              disabled={savingSettings}
              className="inline-flex items-center gap-2"
            >
              {savingSettings ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              <span>
                {settings.isOpen ? "Close Recruitment" : "Open Recruitment"}
              </span>
            </Button>
          </div>
        </div>

        {/* WhatsApp Group Configuration */}
        <div className="mt-6 pt-6 border-t border-border/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 space-y-1.5">
            <label
              htmlFor="whatsapp-url"
              className="type-caption text-xs text-ccf-muted font-medium flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5 text-ccf-gold" />
              <span>Official WhatsApp Group Invite URL (Optional)</span>
            </label>
            <Input
              id="whatsapp-url"
              value={whatsappUrlInput}
              onChange={(e) => setWhatsappUrlInput(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="bg-ccf-navy/40 text-sm"
            />
            <p className="type-caption text-xs text-ccf-muted/70">
              Presented to students upon successful application submission for joining recruitment communications.
            </p>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={handleSaveWhatsappUrl}
              disabled={savingSettings}
              className="w-full md:w-auto text-xs"
            >
              {savingSettings ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save Link
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Recruitment Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 bg-ccf-surface border-border/60 text-center">
          <span className="type-caption text-xs text-ccf-muted">Total Apps</span>
          <p className="type-h2 text-xl md:text-2xl font-bold text-ccf-offwhite mt-1">
            {stats.total}
          </p>
        </Card>
        <Card className="p-4 bg-ccf-surface border-sky-500/20 text-center">
          <span className="type-caption text-xs text-sky-400">Active</span>
          <p className="type-h2 text-xl md:text-2xl font-bold text-sky-400 mt-1">
            {stats.active}
          </p>
        </Card>
        <Card className="p-4 bg-ccf-surface border-emerald-500/20 text-center">
          <span className="type-caption text-xs text-emerald-400">Selected</span>
          <p className="type-h2 text-xl md:text-2xl font-bold text-emerald-400 mt-1">
            {stats.selected}
          </p>
        </Card>
        <Card className="p-4 bg-ccf-surface border-rose-500/20 text-center">
          <span className="type-caption text-xs text-rose-400">Rejected</span>
          <p className="type-h2 text-xl md:text-2xl font-bold text-rose-400 mt-1">
            {stats.rejected}
          </p>
        </Card>
        <Card className="p-4 bg-ccf-surface border-zinc-700 text-center col-span-2 sm:col-span-1">
          <span className="type-caption text-xs text-zinc-400">Withdrawn</span>
          <p className="type-h2 text-xl md:text-2xl font-bold text-zinc-400 mt-1">
            {stats.withdrawn}
          </p>
        </Card>
      </div>

      {/* 4. Filter Toolbar */}
      <Card className="p-4 bg-ccf-surface border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ccf-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, RRN, major..."
              className="pl-9 bg-ccf-navy/40 text-sm"
            />
          </div>

          {/* Department Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-md bg-ccf-navy/40 border border-input text-ccf-offwhite text-sm focus:outline-none focus:ring-2 focus:ring-ccf-gold"
            >
              <option value="ALL">All CCF Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-md bg-ccf-navy/40 border border-input text-ccf-offwhite text-sm focus:outline-none focus:ring-2 focus:ring-ccf-gold"
            >
              <option value="ALL">All Statuses</option>
              <option value={RecruitmentStatus.ACTIVE}>ACTIVE</option>
              <option value={RecruitmentStatus.SELECTED}>SELECTED</option>
              <option value={RecruitmentStatus.REJECTED}>REJECTED</option>
              <option value={RecruitmentStatus.WITHDRAWN}>WITHDRAWN</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 5. Applications Table */}
      <Card className="overflow-hidden bg-ccf-surface border-border/60">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-ccf-muted/40 mx-auto" />
            <h4 className="type-h4 text-base font-medium text-ccf-offwhite">
              No recruitment applications found
            </h4>
            <p className="type-body text-xs text-ccf-muted max-w-sm mx-auto">
              {applications.length === 0
                ? "No students have submitted applications yet."
                : "No applications match your selected filter criteria. Try resetting filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ccf-surface-elevated border-b border-border/60 text-xs font-semibold uppercase text-ccf-muted tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Applicant</th>
                  <th className="py-3.5 px-4">Desired Dept</th>
                  <th className="py-3.5 px-4">Academic Background</th>
                  <th className="py-3.5 px-4">WhatsApp Contact</th>
                  <th className="py-3.5 px-4">Submitted (IST)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-ccf-surface-elevated/40 transition-colors"
                  >
                    {/* Applicant */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-ccf-offwhite">
                        {app.name}
                      </div>
                      <div className="font-mono text-xs text-ccf-gold mt-0.5">
                        {app.rrnNormalized}
                      </div>
                    </td>

                    {/* Desired Dept */}
                    <td className="py-3.5 px-4 font-medium text-ccf-offwhite">
                      {app.departmentName}
                    </td>

                    {/* Academic */}
                    <td className="py-3.5 px-4 text-xs text-ccf-muted">
                      <div>{app.academicDepartment}</div>
                      <div className="text-ccf-muted/80">{app.year}</div>
                    </td>

                    {/* Phone / WhatsApp */}
                    <td className="py-3.5 px-4">
                      <a
                        href={`https://wa.me/${app.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono underline"
                        title="Open WhatsApp chat"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{app.phone}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    </td>

                    {/* Submitted */}
                    <td className="py-3.5 px-4 text-xs text-ccf-muted font-mono whitespace-nowrap">
                      {formatIST(app.createdAt)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Status update select */}
                        <select
                          value={app.status}
                          onChange={(e) =>
                            handleUpdateStatus(
                              app.id,
                              e.target.value as RecruitmentStatus
                            )
                          }
                          disabled={updatingId === app.id}
                          className="h-8 px-2 rounded bg-ccf-navy/60 border border-border text-xs text-ccf-offwhite focus:outline-none focus:ring-1 focus:ring-ccf-gold"
                          aria-label={`Change status for ${app.name}`}
                        >
                          <option value={app.status}>{app.status}</option>
                          {(VALID_RECRUITMENT_TRANSITIONS[app.status] || []).map(
                            (nextStatus) => (
                              <option key={nextStatus} value={nextStatus}>
                                {nextStatus}
                              </option>
                            )
                          )}
                        </select>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingApp(app)}
                          disabled={updatingId === app.id}
                          className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Delete application"
                          aria-label={`Delete application for ${app.name}`}
                        >
                          {updatingId === app.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 6. Delete Confirmation Modal */}
      {deletingApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <Card className="max-w-md w-full p-6 bg-ccf-surface border-destructive/40 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="type-h4 text-base font-bold text-ccf-offwhite">
                  Delete Recruitment Application
                </h4>
                <p className="type-body text-xs text-ccf-muted leading-relaxed">
                  Are you sure you want to delete the application for{" "}
                  <strong className="text-ccf-offwhite">{deletingApp.name}</strong> (RRN:{" "}
                  <span className="font-mono text-ccf-gold">{deletingApp.rrnNormalized}</span>)?
                </p>
                <p className="type-caption text-xs text-amber-400/90 pt-1">
                  This action releases the active RRN lock and records an audit log event.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingApp(null)}
                disabled={updatingId === deletingApp.id}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteApplication(deletingApp.id)}
                disabled={updatingId === deletingApp.id}
              >
                {updatingId === deletingApp.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
