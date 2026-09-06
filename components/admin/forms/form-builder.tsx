"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EventFieldDomain,
  FormVersionDomain,
  FormVersionStatus,
  toEventFieldDomain,
} from "@/lib/forms/types";
import { CCF_SYSTEM_FIELD_PRESETS } from "@/lib/forms/system-fields";
import { FieldCard } from "./field-card";
import { FieldEditorDialog } from "./field-editor-dialog";
import { FormPreview } from "./form-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Send,
  Copy,
  Trash2,
  Lock,
  Sparkles,
  Eye,
  Layers,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormBuilderProps {
  eventId: string;
  eventName: string;
  activeFormVersionId?: string | null;
  initialVersions: FormVersionDomain[];
}

export function FormBuilder({
  eventId,
  eventName,
  activeFormVersionId,
  initialVersions,
}: FormBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [versions, setVersions] = useState<FormVersionDomain[]>(initialVersions);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    // Default to active version, or latest draft, or first version
    activeFormVersionId ||
      initialVersions.find((v) => v.status === FormVersionStatus.DRAFT)?.id ||
      initialVersions[0]?.id ||
      ""
  );

  const [fields, setFields] = useState<EventFieldDomain[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "preview">("fields");

  // Field Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<EventFieldDomain | null>(null);

  // Modals state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || null;
  const isDraft = selectedVersion?.status === FormVersionStatus.DRAFT;
  const isPublished = selectedVersion?.status === FormVersionStatus.PUBLISHED;
  const isClosed = selectedVersion?.status === FormVersionStatus.CLOSED;
  const isActivePublished = selectedVersion?.id === activeFormVersionId;

  // Load fields whenever selectedVersionId changes
  useEffect(() => {
    if (!selectedVersionId) {
      return;
    }

    let isMounted = true;
    async function loadFields() {
      setIsLoadingFields(true);
      try {
        const res = await fetch(`/api/admin/events/${eventId}/forms/${selectedVersionId}`);
        if (!res.ok) {
          throw new Error("Failed to load form version fields");
        }
        const data = await res.json();
        if (isMounted) {
          const mappedFields = (data.fields || []).map(toEventFieldDomain);
          setFields(mappedFields);
        }
      } catch (err: any) {
        if (isMounted) {
          showFeedback("error", err.message || "Failed to load fields");
        }
      } finally {
        if (isMounted) {
          setIsLoadingFields(false);
        }
      }
    }

    loadFields();
    return () => {
      isMounted = false;
    };
  }, [eventId, selectedVersionId]);

  // Create a brand new Draft version
  const handleCreateVersion = async (sourceVersionId?: string) => {
    setIsCloning(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceVersionId: sourceVersionId || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create new form version");
      }

      const newVersion = await res.json();
      setVersions((prev) => [newVersion, ...prev]);
      setSelectedVersionId(newVersion.id);
      showFeedback(
        "success",
        `Created Draft Version ${newVersion.versionNumber}${
          sourceVersionId ? " cloned from prior version" : ""
        }`
      );
      router.refresh();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to create version");
    } finally {
      setIsCloning(false);
    }
  };

  // Seed default CCF standard fields into an empty draft version
  const handleSeedStandardFields = async () => {
    if (!selectedVersionId || !isDraft) return;
    setIsSeeding(true);

    try {
      // Standard recommended preset order
      const presetsToLoad = [
        "participant_type",
        "participant_name",
        "email_address",
        "phone_number",
        "crescent_rrn",
        "college_name",
        "external_roll_number",
        "academic_department",
        "academic_year",
        "academic_level",
      ];

      for (const presetKey of presetsToLoad) {
        const preset = CCF_SYSTEM_FIELD_PRESETS.find((p) => p.key === presetKey);
        if (!preset) continue;

        // Skip if field with this key already exists
        if (fields.some((f) => f.key === preset.key)) continue;

        const payload = {
          key: preset.key,
          label: preset.label,
          type: preset.type,
          fieldScope: preset.fieldScope,
          required: preset.required,
          config: {
            placeholder: preset.config?.placeholder,
            helpText: preset.config?.helpText,
            options: preset.config?.options,
            isSystem: true,
          },
          conditionalLogic: preset.conditionalLogic,
        };

        const res = await fetch(
          `/api/admin/events/${eventId}/forms/${selectedVersionId}/fields`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Failed to seed field:", preset.key, errData);
        }
      }

      // Reload fields
      const res = await fetch(`/api/admin/events/${eventId}/forms/${selectedVersionId}`);
      if (res.ok) {
        const data = await res.json();
        setFields((data.fields || []).map(toEventFieldDomain));
      }

      showFeedback("success", "Loaded CCF Standard Registration fields successfully");
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to load standard fields");
    } finally {
      setIsSeeding(false);
    }
  };

  // Save (create or update) a field
  const handleSaveField = async (fieldData: any) => {
    if (!selectedVersionId) return;

    if (editingField) {
      // PATCH update
      const res = await fetch(
        `/api/admin/events/${eventId}/forms/${selectedVersionId}/fields/${editingField.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fieldData),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update field");
      }

      const updated = await res.json();
      setFields((prev) =>
        prev.map((f) => (f.id === editingField.id ? toEventFieldDomain(updated) : f))
      );
      showFeedback("success", `Updated field "${fieldData.label}"`);
    } else {
      // POST create
      const res = await fetch(
        `/api/admin/events/${eventId}/forms/${selectedVersionId}/fields`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fieldData),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to add field");
      }

      const created = await res.json();
      setFields((prev) => [...prev, toEventFieldDomain(created)]);
      showFeedback("success", `Added field "${fieldData.label}"`);
    }

    setIsEditorOpen(false);
    setEditingField(null);
  };

  // Delete a field
  const handleDeleteField = async (fieldId: string) => {
    if (!selectedVersionId) return;
    const target = fields.find((f) => f.id === fieldId);
    if (!target) return;

    if (!confirm(`Are you sure you want to delete the field "${target.label}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/forms/${selectedVersionId}/fields/${fieldId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete field");
      }

      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      showFeedback("success", `Deleted field "${target.label}"`);
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to delete field");
    }
  };

  // Reorder fields
  const handleMoveField = async (index: number, direction: "up" | "down") => {
    if (!selectedVersionId || !isDraft) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    // Update displayOrder numbers optimistically
    const reorderedWithOrder = newFields.map((field, idx) => ({
      ...field,
      displayOrder: idx + 1,
    }));
    setFields(reorderedWithOrder);

    // Persist to server
    try {
      const items = reorderedWithOrder.map((f) => ({
        id: f.id,
        displayOrder: f.displayOrder,
      }));

      const res = await fetch(
        `/api/admin/events/${eventId}/forms/${selectedVersionId}/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to persist field order");
      }
    } catch (err: any) {
      showFeedback("error", "Failed to save reordered fields. Refreshing.");
      // Rollback
      const res = await fetch(`/api/admin/events/${eventId}/forms/${selectedVersionId}`);
      if (res.ok) {
        const data = await res.json();
        setFields((data.fields || []).map(toEventFieldDomain));
      }
    }
  };

  // Publish version
  const handlePublishVersion = async () => {
    if (!selectedVersionId || !isDraft) return;
    setIsPublishing(true);

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/forms/${selectedVersionId}/publish`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to publish form version");
      }

      const published = await res.json();

      // Update local versions list
      setVersions((prev) =>
        prev.map((v) => {
          if (v.id === selectedVersionId) {
            return {
              ...v,
              status: FormVersionStatus.PUBLISHED,
              publishedAt: new Date(),
            };
          }
          if (v.status === FormVersionStatus.PUBLISHED) {
            return {
              ...v,
              status: FormVersionStatus.CLOSED,
            };
          }
          return v;
        })
      );

      setIsPublishModalOpen(false);
      showFeedback(
        "success",
        `Form Version ${selectedVersion.versionNumber} is now PUBLISHED and set as active.`
      );
      router.refresh();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to publish version");
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete draft version
  const handleDeleteVersion = async () => {
    if (!selectedVersionId || !isDraft) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/forms/${selectedVersionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete form version");
      }

      const remaining = versions.filter((v) => v.id !== selectedVersionId);
      setVersions(remaining);
      setSelectedVersionId(remaining[0]?.id || "");
      setIsDeleteModalOpen(false);
      showFeedback("success", `Deleted draft Version ${selectedVersion.versionNumber}`);
      router.refresh();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to delete version");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-border text-ccf-muted hover:text-ccf-offwhite"
          >
            <Link href={`/admin/events/${eventId}`}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back to Event</span>
            </Link>
          </Button>

          <div>
            <h1 className="text-lg font-bold text-ccf-offwhite tracking-tight">
              Registration Form Engine
            </h1>
            <p className="text-xs text-ccf-muted">
              Configure dynamic fields, conditional logic, and versioning for{" "}
              <span className="text-ccf-offwhite font-medium">{eventName}</span>
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleCreateVersion(selectedVersion?.id)}
            disabled={isCloning}
            className="border-border text-ccf-offwhite hover:border-ccf-gold/50"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5 text-ccf-gold" />
            <span>{isCloning ? "Cloning..." : "New Version"}</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            "p-3 rounded-lg text-xs flex items-center justify-between gap-2 border",
            feedback.type === "success"
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
              : "bg-red-950/20 border-red-500/30 text-red-400"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* If No Versions Exist Yet */}
      {versions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-ccf-surface/40 p-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-ccf-gold/10 border border-ccf-gold/30 text-ccf-gold flex items-center justify-center mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-ccf-offwhite">
              No Form Versions Configured
            </h3>
            <p className="text-xs text-ccf-muted max-w-md mx-auto">
              This event does not have any registration form versions yet. Initialize a draft
              version to start building the intake form.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => handleCreateVersion()}
            disabled={isCloning}
            className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Initialize Form Version (Draft v1)
          </Button>
        </div>
      ) : (
        <>
          {/* Version Selector & Status Bar */}
          <div className="rounded-xl border border-border/70 bg-ccf-surface p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Version Selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-ccf-muted">Select Version:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {versions.map((ver) => {
                    const isSelected = ver.id === selectedVersionId;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => setSelectedVersionId(ver.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-2",
                          isSelected
                            ? "bg-ccf-gold/15 border-ccf-gold text-ccf-gold shadow-xs"
                            : "bg-ccf-surface-elevated border-border text-ccf-muted hover:text-ccf-offwhite hover:border-border/80"
                        )}
                      >
                        <span>v{ver.versionNumber}</span>
                        {ver.status === FormVersionStatus.PUBLISHED && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                        {ver.status === FormVersionStatus.DRAFT && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        )}
                        {ver.status === FormVersionStatus.CLOSED && (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status and Action Buttons */}
              {selectedVersion && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Status Badge */}
                  {isPublished && (
                    <Badge className="bg-emerald-950/60 text-emerald-300 border-emerald-500/40 text-xs px-2.5 py-0.5">
                      PUBLISHED {isActivePublished && "(Active Intake)"}
                    </Badge>
                  )}
                  {isDraft && (
                    <Badge className="bg-amber-950/60 text-amber-300 border-amber-500/40 text-xs px-2.5 py-0.5">
                      DRAFT (Editable)
                    </Badge>
                  )}
                  {isClosed && (
                    <Badge className="bg-slate-900 text-slate-400 border-slate-700 text-xs px-2.5 py-0.5">
                      CLOSED (Archived)
                    </Badge>
                  )}

                  {/* Actions for Draft */}
                  {isDraft && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-950/20"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete Draft
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsPublishModalOpen(true)}
                        className="h-8 text-xs bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Publish Version
                      </Button>
                    </>
                  )}

                  {/* Actions for Published or Closed */}
                  {!isDraft && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateVersion(selectedVersion.id)}
                      disabled={isCloning}
                      className="h-8 text-xs border-ccf-gold/40 text-ccf-gold hover:border-ccf-gold hover:bg-ccf-gold/10"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Clone to New Draft Version
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Immutability Banner if published/closed */}
            {!isDraft && selectedVersion && (
              <div className="p-3 rounded-lg border border-border/80 bg-ccf-surface-elevated/40 text-xs text-ccf-muted flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-ccf-gold shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-ccf-offwhite">
                    Immutable Published Form Version
                  </span>
                  <p>
                    Published form versions are strictly immutable under CCF architecture to preserve
                    historical submission integrity. To modify fields, click{" "}
                    <strong className="text-ccf-offwhite">Clone to New Draft Version</strong> above.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between gap-4 border-b border-border/50">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("fields")}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2",
                  activeTab === "fields"
                    ? "border-ccf-gold text-ccf-gold"
                    : "border-transparent text-ccf-muted hover:text-ccf-offwhite"
                )}
              >
                <Layers className="h-4 w-4" />
                <span>Field Structure ({fields.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2",
                  activeTab === "preview"
                    ? "border-ccf-gold text-ccf-gold"
                    : "border-transparent text-ccf-muted hover:text-ccf-offwhite"
                )}
              >
                <Eye className="h-4 w-4" />
                <span>Interactive Preview</span>
              </button>
            </div>

            {/* Header controls for fields tab */}
            {activeTab === "fields" && isDraft && (
              <div className="flex items-center gap-2 pb-1">
                {fields.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSeedStandardFields}
                    disabled={isSeeding}
                    className="h-8 text-xs border-ccf-gold/40 text-ccf-gold hover:bg-ccf-gold/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {isSeeding ? "Loading..." : "Load CCF Presets"}
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingField(null);
                    setIsEditorOpen(true);
                  }}
                  className="h-8 text-xs bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Field
                </Button>
              </div>
            )}
          </div>

          {/* Active Tab Content */}
          {activeTab === "fields" ? (
            <div className="space-y-3">
              {isLoadingFields ? (
                <div className="py-12 text-center text-ccf-muted text-xs">
                  Loading form version fields...
                </div>
              ) : fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-ccf-surface/30 p-12 text-center space-y-4">
                  <div className="h-10 w-10 rounded-full bg-ccf-gold/10 border border-ccf-gold/30 text-ccf-gold flex items-center justify-center mx-auto">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-ccf-offwhite">No Fields Added</h4>
                    <p className="text-xs text-ccf-muted max-w-sm mx-auto">
                      Add custom fields or load the standard Crescent/External registration preset
                      bundle.
                    </p>
                  </div>
                  {isDraft && (
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSeedStandardFields}
                        disabled={isSeeding}
                        className="border-ccf-gold/40 text-ccf-gold hover:bg-ccf-gold/10 text-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {isSeeding ? "Loading..." : "Load CCF Standard Fields"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setEditingField(null);
                          setIsEditorOpen(true);
                        }}
                        className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Custom Field
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {fields.map((field, idx) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      index={idx}
                      totalFields={fields.length}
                      status={selectedVersion?.status || FormVersionStatus.DRAFT}
                      onEdit={(f) => {
                        setEditingField(f);
                        setIsEditorOpen(true);
                      }}
                      onDelete={handleDeleteField}
                      onMoveUp={(i) => handleMoveField(i, "up")}
                      onMoveDown={(i) => handleMoveField(i, "down")}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <FormPreview fields={fields} eventName={eventName} />
          )}
        </>
      )}

      {/* Field Editor Dialog Modal */}
      {isEditorOpen && (
        <FieldEditorDialog
          key={editingField ? editingField.id : "new-field"}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingField(null);
          }}
          onSave={handleSaveField}
          existingField={editingField}
          otherFields={fields.filter((f) => !editingField || f.id !== editingField.id)}
        />
      )}

      {/* Publish Confirmation Modal */}
      {isPublishModalOpen && selectedVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border/80 bg-ccf-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-semibold text-ccf-offwhite">
                Publish Form Version {selectedVersion.versionNumber}?
              </h3>
            </div>

            <p className="text-xs text-ccf-muted leading-relaxed">
              Publishing this version will make it <strong className="text-ccf-offwhite">strictly immutable</strong>.
              Its fields cannot be modified or deleted after publishing.
              <br />
              <br />
              This version will be set as the <strong className="text-ccf-gold">active registration form</strong> for{" "}
              <span className="text-ccf-offwhite">{eventName}</span>. Any previously published form version will be transitioned to CLOSED status.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPublishModalOpen(false)}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePublishVersion}
                disabled={isPublishing}
                className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold"
              >
                {isPublishing ? "Publishing..." : "Confirm & Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      {isDeleteModalOpen && selectedVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border/80 bg-ccf-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-semibold text-ccf-offwhite">
                Delete Draft Version {selectedVersion.versionNumber}?
              </h3>
            </div>

            <p className="text-xs text-ccf-muted leading-relaxed">
              This will permanently delete this draft form version and all its un-published fields.
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDeleteVersion}
                disabled={isDeleting}
                className="bg-red-500 text-white hover:bg-red-600 font-semibold"
              >
                {isDeleting ? "Deleting..." : "Delete Draft"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
