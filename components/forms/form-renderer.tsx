"use client";

import React from "react";
import { EventFieldDomain, FieldType } from "@/lib/forms/types";
import { isFieldVisible } from "@/lib/forms/conditional-logic";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormRendererProps {
  fields: EventFieldDomain[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  className?: string;
  readOnly?: boolean;
}

/**
 * Reusable dynamic form renderer for CCF event registration forms.
 * Consumes versioned EventFields, evaluates conditional logic in real time,
 * and renders all 13 supported field types with proper accessibility attributes.
 */
export function FormRenderer({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
  onSubmit,
  submitLabel = "Submit Registration",
  className,
  readOnly = false,
}: FormRendererProps) {
  // Sort fields by displayOrder
  const sortedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);

  // Filter visible fields based on conditional logic
  const visibleFields = sortedFields.filter((field) =>
    isFieldVisible(field.conditionalLogic, values)
  );

  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-6", className)}
      noValidate
      aria-label="Event Registration Form"
    >
      {visibleFields.map((field) => {
        const error = errors[field.key];
        const value = values[field.key] ?? "";
        const errorId = `${field.key}-error`;
        const helpId = `${field.key}-help`;

        return (
          <div key={field.id || field.key} className="space-y-1.5" data-field-key={field.key}>
            <div className="flex items-center justify-between">
              <Label htmlFor={field.key} required={field.required}>
                {field.label}
              </Label>
              {field.config.isSystem && (
                <span className="text-[10px] uppercase font-mono tracking-wider text-ccf-gold/70">
                  System
                </span>
              )}
            </div>

            {/* Field Input Control */}
            <div className="pt-0.5">
              {renderFieldInput(field, value, onChange, disabled || readOnly, error, errorId, helpId)}
            </div>

            {/* Help / Instructional Text */}
            {field.config.helpText && !error && (
              <p id={helpId} className="text-xs text-ccf-muted leading-relaxed">
                {field.config.helpText}
              </p>
            )}

            {/* Validation Error Message */}
            {error && (
              <p
                id={errorId}
                role="alert"
                className="text-xs text-red-400 font-medium flex items-center gap-1.5 pt-0.5"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
          </div>
        );
      })}

      {visibleFields.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 bg-ccf-surface/40 p-8 text-center text-sm text-ccf-muted">
          No form fields configured.
        </div>
      )}

      {onSubmit && !readOnly && (
        <div className="pt-4">
          <Button
            type="submit"
            disabled={disabled}
            className="w-full bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold shadow-md py-6 text-base"
          >
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

function renderFieldInput(
  field: EventFieldDomain,
  value: any,
  onChange: (key: string, val: any) => void,
  disabled: boolean,
  error?: string,
  errorId?: string,
  helpId?: string
) {
  const commonProps = {
    id: field.key,
    name: field.key,
    disabled,
    "aria-invalid": !!error,
    "aria-describedby": error ? errorId : field.config.helpText ? helpId : undefined,
    "aria-required": field.required,
  };

  switch (field.type) {
    case FieldType.TEXT:
      return (
        <Input
          {...commonProps}
          type="text"
          value={value}
          placeholder={field.config.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.TEXTAREA:
      return (
        <Textarea
          {...commonProps}
          value={value}
          placeholder={field.config.placeholder}
          rows={4}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.NUMBER:
      return (
        <Input
          {...commonProps}
          type="number"
          value={value}
          placeholder={field.config.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.EMAIL:
      return (
        <Input
          {...commonProps}
          type="email"
          value={value}
          placeholder={field.config.placeholder || "name@example.com"}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.PHONE:
      return (
        <Input
          {...commonProps}
          type="tel"
          value={value}
          placeholder={field.config.placeholder || "10-digit mobile number"}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.DATE:
      return (
        <Input
          {...commonProps}
          type="date"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.TIME:
      return (
        <Input
          {...commonProps}
          type="time"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.DATETIME:
      return (
        <Input
          {...commonProps}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );

    case FieldType.SELECT: {
      const options = field.config.options || [];
      return (
        <Select
          {...commonProps}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="" disabled>
            {field.config.placeholder || "Select an option..."}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      );
    }

    case FieldType.RADIO: {
      const options = field.config.options || [];
      return (
        <div className="space-y-2 pt-1" role="radiogroup" aria-labelledby={field.key}>
          {options.map((opt) => {
            const radioId = `${field.key}-${opt}`;
            const isChecked = String(value) === String(opt);
            return (
              <label
                key={opt}
                htmlFor={radioId}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-sm",
                  isChecked
                    ? "border-ccf-gold bg-ccf-gold/10 text-ccf-offwhite font-medium"
                    : "border-border/60 bg-ccf-surface-sunken text-ccf-muted hover:bg-ccf-surface-elevated hover:text-ccf-offwhite"
                )}
              >
                <input
                  type="radio"
                  id={radioId}
                  name={field.key}
                  value={opt}
                  checked={isChecked}
                  disabled={disabled}
                  onChange={() => onChange(field.key, opt)}
                  className="h-4 w-4 text-ccf-gold focus:ring-ccf-gold focus:ring-offset-0 bg-transparent border-border/80"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case FieldType.MULTI_SELECT: {
      const options = field.config.options || [];
      const currentSelection: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2 pt-1">
          {options.map((opt) => {
            const checkboxId = `${field.key}-${opt}`;
            const isChecked = currentSelection.includes(opt);
            return (
              <label
                key={opt}
                htmlFor={checkboxId}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-sm",
                  isChecked
                    ? "border-ccf-gold bg-ccf-gold/10 text-ccf-offwhite font-medium"
                    : "border-border/60 bg-ccf-surface-sunken text-ccf-muted hover:bg-ccf-surface-elevated hover:text-ccf-offwhite"
                )}
              >
                <input
                  type="checkbox"
                  id={checkboxId}
                  value={opt}
                  checked={isChecked}
                  disabled={disabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange(field.key, [...currentSelection, opt]);
                    } else {
                      onChange(
                        field.key,
                        currentSelection.filter((item) => item !== opt)
                      );
                    }
                  }}
                  className="h-4 w-4 rounded text-ccf-gold focus:ring-ccf-gold focus:ring-offset-0 bg-transparent border-border/80"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case FieldType.CHECKBOX: {
      const isChecked = Boolean(value);
      return (
        <label
          htmlFor={field.key}
          className="flex items-start gap-3 rounded-lg border border-border/60 bg-ccf-surface-sunken p-3.5 cursor-pointer text-sm text-ccf-muted hover:text-ccf-offwhite"
        >
          <input
            {...commonProps}
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="h-4 w-4 mt-0.5 rounded text-ccf-gold focus:ring-ccf-gold focus:ring-offset-0 bg-transparent border-border/80"
          />
          <span className="leading-snug">{field.config.placeholder || field.label}</span>
        </label>
      );
    }

    case FieldType.FILE:
      return (
        <div className="rounded-lg border-2 border-dashed border-border/60 bg-ccf-surface-sunken p-6 text-center space-y-2">
          <Upload className="h-6 w-6 text-ccf-muted mx-auto" aria-hidden="true" />
          <p className="text-xs text-ccf-muted">
            {field.config.placeholder || "Click or drag document to upload"}
          </p>
          <input
            {...commonProps}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onChange(field.key, file.name);
              }
            }}
          />
          {value && (
            <p className="text-xs text-ccf-gold font-medium">Selected: {String(value)}</p>
          )}
        </div>
      );

    default:
      return (
        <Input
          {...commonProps}
          type="text"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
  }
}
