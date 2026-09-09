"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MemberDialog,
  MemberItem,
  MemberDepartmentInfo,
} from "./member-dialog";

interface MemberListTableProps {
  initialMembers: MemberItem[];
  departments: MemberDepartmentInfo[];
}

export function MemberListTable({
  initialMembers,
  departments,
}: MemberListTableProps) {
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // 1. Department filter
      if (selectedDepartmentId !== "ALL" && member.departmentId !== selectedDepartmentId) {
        return false;
      }

      // 2. Status filter
      if (selectedStatus === "ACTIVE" && !member.visibility) {
        return false;
      }
      if (selectedStatus === "INACTIVE" && member.visibility) {
        return false;
      }

      // 3. Search query (name or position)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = member.name.toLowerCase().includes(q);
        const matchesPosition = member.position ? member.position.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPosition) {
          return false;
        }
      }

      return true;
    });
  }, [members, selectedDepartmentId, selectedStatus, searchQuery]);

  // Handler for toggle active/inactive
  const handleToggleVisibility = async (member: MemberItem) => {
    setTogglingId(member.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: !member.visibility }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update member visibility.");
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, visibility: !m.visibility } : m))
      );

      setFeedback({
        type: "success",
        message: `Member "${member.name}" marked as ${!member.visibility ? "Active" : "Inactive"}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to toggle status.";
      setFeedback({ type: "error", message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleMemberSaved = (savedMember: MemberItem) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === savedMember.id);
      if (exists) {
        return prev.map((m) => (m.id === savedMember.id ? savedMember : m));
      }
      return [...prev, savedMember].sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.name.localeCompare(b.name);
      });
    });

    setFeedback({
      type: "success",
      message: `Member "${savedMember.name}" saved successfully.`,
    });
  };

  const openAddDialog = () => {
    setEditingMember(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (member: MemberItem) => {
    setEditingMember(member);
    setIsDialogOpen(true);
  };

  const hasDepartments = departments.length > 0;

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
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

      {/* No Departments Warning */}
      {!hasDepartments && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              No department records exist in the database. You must initialize canonical departments before creating members.
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs border-amber-500/30 text-amber-300 shrink-0">
            <Link href="/admin/departments">Go to Departments</Link>
          </Button>
        </div>
      )}

      {/* Top Filter & Action Bar */}
      <Card className="bg-ccf-surface border-border/60 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ccf-muted" />
            <Input
              type="text"
              placeholder="Search members by name or role title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-ccf-surface-sunken border-border/60 text-xs text-ccf-offwhite placeholder:text-ccf-muted/60 focus:border-ccf-gold"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className="h-9 rounded-md border border-border/60 bg-ccf-surface-sunken px-3 text-xs text-ccf-offwhite focus:border-ccf-gold focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} {!dept.active ? "(Inactive)" : ""}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
            className="h-9 rounded-md border border-border/60 bg-ccf-surface-sunken px-3 text-xs text-ccf-offwhite focus:border-ccf-gold focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Add Member Button */}
          <Button
            onClick={openAddDialog}
            disabled={!hasDepartments}
            size="sm"
            className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs px-4 h-9 shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            <span>Add Member</span>
          </Button>
        </div>
      </Card>

      {/* Members Table or Empty State */}
      {members.length === 0 ? (
        <Card className="bg-ccf-surface border-border/60 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-ccf-surface-elevated text-ccf-gold">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ccf-offwhite">
              No Member Records in Database
            </h3>
            <p className="text-xs text-ccf-muted leading-relaxed">
              No executive or student leadership records have been added yet. Add your first member to populate the directory.
            </p>
          </div>
          {hasDepartments && (
            <div className="pt-2">
              <Button
                onClick={openAddDialog}
                size="sm"
                className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs px-5"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                <span>Add First Member</span>
              </Button>
            </div>
          )}
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card className="bg-ccf-surface border-border/60 p-8 text-center space-y-2 shadow-sm">
          <p className="text-sm font-semibold text-ccf-offwhite">
            No members match your filter criteria.
          </p>
          <p className="text-xs text-ccf-muted">
            Try clearing your search query or selecting a different department filter.
          </p>
          <div className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedDepartmentId("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-xs border-border/60 text-ccf-muted hover:text-ccf-offwhite"
            >
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="bg-ccf-surface border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-ccf-surface-sunken text-ccf-muted font-semibold">
                  <th className="p-3.5 pl-4">Member</th>
                  <th className="p-3.5">Position</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5 text-center">Display Order</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredMembers.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-ccf-surface-elevated/50 transition-colors"
                  >
                    {/* Member Name */}
                    <td className="p-3.5 pl-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-ccf-offwhite block">
                          {m.name}
                        </span>
                        {m.socialUrl && (
                          <a
                            href={m.socialUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-[11px] text-ccf-gold hover:underline"
                          >
                            <span>Profile</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="p-3.5 text-ccf-offwhite">
                      {m.position || (
                        <span className="text-ccf-muted italic">—</span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className="border-border/60 bg-ccf-surface-sunken text-ccf-offwhite text-[11px]"
                      >
                        {m.department?.name || "Unassigned"}
                      </Badge>
                    </td>

                    {/* Display Order */}
                    <td className="p-3.5 text-center font-mono text-ccf-muted">
                      {m.displayOrder}
                    </td>

                    {/* Visibility / Status */}
                    <td className="p-3.5 text-center">
                      <Badge
                        variant="outline"
                        className={
                          m.visibility
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold text-[11px]"
                            : "border-border/60 text-ccf-muted text-[11px]"
                        }
                      >
                        {m.visibility ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          onClick={() => handleToggleVisibility(m)}
                          disabled={togglingId === m.id}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-ccf-muted hover:text-ccf-offwhite"
                          title={m.visibility ? "Deactivate member" : "Activate member"}
                        >
                          {togglingId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : m.visibility ? (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <ToggleRight className="h-4 w-4" />
                              <span className="hidden sm:inline">Deactivate</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <ToggleLeft className="h-4 w-4" />
                              <span className="hidden sm:inline">Activate</span>
                            </span>
                          )}
                        </Button>

                        <Button
                          onClick={() => openEditDialog(m)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs border-border/60 text-ccf-offwhite hover:bg-ccf-surface-elevated"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1 text-ccf-gold" />
                          <span>Edit</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Member Add/Edit Dialog */}
      <MemberDialog
        member={editingMember}
        departments={departments}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSaved={handleMemberSaved}
      />
    </div>
  );
}
