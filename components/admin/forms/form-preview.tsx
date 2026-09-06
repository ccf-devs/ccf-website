"use client";

import React, { useState } from "react";
import { EventFieldDomain } from "@/lib/forms/types";
import { FormRenderer } from "@/components/forms/form-renderer";
import { validateFormSubmission } from "@/lib/forms/validation";
import { isFieldVisible } from "@/lib/forms/conditional-logic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RotateCcw, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface FormPreviewProps {
  fields: EventFieldDomain[];
  eventName?: string;
}

export function FormPreview({ fields, eventName }: FormPreviewProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle");

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    // Clear field-specific error if present
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setValidationStatus("idle");
  };

  const handleTestValidate = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateFormSubmission(fields, formValues);
    if (!result.success && result.errors) {
      setFormErrors(result.errors);
      setValidationStatus("invalid");
    } else {
      setFormErrors({});
      setValidationStatus("valid");
    }
  };

  const handleReset = () => {
    setFormValues({});
    setFormErrors({});
    setValidationStatus("idle");
  };

  const handleFillCrescentTest = () => {
    setFormValues({
      participant_type: "CRESCENT",
      participant_name: "Aadhya Sharma",
      email_address: "aadhya@crescent.education",
      phone_number: "+919876543210",
      crescent_rrn: "210011601045",
      academic_department: "Commerce",
      academic_year: "Year 3",
      academic_level: "Undergraduate",
    });
    setFormErrors({});
    setValidationStatus("idle");
  };

  const handleFillExternalTest = () => {
    setFormValues({
      participant_type: "EXTERNAL",
      participant_name: "Rahul Verma",
      email_address: "rahul.v@loyola.edu",
      phone_number: "+919876543222",
      college_name: "Loyola College, Chennai",
      external_roll_number: "22-COM-041",
      academic_department: "Finance & Accounts",
      academic_year: "Year 2",
      academic_level: "Undergraduate",
    });
    setFormErrors({});
    setValidationStatus("idle");
  };

  const visibleCount = fields.filter((f) => isFieldVisible(f.conditionalLogic, formValues)).length;

  return (
    <div className="space-y-4">
      {/* Preview Header & Controls */}
      <div className="rounded-xl border border-border/70 bg-ccf-surface p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-ccf-gold/10 border border-ccf-gold/30 flex items-center justify-center text-ccf-gold">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ccf-offwhite">
                Interactive Preview
              </h3>
              <p className="text-xs text-ccf-muted">
                Test field rendering, conditional paths, and validation logic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-border text-ccf-muted text-[11px]">
              {fields.length} {fields.length === 1 ? "field" : "fields"} total
            </Badge>
            <Badge variant="outline" className="border-ccf-gold/40 text-ccf-gold text-[11px]">
              {visibleCount} visible
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs border-border text-ccf-muted hover:text-ccf-offwhite"
              title="Reset preview inputs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Quick Test Scenarios */}
        <div className="pt-3 flex items-center justify-between gap-2 flex-wrap text-xs">
          <span className="text-ccf-muted font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-ccf-gold" />
            Test Scenarios:
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillCrescentTest}
              className="h-7 text-xs border-border/80 text-ccf-offwhite hover:border-ccf-gold/50"
            >
              Crescent Student Path
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillExternalTest}
              className="h-7 text-xs border-border/80 text-ccf-offwhite hover:border-ccf-gold/50"
            >
              External Student Path
            </Button>
          </div>
        </div>

        {/* Validation Status Banner */}
        {validationStatus === "valid" && (
          <div className="mt-3 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Form validation passed successfully for all visible required fields!</span>
          </div>
        )}
        {validationStatus === "invalid" && (
          <div className="mt-3 p-2.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Validation failed. {Object.keys(formErrors).length}{" "}
              {Object.keys(formErrors).length === 1 ? "field has an error" : "fields have errors"}.
            </span>
          </div>
        )}
      </div>

      {/* Rendered Dynamic Form */}
      <div className="rounded-xl border border-border/70 bg-ccf-surface/60 p-6 shadow-sm">
        {fields.length === 0 ? (
          <div className="py-12 text-center text-ccf-muted text-sm">
            No fields have been added to this form version yet.
            <br />
            Add fields or load system presets to preview the form.
          </div>
        ) : (
          <FormRenderer
            fields={fields}
            values={formValues}
            onChange={handleChange}
            errors={formErrors}
            onSubmit={handleTestValidate}
            submitLabel={`Validate & Test Submission ${eventName ? `(${eventName})` : ""}`}
          />
        )}
      </div>
    </div>
  );
}
