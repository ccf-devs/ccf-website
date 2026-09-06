"use client";

import React, { useState, useEffect } from "react";
import {
  EventFieldDomain,
  FieldType,
  FieldScope,
  ConditionalOperator,
} from "@/lib/forms/types";
import { CCF_SYSTEM_FIELD_PRESETS, SystemFieldPreset } from "@/lib/forms/system-fields";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fieldData: any) => Promise<void>;
  existingField?: EventFieldDomain | null;
  otherFields: EventFieldDomain[];
}

export function FieldEditorDialog({
  isOpen,
  onClose,
  onSave,
  existingField,
  otherFields,
}: FieldEditorDialogProps) {
  const [activeTab, setActiveTab] = useState<"custom" | "presets">("custom");

  // Form state initialized directly from existingField
  const [key, setKey] = useState(existingField?.key || "");
  const [label, setLabel] = useState(existingField?.label || "");
  const [type, setType] = useState<FieldType>(existingField?.type || FieldType.TEXT);
  const [fieldScope, setFieldScope] = useState<FieldScope>(
    existingField?.scope || existingField?.fieldScope || FieldScope.PARTICIPANT
  );
  const [required, setRequired] = useState(existingField?.required ?? false);
  const [placeholder, setPlaceholder] = useState(existingField?.config.placeholder || "");
  const [helpText, setHelpText] = useState(existingField?.config.helpText || "");
  const [options, setOptions] = useState<string[]>(existingField?.config.options || []);
  const [newOption, setNewOption] = useState("");

  // Validation state
  const [minVal, setMinVal] = useState<string>(
    existingField?.validation?.min !== undefined ? String(existingField.validation.min) : ""
  );
  const [maxVal, setMaxVal] = useState<string>(
    existingField?.validation?.max !== undefined ? String(existingField.validation.max) : ""
  );
  const [pattern, setPattern] = useState(existingField?.validation?.pattern || "");
  const [customErrorMessage, setCustomErrorMessage] = useState(
    existingField?.validation?.customErrorMessage || ""
  );

  // Conditional logic state
  const [hasConditional, setHasConditional] = useState(Boolean(existingField?.conditionalLogic));
  const [dependsOn, setDependsOn] = useState(
    existingField?.conditionalLogic?.dependsOn || otherFields[0]?.key || ""
  );
  const [operator, setOperator] = useState<ConditionalOperator>(
    existingField?.conditionalLogic?.operator || "equals"
  );
  const [conditionValue, setConditionValue] = useState(
    existingField?.conditionalLogic
      ? Array.isArray(existingField.conditionalLogic.value)
        ? existingField.conditionalLogic.value.join(", ")
        : String(existingField.conditionalLogic.value)
      : ""
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: SystemFieldPreset) => {
    setKey(preset.key);
    setLabel(preset.label);
    setType(preset.type);
    setFieldScope(preset.fieldScope);
    setRequired(preset.required);
    setPlaceholder(preset.config.placeholder || "");
    setHelpText(preset.config.helpText || "");
    setOptions(preset.config.options || []);

    setMinVal(preset.validation?.min !== undefined ? String(preset.validation.min) : "");
    setMaxVal(preset.validation?.max !== undefined ? String(preset.validation.max) : "");
    setPattern(preset.validation?.pattern || "");
    setCustomErrorMessage(preset.validation?.customErrorMessage || "");

    if (preset.conditionalLogic) {
      setHasConditional(true);
      setDependsOn(preset.conditionalLogic.dependsOn);
      setOperator(preset.conditionalLogic.operator);
      setConditionValue(String(preset.conditionalLogic.value));
    } else {
      setHasConditional(false);
    }

    setActiveTab("custom");
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (optToRemove: string) => {
    setOptions(options.filter((o) => o !== optToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client validation
    if (!key.trim()) {
      setError("Field key is required.");
      return;
    }

    if (!label.trim()) {
      setError("Field label is required.");
      return;
    }

    if (
      (type === FieldType.SELECT || type === FieldType.MULTI_SELECT || type === FieldType.RADIO) &&
      options.length === 0
    ) {
      setError(`${type} fields require at least one option.`);
      return;
    }

    const payload: any = {
      key: key.trim().toLowerCase(),
      label: label.trim(),
      type,
      fieldScope,
      required,
      config: {
        placeholder: placeholder.trim() || undefined,
        helpText: helpText.trim() || undefined,
        options: options.length > 0 ? options : undefined,
      },
      validation: null,
      conditionalLogic: null,
    };

    // Validation rules
    const min = minVal.trim() !== "" ? Number(minVal) : undefined;
    const max = maxVal.trim() !== "" ? Number(maxVal) : undefined;
    if (min !== undefined || max !== undefined || pattern.trim() || customErrorMessage.trim()) {
      payload.validation = {
        min,
        max,
        pattern: pattern.trim() || undefined,
        customErrorMessage: customErrorMessage.trim() || undefined,
      };
    }

    // Conditional logic
    if (hasConditional && dependsOn.trim() && conditionValue.trim()) {
      payload.conditionalLogic = {
        dependsOn: dependsOn.trim(),
        operator,
        value: operator === "in" || operator === "not_in"
          ? conditionValue.split(",").map((s) => s.trim())
          : conditionValue.trim(),
      };
    }

    setIsSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-border/80 bg-[#071426] p-6 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-ccf-offwhite">
              {existingField ? "Edit Form Field" : "Add Form Field"}
            </h3>
            <p className="text-xs text-ccf-muted">
              Configure field identity, data type, options, and conditional branching.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector (only for new fields) */}
        {!existingField && (
          <div className="flex rounded-lg bg-ccf-surface-sunken p-1 border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors",
                activeTab === "custom"
                  ? "bg-ccf-surface-elevated text-ccf-gold shadow-xs"
                  : "text-ccf-muted hover:text-ccf-offwhite"
              )}
            >
              Custom Field
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5",
                activeTab === "presets"
                  ? "bg-ccf-surface-elevated text-ccf-gold shadow-xs"
                  : "text-ccf-muted hover:text-ccf-offwhite"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>CCF System Presets</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Presets Tab View */}
        {activeTab === "presets" && !existingField ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-xs text-ccf-muted">
              Select an official platform preset to pre-fill standard CCF validation and conditional rules:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CCF_SYSTEM_FIELD_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="flex flex-col items-start p-3 rounded-lg border border-border/60 bg-ccf-surface-sunken hover:border-ccf-gold hover:bg-ccf-surface-elevated transition-colors text-left space-y-1"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm text-ccf-offwhite">
                      {preset.label}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-ccf-gold">
                      {preset.type}
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-ccf-muted">
                    {preset.key}
                  </code>
                  <p className="text-xs text-ccf-muted leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Custom Field Form */
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field Key */}
              <div className="space-y-1.5">
                <Label htmlFor="field-key" required>
                  Field Key (snake_case)
                </Label>
                <Input
                  id="field-key"
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g. participant_name"
                  required
                />
                <p className="text-[11px] text-ccf-muted">
                  Unique programmatic identifier (e.g. rrn, email, college_name)
                </p>
              </div>

              {/* Field Label */}
              <div className="space-y-1.5">
                <Label htmlFor="field-label" required>
                  Display Label
                </Label>
                <Input
                  id="field-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Full Official Name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field Type */}
              <div className="space-y-1.5">
                <Label htmlFor="field-type" required>
                  Field Type
                </Label>
                <Select
                  id="field-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as FieldType)}
                >
                  {Object.values(FieldType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Field Scope */}
              <div className="space-y-1.5">
                <Label htmlFor="field-scope" required>
                  Field Scope
                </Label>
                <Select
                  id="field-scope"
                  value={fieldScope}
                  onChange={(e) => setFieldScope(e.target.value as FieldScope)}
                >
                  {Object.values(FieldScope).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Required Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="field-required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="h-4 w-4 rounded text-ccf-gold focus:ring-ccf-gold bg-transparent border-border/80"
              />
              <Label htmlFor="field-required" className="cursor-pointer">
                Mandatory / Required Field
              </Label>
            </div>

            {/* Options Manager (for SELECT, MULTI_SELECT, RADIO) */}
            {(type === FieldType.SELECT || type === FieldType.MULTI_SELECT || type === FieldType.RADIO) && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-ccf-surface-sunken p-4">
                <Label required>Option Choices</Label>
                <p className="text-xs text-ccf-muted">
                  Add the selectable options for this {type} field:
                </p>

                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Enter an option..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddOption}
                    className="shrink-0 border-ccf-gold/40 text-ccf-gold hover:bg-ccf-gold/10"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span>Add</span>
                  </Button>
                </div>

                {options.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {options.map((opt) => (
                      <span
                        key={opt}
                        className="inline-flex items-center gap-1.5 rounded bg-ccf-surface-elevated px-2.5 py-1 text-xs text-ccf-offwhite border border-border/60"
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt)}
                          className="text-ccf-muted hover:text-red-400"
                          aria-label={`Remove option ${opt}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-400 italic">No options added yet.</p>
                )}
              </div>
            )}

            {/* UI Helpers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="field-placeholder">Placeholder</Label>
                <Input
                  id="field-placeholder"
                  type="text"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="e.g. 12-digit RRN"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="field-help">Help Text</Label>
                <Input
                  id="field-help"
                  type="text"
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                  placeholder="e.g. Starting with 2"
                />
              </div>
            </div>

            {/* Conditional Branching Section */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-ccf-surface-sunken p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-ccf-offwhite block">
                    Conditional Visibility Branching
                  </span>
                  <p className="text-[11px] text-ccf-muted">
                    Show this field only when another field satisfies a condition (e.g. Crescent vs External)
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="enable-conditional"
                  checked={hasConditional}
                  onChange={(e) => setHasConditional(e.target.checked)}
                  className="h-4 w-4 rounded text-ccf-gold focus:ring-ccf-gold bg-transparent border-border/80"
                />
              </div>

              {hasConditional && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="depends-on">Depends On Field</Label>
                    <Select
                      id="depends-on"
                      value={dependsOn}
                      onChange={(e) => setDependsOn(e.target.value)}
                    >
                      {otherFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} ({f.key})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="operator">Operator</Label>
                    <Select
                      id="operator"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value as ConditionalOperator)}
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">does not equal</option>
                      <option value="in">is one of (comma-separated)</option>
                      <option value="not_in">is not one of</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="condition-value">Expected Value</Label>
                    <Input
                      id="condition-value"
                      type="text"
                      value={conditionValue}
                      onChange={(e) => setConditionValue(e.target.value)}
                      placeholder="e.g. CRESCENT"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Validation Rules Section */}
            <div className="space-y-3 rounded-lg border border-border/60 bg-ccf-surface-sunken p-4">
              <span className="text-xs font-semibold text-ccf-offwhite block">
                Validation Constraints (Optional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="val-min">Min (Length / Value)</Label>
                  <Input
                    id="val-min"
                    type="number"
                    value={minVal}
                    onChange={(e) => setMinVal(e.target.value)}
                    placeholder="e.g. 2"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="val-max">Max (Length / Value)</Label>
                  <Input
                    id="val-max"
                    type="number"
                    value={maxVal}
                    onChange={(e) => setMaxVal(e.target.value)}
                    placeholder="e.g. 100"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="val-pattern">Regex Pattern</Label>
                  <Input
                    id="val-pattern"
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="e.g. ^2\d{11}$"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label htmlFor="val-error">Custom Error Message</Label>
                <Input
                  id="val-error"
                  type="text"
                  value={customErrorMessage}
                  onChange={(e) => setCustomErrorMessage(e.target.value)}
                  placeholder="e.g. RRN must be exactly 12 digits starting with 2"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold"
              >
                {isSaving ? "Saving..." : existingField ? "Update Field" : "Add Field"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
