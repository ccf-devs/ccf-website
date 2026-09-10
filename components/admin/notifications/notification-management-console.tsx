"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  X,
  Loader2,
  Globe,
  User,
  Plus,
  Clock,
  RotateCcw,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  targetAdminId: string | null;
  type: string;
  title: string;
  body: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  readAt: string | null;
  createdAt: string;
  targetAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminUserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface NotificationMetrics {
  total: number;
  unread: number;
  warningsAndErrors: number;
  global: number;
}

/**
 * Resolves whether a notification should be visible to an administrator.
 *
 * Client-Side Isolation Contract:
 * - targetAdminId === null: Global broadcast visible to all administrators.
 * - targetAdminId === currentAdminId: Targeted alert addressed to this administrator.
 * - targetAdminId !== currentAdminId: Private alert for another administrator (strictly hidden).
 */
export function isNotificationVisibleToAdmin(
  targetAdminId: string | null,
  currentAdminId: string
): boolean {
  return targetAdminId === null || targetAdminId === currentAdminId;
}

/**
 * Resolves the updated notifications list after an administrator creates a new notification.
 *
 * Enforces client-side isolation:
 * - Global notification (null targetAdminId) -> Added to the administrator's feed.
 * - Targeted to currentAdminId -> Added to the administrator's feed.
 * - Targeted to another administrator -> NOT added to the creator's feed.
 */
export function resolveCreatedNotificationList(
  currentList: NotificationItem[],
  newNotification: NotificationItem,
  currentAdminId: string
): NotificationItem[] {
  if (isNotificationVisibleToAdmin(newNotification.targetAdminId, currentAdminId)) {
    return [newNotification, ...currentList];
  }
  return currentList;
}

interface NotificationManagementConsoleProps {
  initialNotifications: NotificationItem[];
  activeAdmins: AdminUserOption[];
  initialMetrics: NotificationMetrics;
  currentAdminId: string;
}

export function NotificationManagementConsole({
  initialNotifications,
  activeAdmins,
  initialMetrics,
  currentAdminId,
}: NotificationManagementConsoleProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);
  const [metrics, setMetrics] = useState<NotificationMetrics>(initialMetrics);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingNotification, setDeletingNotification] =
    useState<NotificationItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isMarkAllLoading, setIsMarkAllLoading] = useState(false);

  // Create form state
  const [createTitle, setCreateTitle] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [createType, setCreateType] = useState("BROADCAST");
  const [createSeverity, setCreateSeverity] = useState<
    "INFO" | "SUCCESS" | "WARNING" | "ERROR"
  >("INFO");
  const [createTargetMode, setCreateTargetMode] = useState<"GLOBAL" | "TARGETED">(
    "GLOBAL"
  );
  const [createTargetAdminId, setCreateTargetAdminId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Recalculate metrics locally
  const recalculateMetrics = (list: NotificationItem[]) => {
    const visibleList = list.filter((n) =>
      isNotificationVisibleToAdmin(n.targetAdminId, currentAdminId)
    );
    const total = visibleList.length;
    const unread = visibleList.filter((n) => n.readAt === null).length;
    const warningsAndErrors = visibleList.filter(
      (n) => n.severity === "WARNING" || n.severity === "ERROR"
    ).length;
    const globalCount = visibleList.filter((n) => n.targetAdminId === null).length;

    setMetrics({
      total,
      unread,
      warningsAndErrors,
      global: globalCount,
    });
  };

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Defense in depth: strictly hide any notification targeted to another administrator
      if (!isNotificationVisibleToAdmin(item.targetAdminId, currentAdminId)) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesBody = item.body.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody && !matchesType) return false;
      }

      // Severity
      if (severityFilter !== "ALL" && item.severity !== severityFilter) {
        return false;
      }

      // Status
      if (statusFilter === "UNREAD" && item.readAt !== null) return false;
      if (statusFilter === "READ" && item.readAt === null) return false;

      // Target
      if (targetFilter === "GLOBAL" && item.targetAdminId !== null) return false;
      if (targetFilter === "TARGETED" && item.targetAdminId === null) return false;

      return true;
    });
  }, [
    notifications,
    currentAdminId,
    searchQuery,
    severityFilter,
    statusFilter,
    targetFilter,
  ]);

  // Handlers
  const handleToggleRead = async (item: NotificationItem) => {
    const newReadState = item.readAt === null;
    setActionLoadingId(item.id);

    try {
      const res = await fetch(`/api/admin/notifications/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: newReadState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update notification.");
      }

      const updatedList = notifications.map((n) =>
        n.id === item.id
          ? {
              ...n,
              readAt: newReadState ? new Date().toISOString() : null,
            }
          : n
      );

      setNotifications(updatedList);
      recalculateMetrics(updatedList);
      showToast(
        newReadState
          ? "Notification marked as read."
          : "Notification marked as unread."
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update status.",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkAllLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/read-all", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark all as read.");
      }

      const now = new Date().toISOString();
      const updatedList = notifications.map((n) => ({
        ...n,
        readAt: n.readAt ?? now,
      }));

      setNotifications(updatedList);
      recalculateMetrics(updatedList);
      showToast(`Marked ${data.count || 0} notification(s) as read.`);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to mark all as read.",
        "error"
      );
    } finally {
      setIsMarkAllLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingNotification) return;
    setActionLoadingId(deletingNotification.id);

    try {
      const res = await fetch(
        `/api/admin/notifications/${deletingNotification.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete notification.");
      }

      const updatedList = notifications.filter(
        (n) => n.id !== deletingNotification.id
      );
      setNotifications(updatedList);
      recalculateMetrics(updatedList);
      showToast("Notification removed successfully.");
      setDeletingNotification(null);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete notification.",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createTitle.trim()) {
      setCreateError("Title is required.");
      return;
    }

    if (!createBody.trim()) {
      setCreateError("Body content is required.");
      return;
    }

    if (createTargetMode === "TARGETED" && !createTargetAdminId) {
      setCreateError("Please select a target administrator.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: createTitle.trim(),
        body: createBody.trim(),
        type: createType.trim(),
        severity: createSeverity,
        targetAdminId:
          createTargetMode === "TARGETED" ? createTargetAdminId : null,
      };

      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create notification.");
      }

      const newNotif: NotificationItem = {
        ...data.notification,
        createdAt:
          typeof data.notification.createdAt === "string"
            ? data.notification.createdAt
            : new Date().toISOString(),
      };

      const updatedList = resolveCreatedNotificationList(
        notifications,
        newNotif,
        currentAdminId
      );

      if (updatedList !== notifications) {
        setNotifications(updatedList);
        recalculateMetrics(updatedList);
      }
      showToast("Notification created successfully.");

      // Reset form
      setCreateTitle("");
      setCreateBody("");
      setCreateType("BROADCAST");
      setCreateSeverity("INFO");
      setCreateTargetMode("GLOBAL");
      setCreateTargetAdminId("");
      setIsCreateOpen(false);
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create notification."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "ERROR":
        return (
          <Badge className="bg-red-950/80 border-red-500/40 text-red-300 font-semibold text-[10px] px-2 py-0.5">
            <AlertCircle className="w-3 h-3 mr-1 text-red-400" />
            Error
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-amber-950/80 border-amber-500/40 text-amber-300 font-semibold text-[10px] px-2 py-0.5">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
            Warning
          </Badge>
        );
      case "SUCCESS":
        return (
          <Badge className="bg-emerald-950/80 border-emerald-500/40 text-emerald-300 font-semibold text-[10px] px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
            Success
          </Badge>
        );
      case "INFO":
      default:
        return (
          <Badge className="bg-blue-950/80 border-blue-500/40 text-blue-300 font-semibold text-[10px] px-2 py-0.5">
            <Info className="w-3 h-3 mr-1 text-blue-400" />
            Info
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg border shadow-lg text-xs font-medium flex items-center gap-2 transition-all duration-300 ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500/50 text-emerald-200"
              : "bg-red-950 border-red-500/50 text-red-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Total Alerts
            </span>
            <Bell className="w-4 h-4 text-ccf-gold" />
          </div>
          <div className="text-2xl font-bold text-ccf-offwhite tracking-tight">
            {metrics.total}
          </div>
          <p className="text-[11px] text-ccf-muted">In administrative feed</p>
        </Card>

        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Unread
            </span>
            <span className="relative flex h-2.5 w-2.5">
              {metrics.unread > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ccf-gold opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  metrics.unread > 0 ? "bg-ccf-gold" : "bg-ccf-muted"
                }`}
              ></span>
            </span>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              metrics.unread > 0 ? "text-ccf-gold" : "text-ccf-offwhite"
            }`}
          >
            {metrics.unread}
          </div>
          <p className="text-[11px] text-ccf-muted">Awaiting administrator review</p>
        </Card>

        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Warnings & Errors
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              metrics.warningsAndErrors > 0
                ? "text-amber-400"
                : "text-ccf-offwhite"
            }`}
          >
            {metrics.warningsAndErrors}
          </div>
          <p className="text-[11px] text-ccf-muted">System or operational alerts</p>
        </Card>

        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Global Alerts
            </span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-ccf-offwhite tracking-tight">
            {metrics.global}
          </div>
          <p className="text-[11px] text-ccf-muted">Broadcast to all administrators</p>
        </Card>
      </div>

      {/* Action and Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-ccf-surface border border-border/60 rounded-xl p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ccf-muted" />
            <Input
              type="text"
              placeholder="Search by title, body, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite focus-visible:ring-ccf-gold"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">Info</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="ALL">All Read States</option>
            <option value="UNREAD">Unread Only</option>
            <option value="READ">Read Only</option>
          </select>

          {/* Target Filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="ALL">All Destinations</option>
            <option value="GLOBAL">Global Broadcasts</option>
            <option value="TARGETED">Directly Targeted</option>
          </select>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={metrics.unread === 0 || isMarkAllLoading}
            className="border-border/60 bg-ccf-surface-sunken hover:bg-ccf-surface text-xs h-9 text-ccf-offwhite"
          >
            {isMarkAllLoading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-ccf-gold" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-1.5 text-ccf-gold" />
            )}
            <span>Mark All Read</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light shadow-sm text-xs font-semibold h-9 px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Notification</span>
          </Button>
        </div>
      </div>

      {/* Notifications Feed */}
      {filteredNotifications.length === 0 ? (
        <Card className="bg-ccf-surface border-border/60 p-12 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-ccf-gold/10 border border-ccf-gold/30 text-ccf-gold mx-auto flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-ccf-offwhite">
              {notifications.length === 0
                ? "No Notifications Yet"
                : "No Matching Notifications"}
            </h3>
            <p className="text-xs text-ccf-muted max-w-sm mx-auto">
              {notifications.length === 0
                ? "Your administrative feed is clear. System milestones, broadcast alerts, and operational updates will appear here."
                : "No notifications match the active filter criteria. Clear or adjust your search filters."}
            </p>
          </div>
          {notifications.length === 0 && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light shadow-sm text-xs font-semibold h-9 px-4"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Create First Alert</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const isUnread = item.readAt === null;
            const isTargetedToMe = item.targetAdminId === currentAdminId;
            const isGlobal = item.targetAdminId === null;

            return (
              <Card
                key={item.id}
                className={`bg-ccf-surface border transition-all duration-200 p-4 shadow-sm hover:border-ccf-gold/40 ${
                  isUnread
                    ? "border-ccf-gold/40 bg-gradient-to-r from-ccf-gold/[0.03] to-transparent"
                    : "border-border/60"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Header line: badges and timestamps */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-ccf-gold shrink-0 animate-pulse" />
                      )}
                      {getSeverityBadge(item.severity)}
                      <Badge
                        variant="outline"
                        className="border-border/60 text-ccf-muted text-[10px] uppercase font-mono tracking-wider"
                      >
                        {item.type}
                      </Badge>

                      {isGlobal ? (
                        <Badge
                          variant="outline"
                          className="border-blue-500/30 text-blue-300 text-[10px] flex items-center gap-1"
                        >
                          <Globe className="w-2.5 h-2.5" />
                          Global
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-purple-500/30 text-purple-300 text-[10px] flex items-center gap-1"
                        >
                          <User className="w-2.5 h-2.5" />
                          {isTargetedToMe ? "Targeted to You" : "Direct Alert"}
                        </Badge>
                      )}

                      <span className="text-[11px] text-ccf-muted flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-sm font-semibold tracking-tight ${
                        isUnread ? "text-ccf-offwhite" : "text-ccf-offwhite/80"
                      }`}
                    >
                      {item.title}
                    </h4>

                    {/* Body */}
                    <p className="text-xs text-ccf-muted whitespace-pre-line leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRead(item)}
                      disabled={actionLoadingId === item.id}
                      className="h-8 px-2.5 text-xs text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-sunken"
                      title={isUnread ? "Mark as Read" : "Mark as Unread"}
                    >
                      {actionLoadingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isUnread ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-ccf-muted mr-1.5" />
                      )}
                      <span>{isUnread ? "Mark Read" : "Unread"}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingNotification(item)}
                      className="h-8 w-8 p-0 text-ccf-muted hover:text-red-400 hover:bg-red-950/30"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Notification Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ccf-surface border border-border/60 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-ccf-offwhite">
                  Create Notification / Broadcast
                </h3>
                <p className="text-xs text-ccf-muted">
                  Send an operational alert to all administrators or a specific peer.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 w-8 p-0 text-ccf-muted hover:text-ccf-offwhite"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {createError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-ccf-muted">Notification Title *</Label>
                <Input
                  type="text"
                  placeholder="e.g. Magnora'26 Reached 90% Capacity"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  maxLength={250}
                  className="bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite focus-visible:ring-ccf-gold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-ccf-muted">Type / Category *</Label>
                  <Input
                    type="text"
                    placeholder="BROADCAST"
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                    maxLength={100}
                    className="bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite focus-visible:ring-ccf-gold font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-ccf-muted">Severity *</Label>
                  <select
                    value={createSeverity}
                    onChange={(e) =>
                      setCreateSeverity(
                        e.target.value as "INFO" | "SUCCESS" | "WARNING" | "ERROR"
                      )
                    }
                    className="w-full bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
                  >
                    <option value="INFO">Info</option>
                    <option value="SUCCESS">Success</option>
                    <option value="WARNING">Warning</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-ccf-muted">Destination *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateTargetMode("GLOBAL")}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                      createTargetMode === "GLOBAL"
                        ? "bg-ccf-gold/10 border-ccf-gold text-ccf-gold"
                        : "bg-ccf-surface-sunken border-border/60 text-ccf-muted hover:text-ccf-offwhite"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Global (All Admins)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateTargetMode("TARGETED")}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                      createTargetMode === "TARGETED"
                        ? "bg-ccf-gold/10 border-ccf-gold text-ccf-gold"
                        : "bg-ccf-surface-sunken border-border/60 text-ccf-muted hover:text-ccf-offwhite"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Specific Admin</span>
                  </button>
                </div>
              </div>

              {createTargetMode === "TARGETED" && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <Label className="text-xs text-ccf-muted">
                    Target Administrator *
                  </Label>
                  <select
                    value={createTargetAdminId}
                    onChange={(e) => setCreateTargetAdminId(e.target.value)}
                    className="w-full bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
                    required
                  >
                    <option value="">Select an administrator...</option>
                    {activeAdmins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email}) — {admin.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-ccf-muted">Message Content *</Label>
                <textarea
                  placeholder="Provide operational details, actions required, or relevant context..."
                  value={createBody}
                  onChange={(e) => setCreateBody(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-md border border-border/60 bg-ccf-surface-sunken p-3 text-xs text-ccf-offwhite placeholder:text-ccf-muted/60 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
                  required
                />
                <div className="text-right text-[10px] text-ccf-muted">
                  {createBody.length} / 2000
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs border-border/60 text-ccf-muted hover:text-ccf-offwhite"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs h-9 px-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Alert"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingNotification && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ccf-surface border border-border/60 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ccf-offwhite">
                  Delete Notification?
                </h3>
                <p className="text-xs text-ccf-muted leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-ccf-offwhite">
                    &ldquo;{deletingNotification.title}&rdquo;
                  </span>
                  ? This alert will be removed from all recipient feeds.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingNotification(null)}
                disabled={actionLoadingId !== null}
                className="text-xs border-border/60 text-ccf-muted hover:text-ccf-offwhite"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={actionLoadingId !== null}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4"
              >
                {actionLoadingId === deletingNotification.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
