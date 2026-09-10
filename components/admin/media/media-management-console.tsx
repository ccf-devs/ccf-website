"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon,
  UploadCloud,
  Search,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  List,
  Filter,
  ExternalLink,
} from "lucide-react";

export interface MediaItem {
  id: string;
  eventId: string | null;
  objectKey: string;
  mimeType: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  visibility: boolean;
  displayOrder: number;
  createdAt: string;
  event?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count?: {
    members: number;
  };
}

export interface MediaEventOption {
  id: string;
  name: string;
  slug: string;
}

export interface MediaMetrics {
  total: number;
  visible: number;
  hidden: number;
  eventMedia: number;
}

interface MediaManagementConsoleProps {
  initialMedia: MediaItem[];
  events: MediaEventOption[];
  initialMetrics: MediaMetrics;
}

export function MediaManagementConsole({
  initialMedia,
  events,
  initialMetrics,
}: MediaManagementConsoleProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>(initialMedia);
  const [metrics, setMetrics] = useState<MediaMetrics>(initialMetrics);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [selectedVisibility, setSelectedVisibility] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered media calculation
  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) => {
      // Event filter
      if (selectedEvent === "GENERAL" && item.eventId !== null) {
        return false;
      }
      if (
        selectedEvent !== "ALL" &&
        selectedEvent !== "GENERAL" &&
        item.eventId !== selectedEvent
      ) {
        return false;
      }

      // Visibility filter
      if (selectedVisibility === "visible" && !item.visibility) {
        return false;
      }
      if (selectedVisibility === "hidden" && item.visibility) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const alt = (item.altText || "").toLowerCase();
        const key = item.objectKey.toLowerCase();
        const evName = (item.event?.name || "").toLowerCase();
        if (!alt.includes(q) && !key.includes(q) && !evName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [mediaList, selectedEvent, selectedVisibility, searchQuery]);

  // Quick visibility toggle
  const handleToggleVisibility = async (media: MediaItem) => {
    setActionLoadingId(media.id);
    const targetVisibility = !media.visibility;

    try {
      const res = await fetch(`/api/admin/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: targetVisibility }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update visibility.");
      }

      // Update state
      setMediaList((prev) =>
        prev.map((m) => (m.id === media.id ? { ...m, visibility: targetVisibility } : m))
      );
      setMetrics((prev) => ({
        ...prev,
        visible: targetVisibility ? prev.visible + 1 : prev.visible - 1,
        hidden: targetVisibility ? prev.hidden - 1 : prev.hidden + 1,
      }));

      showToast(
        "success",
        `Media is now ${targetVisibility ? "publicly visible" : "hidden"}.`
      );
    } catch (err: any) {
      showToast("error", err.message || "Failed to update visibility.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle uploaded media callback
  const handleMediaUploaded = (newMedia: MediaItem) => {
    setMediaList((prev) => [newMedia, ...prev]);
    setMetrics((prev) => ({
      total: prev.total + 1,
      visible: newMedia.visibility ? prev.visible + 1 : prev.visible,
      hidden: !newMedia.visibility ? prev.hidden + 1 : prev.hidden,
      eventMedia: newMedia.eventId ? prev.eventMedia + 1 : prev.eventMedia,
    }));
    setIsUploadOpen(false);
    showToast("success", "Media asset uploaded successfully.");
  };

  // Handle edited media callback
  const handleMediaUpdated = (updated: MediaItem) => {
    const old = mediaList.find((m) => m.id === updated.id);
    setMediaList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

    if (old && old.visibility !== updated.visibility) {
      setMetrics((prev) => ({
        ...prev,
        visible: updated.visibility ? prev.visible + 1 : prev.visible - 1,
        hidden: updated.visibility ? prev.hidden - 1 : prev.hidden + 1,
      }));
    }
    if (old && Boolean(old.eventId) !== Boolean(updated.eventId)) {
      setMetrics((prev) => ({
        ...prev,
        eventMedia: updated.eventId ? prev.eventMedia + 1 : prev.eventMedia - 1,
      }));
    }

    setEditingMedia(null);
    showToast("success", "Media metadata updated successfully.");
  };

  // Handle deleted media callback
  const handleMediaDeleted = (deletedId: string) => {
    const deleted = mediaList.find((m) => m.id === deletedId);
    setMediaList((prev) => prev.filter((m) => m.id !== deletedId));

    if (deleted) {
      setMetrics((prev) => ({
        total: Math.max(0, prev.total - 1),
        visible: deleted.visibility ? Math.max(0, prev.visible - 1) : prev.visible,
        hidden: !deleted.visibility ? Math.max(0, prev.hidden - 1) : prev.hidden,
        eventMedia: deleted.eventId ? Math.max(0, prev.eventMedia - 1) : prev.eventMedia,
      }));
    }

    setDeletingMedia(null);
    showToast("success", "Media asset permanently removed.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-md transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/40 border-red-500/40 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs hover:opacity-80 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Total Assets
            </span>
            <ImageIcon className="w-4 h-4 text-ccf-gold" />
          </div>
          <div className="text-2xl font-bold text-ccf-offwhite tracking-tight">
            {metrics.total}
          </div>
          <p className="text-[11px] text-ccf-muted">In B2 storage library</p>
        </Card>

        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Visible
            </span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {metrics.visible}
          </div>
          <p className="text-[11px] text-ccf-muted">Publicly delivered via API</p>
        </Card>

        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Hidden
            </span>
            <EyeOff className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {metrics.hidden}
          </div>
          <p className="text-[11px] text-ccf-muted">Draft or hidden from public</p>
        </Card>

        <Card className="bg-ccf-surface border-border/60 p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ccf-muted">
              Event Media
            </span>
            <Calendar className="w-4 h-4 text-ccf-gold" />
          </div>
          <div className="text-2xl font-bold text-ccf-gold tracking-tight">
            {metrics.eventMedia}
          </div>
          <p className="text-[11px] text-ccf-muted">Linked to official symposiums</p>
        </Card>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-ccf-surface border border-border/60 rounded-xl p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ccf-muted" />
            <Input
              type="text"
              placeholder="Search alt text or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ccf-muted hover:text-ccf-offwhite"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Filter */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="ALL">All Events &amp; Gallery</option>
            <option value="GENERAL">General Assets (No Event)</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                Event: {ev.name}
              </option>
            ))}
          </select>

          {/* Visibility Filter */}
          <select
            value={selectedVisibility}
            onChange={(e) => setSelectedVisibility(e.target.value)}
            className="bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="all">All Visibility</option>
            <option value="visible">Visible Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>

        {/* View Mode & Upload Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="border border-border/60 rounded-lg p-0.5 flex bg-ccf-surface-sunken">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === "grid"
                  ? "bg-ccf-surface text-ccf-gold shadow-sm font-semibold"
                  : "text-ccf-muted hover:text-ccf-offwhite"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === "table"
                  ? "bg-ccf-surface text-ccf-gold shadow-sm font-semibold"
                  : "text-ccf-muted hover:text-ccf-offwhite"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => setIsUploadOpen(true)}
            variant="gold"
            size="sm"
            className="h-9 px-4 text-xs font-semibold"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" />
            <span>Upload Media</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area: Grid, Table, or Empty State */}
      {mediaList.length === 0 ? (
        <Card className="bg-ccf-surface border-border/60 p-12 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-ccf-gold/10 border border-ccf-gold/30 text-ccf-gold mx-auto flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-ccf-offwhite">No Media Assets Yet</h3>
            <p className="text-xs text-ccf-muted max-w-sm mx-auto">
              Your production media library is empty. Upload student executive photos, event banners, and gallery assets to Backblaze B2.
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={() => setIsUploadOpen(true)}
              variant="gold"
              size="sm"
              className="text-xs font-semibold px-4"
            >
              <UploadCloud className="w-4 h-4 mr-1.5" />
              <span>Upload First Asset</span>
            </Button>
          </div>
        </Card>
      ) : filteredMedia.length === 0 ? (
        <Card className="bg-ccf-surface border-border/60 p-8 text-center shadow-sm space-y-3">
          <Filter className="w-8 h-8 text-ccf-muted mx-auto" />
          <h3 className="text-sm font-semibold text-ccf-offwhite">
            No matching media assets
          </h3>
          <p className="text-xs text-ccf-muted max-w-xs mx-auto">
            No media records match your current search query or active filter settings.
          </p>
          <div className="pt-1">
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedEvent("ALL");
                setSelectedVisibility("all");
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid Representation */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <Card
              key={item.id}
              className="bg-ccf-surface border-border/60 overflow-hidden flex flex-col justify-between shadow-sm group hover:border-ccf-gold/40 transition-colors"
            >
              {/* Media Thumbnail Container */}
              <div className="relative aspect-video w-full bg-ccf-surface-sunken overflow-hidden border-b border-border/40 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${item.objectKey}`}
                  alt={item.altText || "Media preview"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Status Badges Overlay */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider backdrop-blur-md ${
                      item.visibility
                        ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                        : "bg-amber-950/80 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {item.visibility ? "Visible" : "Hidden"}
                  </Badge>
                  {item.displayOrder > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-black/60 border-white/20 text-white text-[10px] px-1.5 py-0.5"
                    >
                      #{item.displayOrder}
                    </Badge>
                  )}
                </div>

                {/* Member Usage Indicator */}
                {item._count && item._count.members > 0 && (
                  <div className="absolute bottom-2 right-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-950/80 border-blue-500/40 text-blue-300 text-[10px] px-2 py-0.5"
                    >
                      {item._count.members} {item._count.members === 1 ? "member" : "members"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Card Meta Details */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1 text-[11px] text-ccf-gold font-medium">
                    <span className="truncate">
                      {item.event ? item.event.name : "General Asset"}
                    </span>
                    <span className="text-[10px] text-ccf-muted uppercase font-mono">
                      {item.mimeType.split("/")[1] || "img"}
                    </span>
                  </div>
                  <p className="text-xs text-ccf-offwhite font-medium line-clamp-2 leading-snug">
                    {item.altText || (
                      <span className="text-ccf-muted italic">No description provided</span>
                    )}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    onClick={() => handleToggleVisibility(item)}
                    disabled={actionLoadingId === item.id}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-ccf-muted hover:text-ccf-offwhite"
                    title={item.visibility ? "Hide media" : "Make visible"}
                  >
                    {actionLoadingId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : item.visibility ? (
                      <EyeOff className="w-3.5 h-3.5 mr-1 text-amber-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    )}
                    <span>{item.visibility ? "Hide" : "Show"}</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => setEditingMedia(item)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite"
                      title="Edit metadata"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      onClick={() => setDeletingMedia(item)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-ccf-muted hover:text-red-400"
                      title="Delete asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table Representation */
        <Card className="bg-ccf-surface border-border/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-ccf-surface-sunken text-ccf-muted font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3 w-16">Preview</th>
                  <th className="p-3">Alt Text &amp; Details</th>
                  <th className="p-3">Event Scope</th>
                  <th className="p-3 w-20">Order</th>
                  <th className="p-3 w-28">Visibility</th>
                  <th className="p-3 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-ccf-offwhite">
                {filteredMedia.map((item) => (
                  <tr key={item.id} className="hover:bg-ccf-surface-elevated/40 transition-colors">
                    <td className="p-3">
                      <div className="w-12 h-12 rounded bg-ccf-surface-sunken overflow-hidden border border-border/60 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${item.objectKey}`}
                          alt={item.altText || "thumbnail"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </td>
                    <td className="p-3 space-y-0.5 max-w-xs">
                      <p className="font-medium truncate text-ccf-offwhite">
                        {item.altText || <span className="text-ccf-muted italic">No alt text</span>}
                      </p>
                      <p className="font-mono text-[10px] text-ccf-muted truncate">
                        {item.objectKey}
                      </p>
                    </td>
                    <td className="p-3">
                      {item.event ? (
                        <span className="inline-flex items-center text-ccf-gold">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{item.event.name}</span>
                        </span>
                      ) : (
                        <span className="text-ccf-muted">General Asset</span>
                      )}
                    </td>
                    <td className="p-3 font-mono">{item.displayOrder}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleVisibility(item)}
                        disabled={actionLoadingId === item.id}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
                          item.visibility
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950"
                            : "bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-950"
                        }`}
                      >
                        {actionLoadingId === item.id ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : item.visibility ? (
                          <Eye className="w-2.5 h-2.5" />
                        ) : (
                          <EyeOff className="w-2.5 h-2.5" />
                        )}
                        <span>{item.visibility ? "Visible" : "Hidden"}</span>
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => setEditingMedia(item)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => setDeletingMedia(item)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-ccf-muted hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Upload Dialog Modal */}
      <UploadDialogInner
        isOpen={isUploadOpen}
        events={events}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={handleMediaUploaded}
      />

      {/* Edit Metadata Modal */}
      {editingMedia && (
        <EditDialogInner
          key={editingMedia.id}
          media={editingMedia}
          events={events}
          onClose={() => setEditingMedia(null)}
          onUpdated={handleMediaUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMedia && (
        <DeleteConfirmModalInner
          key={deletingMedia.id}
          media={deletingMedia}
          onClose={() => setDeletingMedia(null)}
          onDeleted={handleMediaDeleted}
        />
      )}
    </div>
  );
}

/**
 * Upload Dialog Modal Inner Component
 */
interface UploadDialogInnerProps {
  isOpen: boolean;
  events: MediaEventOption[];
  onClose: () => void;
  onUploaded: (media: MediaItem) => void;
}

function UploadDialogInner({
  isOpen,
  events,
  onClose,
  onUploaded,
}: UploadDialogInnerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [eventId, setEventId] = useState("");
  const [visibility, setVisibility] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("0");

  const [uploadState, setUploadState] = useState<
    "idle" | "preparing" | "uploading" | "processing" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Please select an image file to upload.");
      return;
    }

    setErrorMessage(null);
    setUploadState("preparing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("altText", altText.trim());
      formData.append("eventId", eventId || "");
      formData.append("visibility", visibility ? "true" : "false");
      formData.append("displayOrder", displayOrder);

      setUploadState("uploading");

      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      setUploadState("processing");

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed.");
      }

      onUploaded(data.media);
    } catch (err: any) {
      setUploadState("error");
      setErrorMessage(err.message || "Failed to upload media.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-ccf-surface border-border/80 p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-ccf-offwhite flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-ccf-gold" />
              <span>Upload Production Media</span>
            </h3>
            <p className="text-xs text-ccf-muted">
              Securely stream to Backblaze B2 and register database metadata.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploadState !== "idle" && uploadState !== "error"}
            className="text-ccf-muted hover:text-ccf-offwhite p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/40 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone / File Picker */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
              file
                ? "border-emerald-500/40 bg-emerald-950/10"
                : "border-border/60 hover:border-ccf-gold/40 bg-ccf-surface-sunken"
            }`}
            onClick={() => document.getElementById("media-file-input")?.click()}
          >
            <input
              id="media-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {previewUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-36 mx-auto rounded object-contain border border-border/40"
                />
                <p className="text-xs font-medium text-emerald-400 truncate max-w-xs mx-auto">
                  {file?.name} ({(file?.size! / (1024 * 1024)).toFixed(2)} MB)
                </p>
                <p className="text-[11px] text-ccf-muted">Click to select a different file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-ccf-gold/10 text-ccf-gold mx-auto flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-ccf-offwhite">
                    Click to browse or drag and drop image
                  </p>
                  <p className="text-[11px] text-ccf-muted">
                    Supports JPEG, PNG, WEBP, GIF (up to 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alt Text / Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="upload-alt-text" className="text-ccf-muted font-medium">
                Alt Text / Accessible Description
              </Label>
              <span className="text-[10px] text-ccf-muted font-mono">
                {altText.length}/300
              </span>
            </div>
            <Input
              id="upload-alt-text"
              type="text"
              maxLength={300}
              placeholder="e.g. Magnora '26 Keynote Opening Ceremony"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite"
            />
          </div>

          {/* Associated Event */}
          <div className="space-y-1.5">
            <Label htmlFor="upload-event-id" className="text-xs text-ccf-muted font-medium">
              Associated Event Scope
            </Label>
            <select
              id="upload-event-id"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
            >
              <option value="">General Asset (Gallery / Site / Member Photo)</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility & Order Controls */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="upload-order" className="text-xs text-ccf-muted font-medium">
                Display Order
              </Label>
              <Input
                id="upload-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite font-mono"
              />
            </div>

            <div className="flex flex-col justify-center space-y-1 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibility}
                  onChange={(e) => setVisibility(e.target.checked)}
                  className="rounded border-border/60 text-ccf-gold focus:ring-ccf-gold w-4 h-4 bg-ccf-surface-sunken"
                />
                <span className="text-xs text-ccf-offwhite font-medium">
                  Publicly Visible
                </span>
              </label>
              <p className="text-[10px] text-ccf-muted">
                Available to public media delivery route
              </p>
            </div>
          </div>

          {/* Actions & Upload Progress Status */}
          <div className="border-t border-border/40 pt-4 flex items-center justify-between">
            <div>
              {uploadState === "preparing" && (
                <span className="text-xs text-ccf-muted inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ccf-gold" />
                  <span>Preparing binary...</span>
                </span>
              )}
              {uploadState === "uploading" && (
                <span className="text-xs text-ccf-gold inline-flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Backblaze B2...</span>
                </span>
              )}
              {uploadState === "processing" && (
                <span className="text-xs text-emerald-400 inline-flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering metadata...</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={onClose}
                disabled={uploadState !== "idle" && uploadState !== "error"}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!file || (uploadState !== "idle" && uploadState !== "error")}
                variant="gold"
                size="sm"
                className="text-xs h-8 font-semibold"
              >
                {uploadState !== "idle" && uploadState !== "error" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Upload</span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

/**
 * Edit Dialog Modal Inner Component
 */
interface EditDialogInnerProps {
  media: MediaItem;
  events: MediaEventOption[];
  onClose: () => void;
  onUpdated: (media: MediaItem) => void;
}

function EditDialogInner({
  media,
  events,
  onClose,
  onUpdated,
}: EditDialogInnerProps) {
  const [altText, setAltText] = useState(media.altText || "");
  const [eventId, setEventId] = useState(media.eventId || "");
  const [visibility, setVisibility] = useState(media.visibility);
  const [displayOrder, setDisplayOrder] = useState(media.displayOrder.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altText: altText.trim() || null,
          eventId: eventId || null,
          visibility,
          displayOrder: parseInt(displayOrder, 10) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update media.");
      }

      onUpdated(data.media);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update media.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-ccf-surface border-border/80 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-base font-bold text-ccf-offwhite flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-ccf-gold" />
            <span>Edit Media Metadata</span>
          </h3>
          <button onClick={onClose} className="text-ccf-muted hover:text-ccf-offwhite p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/40 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Thumbnail preview */}
        <div className="relative aspect-video rounded bg-ccf-surface-sunken overflow-hidden border border-border/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/${media.objectKey}`}
            alt={media.altText || "Preview"}
            className="w-full h-full object-cover"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="edit-alt-text" className="text-ccf-muted">
                Alt Text / Description
              </Label>
              <span className="text-[10px] text-ccf-muted font-mono">{altText.length}/300</span>
            </div>
            <Input
              id="edit-alt-text"
              type="text"
              maxLength={300}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-event-id" className="text-xs text-ccf-muted">
              Associated Event
            </Label>
            <select
              id="edit-event-id"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-ccf-surface-sunken border border-border/60 text-xs text-ccf-offwhite rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-ccf-gold"
            >
              <option value="">General Asset (No Event)</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-order" className="text-xs text-ccf-muted">
                Display Order
              </Label>
              <Input
                id="edit-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="bg-ccf-surface-sunken border-border/60 text-xs h-9 text-ccf-offwhite font-mono"
              />
            </div>

            <div className="flex flex-col justify-center space-y-1 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibility}
                  onChange={(e) => setVisibility(e.target.checked)}
                  className="rounded border-border/60 text-ccf-gold focus:ring-ccf-gold w-4 h-4 bg-ccf-surface-sunken"
                />
                <span className="text-xs text-ccf-offwhite font-medium">
                  Publicly Visible
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="gold"
              size="sm"
              className="text-xs h-8 font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
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

/**
 * Delete Confirmation Modal Inner Component
 */
interface DeleteConfirmModalInnerProps {
  media: MediaItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteConfirmModalInner({
  media,
  onClose,
  onDeleted,
}: DeleteConfirmModalInnerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/media/${media.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete media asset.");
      }

      onDeleted(media.id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete media asset.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-ccf-surface border-red-500/30 p-6 space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-ccf-offwhite">
              Delete Media Asset?
            </h3>
            <p className="text-xs text-ccf-muted leading-relaxed">
              This action permanently removes the asset from Backblaze B2 private object storage and the PostgreSQL database.
            </p>
          </div>
        </div>

        {media._count && media._count.members > 0 && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Warning: This photo is currently referenced by {media._count.members}{" "}
              {media._count.members === 1 ? "student executive member" : "student executive members"}.
              Their profile photo will revert to default initials.
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/40 text-red-300 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            variant="destructive"
            size="sm"
            className="text-xs h-8 font-semibold bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Permanent Deletion</span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
