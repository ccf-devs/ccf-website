"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Loader2, AlertTriangle, UserPlus, UserCheck, Image as ImageIcon } from "lucide-react";

export interface MemberDepartmentInfo {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface MemberItem {
  id: string;
  name: string;
  position: string | null;
  departmentId: string;
  photoMediaId: string | null;
  bio: string | null;
  socialUrl: string | null;
  visibility: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  department: MemberDepartmentInfo;
  photo?: {
    id: string;
    objectKey: string;
    altText: string | null;
  } | null;
}

interface MemberDialogProps {
  member: MemberItem | null;
  departments: MemberDepartmentInfo[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (member: MemberItem) => void;
}

export function MemberDialog({
  member,
  departments,
  isOpen,
  onClose,
  onSaved,
}: MemberDialogProps) {
  if (!isOpen) return null;

  return (
    <MemberDialogInner
      key={member?.id || "new-member"}
      member={member}
      departments={departments}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function MemberDialogInner({
  member,
  departments,
  onClose,
  onSaved,
}: {
  member: MemberItem | null;
  departments: MemberDepartmentInfo[];
  onClose: () => void;
  onSaved: (member: MemberItem) => void;
}) {
  const isEditing = !!member;

  const [name, setName] = useState(member?.name || "");
  const [position, setPosition] = useState(member?.position || "");
  const [departmentId, setDepartmentId] = useState(
    member?.departmentId || departments.find((d) => d.active)?.id || ""
  );
  const [displayOrder, setDisplayOrder] = useState(member?.displayOrder ?? 0);
  const [visibility, setVisibility] = useState(member?.visibility ?? true);
  const [bio, setBio] = useState(member?.bio || "");
  const [socialUrl, setSocialUrl] = useState(member?.socialUrl || "");
  const [photoMediaId, setPhotoMediaId] = useState<string | null>(
    member?.photoMediaId || member?.photo?.id || null
  );
  const [selectedPhoto, setSelectedPhoto] = useState<{
    id: string;
    objectKey: string;
    altText: string | null;
  } | null>(member?.photo || null);
  const [availableMedia, setAvailableMedia] = useState<
    Array<{
      id: string;
      objectKey: string;
      altText: string | null;
      mimeType: string;
      visibility: boolean;
      eventId: string | null;
      event?: { name: string } | null;
    }>
  >([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialPhotoId = member?.photoMediaId || member?.photo?.id || null;

  // Load existing media library assets for photo selection once on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/media")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data.media)) {
          const images = data.media.filter(
            (m: any) => m.mimeType && m.mimeType.startsWith("image/")
          );
          setAvailableMedia(images);

          // Resolve photo preview if initial photoMediaId exists
          if (initialPhotoId) {
            const match = images.find((m: any) => m.id === initialPhotoId);
            if (match) {
              setSelectedPhoto({
                id: match.id,
                objectKey: match.objectKey,
                altText: match.altText,
              });
            }
          }
        }
      })
      .catch(() => {
        // Media load optional / handled gracefully
      })
      .finally(() => {
        if (isMounted) setLoadingMedia(false);
      });
    return () => {
      isMounted = false;
    };
  }, [initialPhotoId]);

  const handleSelectPhoto = (mediaId: string) => {
    if (!mediaId) {
      setPhotoMediaId(null);
      setSelectedPhoto(null);
      return;
    }
    setPhotoMediaId(mediaId);
    const found = availableMedia.find((m) => m.id === mediaId);
    if (found) {
      setSelectedPhoto({
        id: found.id,
        objectKey: found.objectKey,
        altText: found.altText,
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoMediaId(null);
    setSelectedPhoto(null);
  };

  // Filter allowed departments based on Rule 4:
  // - New members: ONLY active departments allowed.
  // - Editing: current department is always allowed, but any OTHER department must be active.
  const eligibleDepartments = departments.filter((dept) => {
    if (!isEditing) return dept.active;
    return dept.active || dept.id === member?.departmentId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Member name is required.");
      return;
    }
    if (!departmentId) {
      setError("Please select a department.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/admin/members/${member.id}`
        : "/api/admin/members";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        name: name.trim(),
        position: position.trim() || null,
        departmentId,
        displayOrder: Number(displayOrder) || 0,
        visibility,
        bio: bio.trim() || null,
        socialUrl: socialUrl.trim() || null,
        photoMediaId: photoMediaId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save member.");
      }

      onSaved(data.member);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save member.";
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
      aria-labelledby="member-dialog-title"
    >
      <Card className="bg-ccf-surface border-border/60 w-full max-w-lg shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
              {isEditing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            </div>
            <div>
              <h3 id="member-dialog-title" className="text-base font-semibold text-ccf-offwhite">
                {isEditing ? "Edit Member" : "Add Executive Member"}
              </h3>
              <p className="text-xs text-ccf-muted">
                {isEditing ? `Updating ${member.name}` : "Create a new CCF team member"}
              </p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="member-name" className="text-xs font-semibold text-ccf-offwhite">
              Full Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="member-name"
              type="text"
              required
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Remi Kayalvizhi"
              className="h-9 bg-ccf-surface-sunken border-border/60 text-xs text-ccf-offwhite focus:border-ccf-gold"
            />
          </div>

          {/* Position / Role Title */}
          <div className="space-y-1.5">
            <Label htmlFor="member-position" className="text-xs font-semibold text-ccf-offwhite">
              Position / Role Title
            </Label>
            <Input
              id="member-position"
              type="text"
              maxLength={150}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., Director, Joint Director, Executive Member"
              className="h-9 bg-ccf-surface-sunken border-border/60 text-xs text-ccf-offwhite focus:border-ccf-gold"
            />
          </div>

          {/* Department & Display Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="member-dept" className="text-xs font-semibold text-ccf-offwhite">
                Department <span className="text-red-400">*</span>
              </Label>
              <select
                id="member-dept"
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-9 rounded-md border border-border/60 bg-ccf-surface-sunken px-3 text-xs text-ccf-offwhite focus:border-ccf-gold focus:outline-none"
              >
                <option value="" disabled>
                  Select Department
                </option>
                {eligibleDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} {!dept.active ? "(Inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member-order" className="text-xs font-semibold text-ccf-offwhite">
                Display Order / Hierarchy Rank
              </Label>
              <Input
                id="member-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="h-9 bg-ccf-surface-sunken border-border/60 text-xs text-ccf-offwhite focus:border-ccf-gold"
              />
              <span className="text-[10px] text-ccf-muted block">Lower numbers sort first</span>
            </div>
          </div>

          {/* Profile Photo Association */}
          <div className="space-y-2.5 rounded-lg border border-border/60 bg-ccf-surface-sunken p-3.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="member-photo" className="text-xs font-semibold text-ccf-offwhite flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-ccf-gold" />
                <span>Profile Photo</span>
              </Label>
              {selectedPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors font-medium"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {selectedPhoto && (
              <div className="flex items-center gap-3 p-2.5 rounded-md bg-ccf-surface border border-border/40">
                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-ccf-gold/40 bg-ccf-surface-elevated shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${selectedPhoto.objectKey}`}
                    alt={selectedPhoto.altText || "Selected member photo preview"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ccf-offwhite truncate">
                    {selectedPhoto.altText || "Member Photo"}
                  </p>
                  <p className="text-[10px] text-ccf-muted font-mono truncate">
                    {selectedPhoto.objectKey}
                  </p>
                </div>
              </div>
            )}

            <select
              id="member-photo"
              value={photoMediaId || ""}
              onChange={(e) => handleSelectPhoto(e.target.value)}
              disabled={loadingMedia}
              className="w-full h-9 rounded-md border border-border/60 bg-ccf-surface px-3 text-xs text-ccf-offwhite focus:border-ccf-gold focus:outline-none"
            >
              <option value="">
                {loadingMedia
                  ? "Loading media assets..."
                  : "No Photo (Display Initials Monogram)"}
              </option>
              {availableMedia.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.altText ? `${m.altText} — ${m.objectKey}` : m.objectKey}
                  {m.event ? ` [Event: ${m.event.name}]` : " [General Asset]"}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-ccf-muted">
              Select an image from the CCF media library. If none is selected, the directory displays the member&apos;s monogram initials.
            </p>
          </div>

          {/* Social URL */}
          <div className="space-y-1.5">
            <Label htmlFor="member-social" className="text-xs font-semibold text-ccf-offwhite">
              LinkedIn or Profile URL
            </Label>
            <Input
              id="member-social"
              type="url"
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="h-9 bg-ccf-surface-sunken border-border/60 text-xs text-ccf-offwhite focus:border-ccf-gold"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="member-bio" className="text-xs font-semibold text-ccf-offwhite">
              Short Biography
            </Label>
            <textarea
              id="member-bio"
              rows={3}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief description of member responsibilities..."
              className="w-full rounded-md border border-border/60 bg-ccf-surface-sunken p-3 text-xs text-ccf-offwhite placeholder:text-ccf-muted/60 focus:border-ccf-gold focus:outline-none"
            />
          </div>

          {/* Active / Visibility Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-ccf-surface-sunken p-3.5">
            <div className="space-y-0.5">
              <Label htmlFor="member-visibility" className="text-xs font-semibold text-ccf-offwhite cursor-pointer">
                Active in Directory
              </Label>
              <p className="text-[11px] text-ccf-muted">
                Controls whether member is visible in public directory listings.
              </p>
            </div>
            <input
              id="member-visibility"
              type="checkbox"
              checked={visibility}
              onChange={(e) => setVisibility(e.target.checked)}
              className="h-4 w-4 rounded border-border/60 text-ccf-gold focus:ring-ccf-gold cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
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
                <span>{isEditing ? "Save Changes" : "Create Member"}</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
