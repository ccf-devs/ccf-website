"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Shield,
  CreditCard,
  FileText,
  Edit,
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Database,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EventStatusBadge } from "./event-status-badge";
import {
  EventStatus,
  EventCapacityMode,
  RegistrationMode,
  RegistrationMethod,
  PaymentMode,
  PaymentMethod,
} from "@prisma/client";

export interface EventDetailData {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  venue: string | null;
  capacityMode: EventCapacityMode;
  capacity: number | null;
  registrationMode: RegistrationMode;
  registrationMethod: RegistrationMethod;
  eligibilityCrescent: boolean;
  eligibilityExternal: boolean;
  registrationOpensAt: Date | string | null;
  registrationClosesAt: Date | string | null;
  activeFormVersionId: string | null;
  paymentMode: PaymentMode;
  paymentMethod: PaymentMethod | null;
  feeAmount: any;
  upiId: string | null;
  payeeName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  content?: {
    descriptionRich?: string | null;
    rulesRich?: string | null;
    instructionsRich?: string | null;
    eligibilityRich?: string | null;
    notesRich?: string | null;
  } | null;
}

export interface EventMediaItem {
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  visibility: boolean;
  displayOrder: number;
  createdAt: Date | string;
}

interface EventDetailViewProps {
  event: EventDetailData;
  media?: EventMediaItem[];
}

function formatDateDisplay(val: Date | string | null | undefined): string {
  if (!val) return "Not specified";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventDetailView({ event, media = [] }: EventDetailViewProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [mediaList, setMediaList] = useState<EventMediaItem[]>(media);
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<EventMediaItem | null>(null);
  const [coverFeedback, setCoverFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleToggleVisibility = async (item: EventMediaItem) => {
    setTogglingVisibilityId(item.id);
    setCoverFeedback(null);

    try {
      const nextVisibility = !item.visibility;
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: nextVisibility }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update media visibility.");
      }

      setMediaList((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, visibility: nextVisibility } : m))
      );

      setCoverFeedback({
        type: "success",
        message: `Media visibility set to ${nextVisibility ? "Visible" : "Hidden"}.`,
      });
    } catch (err) {
      setCoverFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update visibility.",
      });
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  const handleDeleteMedia = async (item: EventMediaItem) => {
    setIsDeletingMedia(true);
    setCoverFeedback(null);

    try {
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete media asset.");
      }

      setMediaList((prev) => prev.filter((m) => m.id !== item.id));
      setMediaToDelete(null);

      setCoverFeedback({
        type: "success",
        message: "Media asset deleted successfully.",
      });
    } catch (err) {
      setCoverFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete media.",
      });
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleSetCover = async (mediaId: string) => {
    setSettingCoverId(mediaId);
    setCoverFeedback(null);

    try {
      const res = await fetch(`/api/admin/events/${event.id}/media/set-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to set cover image.");
      }

      setMediaList((prev) => {
        const target = prev.find((m) => m.id === mediaId);
        if (!target) return prev;
        const others = prev
          .filter((m) => m.id !== mediaId)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        return [
          { ...target, displayOrder: 0 },
          ...others.map((m, idx) => ({ ...m, displayOrder: idx + 1 })),
        ];
      });

      setCoverFeedback({
        type: "success",
        message: "Event cover image updated successfully.",
      });
    } catch (err) {
      setCoverFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to set cover image.",
      });
    } finally {
      setSettingCoverId(null);
    }
  };

  const handleCopyLink = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link", err);
      }
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportFeedback(null);

    try {
      const res = await fetch(
        `/api/admin/events/${event.id}/registrations/export`
      );

      if (!res.ok) {
        let errMessage = "Failed to export registrations CSV.";
        try {
          const data = await res.json();
          if (data.error) errMessage = data.error;
        } catch {
          // ignore json parse error
        }
        throw new Error(errMessage);
      }

      const disposition = res.headers.get("Content-Disposition");
      let filename = `CCF_${event.slug}_Registrations.csv`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setExportFeedback({
        type: "success",
        message: `Successfully exported CSV: ${filename}`,
      });
    } catch (err) {
      console.error("[EventDetailView Export] Error:", err);
      setExportFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "A network error occurred while exporting registrations.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Feedback Banner */}
      {exportFeedback && (
        <div
          role="alert"
          className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
            exportFeedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {exportFeedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{exportFeedback.message}</span>
        </div>
      )}

      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-border text-ccf-muted hover:text-ccf-offwhite"
          >
            <Link href="/admin/events">
              <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
              <span>Back to Events</span>
            </Link>
          </Button>

          <EventStatusBadge status={event.status} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {event.registrationMode !== RegistrationMode.NONE && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="border-border text-ccf-muted hover:text-ccf-offwhite"
                title="Export event registrations as CSV"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-ccf-gold" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5 text-ccf-gold" aria-hidden="true" />
                )}
                <span>Export CSV</span>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-ccf-gold/40 text-ccf-gold hover:border-ccf-gold hover:bg-ccf-gold/10"
              >
                <Link href={`/admin/events/${event.id}/form`}>
                  <FileText className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  <span>Form Engine</span>
                </Link>
              </Button>
            </>
          )}

          <Button
            asChild
            variant="outline"
            className="border-border text-ccf-muted hover:text-ccf-offwhite"
          >
            <Link href={`/admin/events/${event.id}/edit`}>
              <Edit className="h-4 w-4 mr-1.5" aria-hidden="true" />
              <span>Edit</span>
            </Link>
          </Button>

          {event.status === EventStatus.PUBLISHED && (
            <>
              <Button
                asChild
                variant="outline"
                className="border-border text-ccf-muted hover:text-ccf-offwhite"
                title="View public event page"
              >
                <Link href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5 text-ccf-gold" aria-hidden="true" />
                  <span>View Public Page</span>
                </Link>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="border-border text-ccf-muted hover:text-ccf-offwhite"
                title="Copy link to public event page"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4 mr-1.5 text-ccf-gold" aria-hidden="true" />
                )}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Configuration Grid (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Schedule & Location */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Calendar className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Schedule & Venue</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Official timing and campus location settings.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Starts At</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.startsAt)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Ends At</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.endsAt)}
              </span>
            </div>

            <div className="flex items-start justify-between pt-1">
              <span className="text-ccf-muted">Venue</span>
              <span className="font-semibold text-ccf-offwhite text-right max-w-xs">
                {event.venue || "None assigned"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Registration Configuration */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <FileText className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Registration Mode & Method</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Platform registration behavior and intake window.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Registration Mode</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.registrationMode}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Registration Method</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.registrationMethod}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Window Opens</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.registrationOpensAt)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Window Closes</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.registrationClosesAt)}
              </span>
            </div>

            {event.registrationMode !== RegistrationMode.NONE && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-ccf-muted">Form Engine</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ccf-offwhite">
                    {event.activeFormVersionId ? "Active Form Configured" : "No Form Published"}
                  </span>
                  <Link
                    href={`/admin/events/${event.id}/form`}
                    className="text-ccf-gold hover:underline text-[11px] font-medium"
                  >
                    Open Builder &rarr;
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Eligibility & Capacity */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Shield className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Eligibility & Capacity</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Participant group authorization and capacity mode.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Crescent Students</span>
              <span className="font-semibold inline-flex items-center gap-1">
                {event.eligibilityCrescent ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Eligible</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-ccf-muted" />
                    <span className="text-ccf-muted">Restricted</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">External Students</span>
              <span className="font-semibold inline-flex items-center gap-1">
                {event.eligibilityExternal ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Eligible</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-ccf-muted" />
                    <span className="text-ccf-muted">Restricted</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Capacity Mode</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.capacityMode}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-ccf-muted">Configured Limit</span>
              <span className="font-semibold text-ccf-offwhite font-mono">
                {event.capacityMode === EventCapacityMode.UNLIMITED
                  ? "Unlimited"
                  : event.capacity ?? "Not set"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Payment & Accounting */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Payment & Accounting</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Registration fee and UPI collection configuration.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Payment Mode</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.paymentMode}
              </span>
            </div>

            {event.paymentMode === PaymentMode.PAID ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-ccf-muted">Payment Method</span>
                  <span className="font-semibold text-ccf-offwhite">
                    {event.paymentMethod || "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-ccf-muted">Registration Fee</span>
                  <span className="font-bold text-ccf-gold font-mono">
                    ₹{Number(event.feeAmount).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-ccf-muted">UPI ID</span>
                  <span className="font-mono text-ccf-offwhite">
                    {event.upiId || "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-ccf-muted">Payee Name</span>
                  <span className="font-semibold text-ccf-offwhite">
                    {event.payeeName || "None"}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-ccf-muted">
                This event is free to register. No fee collection required.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Canonical EventContent Section (Correction 6: Exact 5 model fields) */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <FileText className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Event Documentation & Content (`event_content`)</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            The 5 canonical documentation fields associated with this event record.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5 md:col-span-2">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Overview & Description (`description_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.descriptionRich || "No description provided."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Competition Rules (`rules_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.rulesRich || "No rules provided."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Participant Instructions (`instructions_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.instructionsRich || "No instructions provided."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Eligibility Criteria (`eligibility_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.eligibilityRich || "No specific eligibility notes."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Administrative Notes (`notes_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.notesRich || "No administrative notes."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Event Media & Cover Management Card */}
      {(() => {
        const visibleMedia = mediaList.filter((m) => m.visibility);
        const coverMedia = visibleMedia.sort((a, b) => a.displayOrder - b.displayOrder)[0];

        return (
          <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
            <CardHeader className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
                  <span>Event Media & Cover Image</span>
                </CardTitle>
                <Button asChild size="sm" variant="outline" className="text-xs border-border text-ccf-muted hover:text-ccf-offwhite">
                  <Link href={`/admin/media?eventId=${event.id}`}>
                    <span>Manage in Media Library</span>
                  </Link>
                </Button>
              </div>
              <CardDescription className="text-xs text-ccf-muted">
                The visible media item with lowest order is automatically used as the event cover poster on public pages.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 pt-2 space-y-4">
              {coverFeedback && (
                <div
                  className={`p-3 rounded-md flex items-center gap-2 text-xs ${
                    coverFeedback.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {coverFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{coverFeedback.message}</span>
                </div>
              )}

              {mediaList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaList.map((item) => {
                    const isCover = coverMedia?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 bg-ccf-surface-sunken flex flex-col space-y-2.5 transition-colors ${
                          isCover ? "border-ccf-gold/60 ring-1 ring-ccf-gold/40" : "border-border/60"
                        }`}
                      >
                        <div className="relative aspect-video rounded overflow-hidden bg-black/40 border border-border/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/media/${item.objectKey}`}
                            alt={item.altText || "Event media"}
                            className="w-full h-full object-cover"
                          />
                          {isCover && (
                            <div className="absolute top-1.5 left-1.5 bg-ccf-gold text-ccf-navy text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                              COVER
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-xs flex-1">
                          <p className="text-ccf-offwhite font-medium truncate" title={item.altText}>
                            {item.altText || item.objectKey}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-ccf-muted">
                            <span>Order: #{item.displayOrder}</span>
                            <span className={item.visibility ? "text-emerald-400" : "text-amber-400"}>
                              {item.visibility ? "Visible" : "Hidden"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={togglingVisibilityId === item.id}
                            onClick={() => handleToggleVisibility(item)}
                            className="flex-1 text-[11px] h-7 px-2 border-border/80 text-ccf-offwhite hover:bg-ccf-surface-elevated"
                            title={item.visibility ? "Hide from public view" : "Make visible to public"}
                          >
                            {togglingVisibilityId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : item.visibility ? (
                              <EyeOff className="h-3 w-3 mr-1 text-amber-400" />
                            ) : (
                              <Eye className="h-3 w-3 mr-1 text-emerald-400" />
                            )}
                            <span>{item.visibility ? "Hide" : "Show"}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setMediaToDelete(item)}
                            className="text-[11px] h-7 px-2 border-border/80 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete media"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {!isCover && item.visibility && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={settingCoverId === item.id}
                            onClick={() => handleSetCover(item.id)}
                            className="w-full text-xs h-7 border-border text-ccf-gold hover:bg-ccf-gold/10"
                          >
                            {settingCoverId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            <span>Set as Cover</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center rounded-lg border border-dashed border-border/60 text-xs text-ccf-muted space-y-2">
                  <p>No media items associated with this event yet.</p>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href={`/admin/media?eventId=${event.id}`}>
                      <span>Upload Event Media</span>
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>

            {/* Media Deletion Confirmation Dialog */}
            <AlertDialog open={!!mediaToDelete} onOpenChange={(open) => !open && setMediaToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Media Asset</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete this media asset? This action will remove the asset from cloud storage and the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingMedia}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => mediaToDelete && handleDeleteMedia(mediaToDelete)}
                    disabled={isDeletingMedia}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {isDeletingMedia ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    <span>Delete Asset</span>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        );
      })()}

      {/* System Identifiers & Timestamps */}
      <Card className="border-border/60 bg-ccf-surface-sunken p-4 shadow-sm text-xs text-ccf-muted">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-ccf-muted" aria-hidden="true" />
            <span>Database UUID:</span>
            <code className="font-mono text-ccf-offwhite">{event.id}</code>
          </div>
          <div className="flex items-center gap-4">
            <span>Created: {formatDateDisplay(event.createdAt)}</span>
            <span>Updated: {formatDateDisplay(event.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
