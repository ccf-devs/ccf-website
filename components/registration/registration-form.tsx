"use client";

import React, { useState } from "react";
import { EventFieldDomain } from "@/lib/forms/types";
import { FormRenderer } from "@/components/forms/form-renderer";
import { validateFormSubmission } from "@/lib/forms/validation";
import { RegistrationConfirmation } from "@/lib/registrations/types";
import { RegistrationSuccess } from "./registration-success";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Sparkles, Building, School } from "lucide-react";

export interface RegistrationFormProps {
  event: {
    id: string;
    slug: string;
    name: string;
    eligibilityCrescent: boolean;
    eligibilityExternal: boolean;
    paymentMode?: string;
    feeAmount?: number | string | null;
  };
  fields: EventFieldDomain[];
  initialValues?: Record<string, any>;
}

export function RegistrationForm({
  event,
  fields,
  initialValues = {},
}: RegistrationFormProps) {
  // Determine initial participant category
  const initialCategory: "CRESCENT" | "EXTERNAL" =
    event.eligibilityCrescent && !event.eligibilityExternal
      ? "CRESCENT"
      : !event.eligibilityCrescent && event.eligibilityExternal
      ? "EXTERNAL"
      : (initialValues.participant_type as "CRESCENT" | "EXTERNAL") || "CRESCENT";

  const [participantType, setParticipantType] = useState<"CRESCENT" | "EXTERNAL">(
    initialCategory
  );
  const [values, setValues] = useState<Record<string, any>>({
    participant_type: initialCategory,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<RegistrationConfirmation | null>(null);

  // Both categories eligible
  const isMixedEvent = event.eligibilityCrescent && event.eligibilityExternal;

  const handleCategoryChange = (category: "CRESCENT" | "EXTERNAL") => {
    setParticipantType(category);
    setValues((prev) => ({
      ...prev,
      participant_type: category,
    }));
    // Clear existing errors on category switch
    setErrors({});
    setGeneralError(null);
  };

  const handleFieldChange = (key: string, value: any) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // If the field being changed is participant_type, sync participantType state
      if (key === "participant_type" && (value === "CRESCENT" || value === "EXTERNAL")) {
        setParticipantType(value);
      }
      return next;
    });

    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setGeneralError(null);

    // Client-side dynamic validation
    const clientValidation = validateFormSubmission(fields, values);
    if (!clientValidation.isValid && clientValidation.errors) {
      setErrors(clientValidation.errors);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${event.slug}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantType,
          registrationType: "INDIVIDUAL",
          responses: values,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === "object") {
          // If server returned field-specific errors
          const fieldErrors: Record<string, string> = {};
          if (data.details.fieldErrors) {
            for (const [k, v] of Object.entries(data.details.fieldErrors)) {
              if (Array.isArray(v) && v.length > 0) {
                fieldErrors[k] = v[0];
              }
            }
          } else {
            for (const [k, v] of Object.entries(data.details)) {
              if (typeof v === "string") {
                fieldErrors[k] = v;
              }
            }
          }
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          }
        }
        setGeneralError(data.error || "An error occurred during registration. Please try again.");
        return;
      }

      // Success
      setConfirmation(data.registration);
    } catch (err) {
      console.error("Submission failed:", err);
      setGeneralError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // If successfully registered, show confirmation screen
  if (confirmation) {
    return <RegistrationSuccess confirmation={confirmation} />;
  }

  return (
    <Card className="bg-ccf-surface border-border/60 p-6 sm:p-8 space-y-8 max-w-2xl mx-auto shadow-xl">
      {/* Category selector if both Crescent and External are eligible */}
      {isMixedEvent && (
        <div className="space-y-3 pb-6 border-b border-border/40">
          <Label className="text-xs uppercase font-mono tracking-wider text-ccf-muted">
            Select Your Participant Category
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleCategoryChange("CRESCENT")}
              disabled={submitting}
              className={`p-3.5 rounded-lg border text-left transition-all flex items-center gap-3 ${
                participantType === "CRESCENT"
                  ? "bg-ccf-gold/10 border-ccf-gold text-ccf-offwhite shadow-sm ring-1 ring-ccf-gold/50"
                  : "bg-ccf-surface-elevated/60 border-border/50 text-ccf-muted hover:border-border hover:text-ccf-offwhite"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                  participantType === "CRESCENT"
                    ? "bg-ccf-gold text-ccf-navy-dark"
                    : "bg-ccf-surface text-ccf-muted"
                }`}
              >
                <School className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight">Crescent Student</div>
                <div className="text-[11px] text-ccf-muted truncate">Requires 12-digit RRN</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryChange("EXTERNAL")}
              disabled={submitting}
              className={`p-3.5 rounded-lg border text-left transition-all flex items-center gap-3 ${
                participantType === "EXTERNAL"
                  ? "bg-ccf-gold/10 border-ccf-gold text-ccf-offwhite shadow-sm ring-1 ring-ccf-gold/50"
                  : "bg-ccf-surface-elevated/60 border-border/50 text-ccf-muted hover:border-border hover:text-ccf-offwhite"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                  participantType === "EXTERNAL"
                    ? "bg-ccf-gold text-ccf-navy-dark"
                    : "bg-ccf-surface text-ccf-muted"
                }`}
              >
                <Building className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight">External College</div>
                <div className="text-[11px] text-ccf-muted truncate">Institution & Roll No</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Registration could not be completed</span>
            <span>{generalError}</span>
          </div>
        </div>
      )}

      {/* Form Renderer */}
      <FormRenderer
        fields={fields}
        values={values}
        onChange={handleFieldChange}
        errors={errors}
        disabled={submitting}
        onSubmit={handleSubmit}
        submitLabel={submitting ? "Processing Registration..." : "Complete Registration"}
      />
    </Card>
  );
}
