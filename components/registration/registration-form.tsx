"use client";

import React, { useState } from "react";
import { ParticipantType, RegistrationType } from "@prisma/client";
import { EventFieldDomain } from "@/lib/forms/types";
import { FormRenderer } from "@/components/forms/form-renderer";
import { validateFormSubmission } from "@/lib/forms/validation";
import {
  RegistrationConfirmation,
  TeamMemberInput,
} from "@/lib/registrations/types";
import { RegistrationSuccess } from "./registration-success";
import { TeamRosterBuilder } from "./team-roster-builder";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Loader2,
  Sparkles,
  Building,
  School,
  Users,
  User,
} from "lucide-react";

export interface TeamConfig {
  isTeamRegistration?: boolean;
  allowModeChoice?: boolean;
  teamNameRequired?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
}

export interface RegistrationFormProps {
  event: {
    id: string;
    slug: string;
    name: string;
    eligibilityCrescent: boolean;
    eligibilityExternal: boolean;
    paymentMode?: string;
    feeAmount?: number | string | null;
    capacityMode?: string;
  };
  fields: EventFieldDomain[];
  initialValues?: Record<string, any>;
  teamConfig?: TeamConfig;
}

export function RegistrationForm({
  event,
  fields,
  initialValues = {},
  teamConfig,
}: RegistrationFormProps) {
  // Determine if team registration is active by default
  const hasTeamFields = fields.some(
    (f) =>
      f.fieldScope === "TEAM" ||
      f.fieldScope === "TEAM_MEMBER" ||
      f.key === "team_name" ||
      (f.config?.isSystem &&
        (f.config.systemKey === "team_name" ||
          f.config.systemKey === "team_membership"))
  );

  const teamNameField = fields.find(
    (f) =>
      f.key === "team_name" ||
      (f.config?.isSystem && f.config.systemKey === "team_name")
  );

  const isTeamDefault = Boolean(
    teamConfig?.isTeamRegistration ?? hasTeamFields
  );
  const allowModeChoice = Boolean(teamConfig?.allowModeChoice);

  const [regType, setRegType] = useState<"INDIVIDUAL" | "TEAM">(
    isTeamDefault ? "TEAM" : "INDIVIDUAL"
  );

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
  const [teamName, setTeamName] = useState<string>(
    initialValues.team_name || ""
  );
  const [additionalMembers, setAdditionalMembers] = useState<TeamMemberInput[]>(
    []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<RegistrationConfirmation | null>(
    null
  );

  // Both categories eligible
  const isMixedEvent = event.eligibilityCrescent && event.eligibilityExternal;

  // Derive primary participant identity from current form values
  const primaryName =
    values.participant_name || values.name || values.fullName || "";
  const primaryIdentifier =
    participantType === "CRESCENT"
      ? values.crescent_rrn || values.rrn || ""
      : values.external_roll_number || values.roll_number || "";
  const primaryCollege =
    participantType === "EXTERNAL"
      ? values.college_name || values.college || ""
      : null;

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
      if (key === "team_name") {
        setTeamName(value);
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

    // 1. Client-side dynamic validation of primary form fields
    const clientValidation = validateFormSubmission(fields, values);
    const newErrors: Record<string, string> = {
      ...(clientValidation.errors || {}),
    };

    // 2. Client-side team validation if in team registration mode
    if (regType === "TEAM") {
      const teamNameRequired =
        teamConfig?.teamNameRequired ?? (teamNameField ? teamNameField.required : true);

      if (teamNameRequired && (!teamName || teamName.trim().length < 2)) {
        newErrors["team.name"] = "Team name must be at least 2 characters.";
      }

      const totalMembers = 1 + additionalMembers.length;
      if (
        typeof teamConfig?.minTeamSize === "number" &&
        totalMembers < teamConfig.minTeamSize
      ) {
        newErrors["team.members"] = `Team must have at least ${teamConfig.minTeamSize} members.`;
      }
      if (
        typeof teamConfig?.maxTeamSize === "number" &&
        totalMembers > teamConfig.maxTeamSize
      ) {
        newErrors["team.members"] = `Team cannot exceed ${teamConfig.maxTeamSize} members.`;
      }

      // Check additional members inputs
      const seenIdentities = new Set<string>();
      if (primaryIdentifier) {
        const primaryKey = `${participantType}:${(primaryCollege || "").toLowerCase().trim()}:${primaryIdentifier.toLowerCase().trim()}`;
        seenIdentities.add(primaryKey);
      }

      additionalMembers.forEach((m, idx) => {
        const memberKeyPrefix = `team.members.${idx}`;
        if (!m.name || m.name.trim().length < 2) {
          newErrors[`${memberKeyPrefix}.name`] = "Name must be at least 2 characters.";
        }

        if (m.participantType === "CRESCENT") {
          const rrn = m.identifierNormalized?.trim() || "";
          if (!rrn) {
            newErrors[`${memberKeyPrefix}.identifierNormalized`] = "Crescent RRN is required.";
          } else if (!/^2\d{11}$/.test(rrn)) {
            newErrors[`${memberKeyPrefix}.identifierNormalized`] = "RRN must be 12 digits starting with 2.";
          } else {
            const key = `CRESCENT::${rrn}`;
            if (seenIdentities.has(key)) {
              newErrors[`${memberKeyPrefix}.identifierNormalized`] = "Duplicate participant in roster.";
            }
            seenIdentities.add(key);
          }
        } else {
          const college = m.collegeNormalized?.trim() || "";
          const roll = m.identifierNormalized?.trim() || "";
          if (!college) {
            newErrors[`${memberKeyPrefix}.collegeNormalized`] = "College is required.";
          }
          if (!roll) {
            newErrors[`${memberKeyPrefix}.identifierNormalized`] = "Roll number is required.";
          }
          if (college && roll) {
            const key = `EXTERNAL:${college.toLowerCase()}:${roll.toLowerCase()}`;
            if (seenIdentities.has(key)) {
              newErrors[`${memberKeyPrefix}.identifierNormalized`] = "Duplicate participant in roster.";
            }
            seenIdentities.add(key);
          }
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      let submissionPayload: any;

      if (regType === "TEAM") {
        const teamMembersPayload: TeamMemberInput[] = [
          {
            name: primaryName.trim() || values.participant_name,
            participantType,
            identifierNormalized: primaryIdentifier.trim(),
            collegeNormalized: primaryCollege ? primaryCollege.trim() : undefined,
            phone: values.phone || values.whatsapp_number || undefined,
            academicDepartment: values.academic_department || values.department || undefined,
            year: values.year || undefined,
            isLeader: true,
          },
          ...additionalMembers.map((m) => ({
            ...m,
            isLeader: false,
          })),
        ];

        submissionPayload = {
          participantType,
          registrationType: RegistrationType.TEAM,
          responses: {
            ...values,
            ...(teamName ? { team_name: teamName.trim() } : {}),
          },
          team: {
            name: teamName.trim() || undefined,
            members: teamMembersPayload,
          },
        };
      } else {
        submissionPayload = {
          participantType,
          registrationType: RegistrationType.INDIVIDUAL,
          responses: values,
        };
      }

      const res = await fetch(`/api/events/${event.slug}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === "object") {
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
      {/* Registration Type Selector (Only if both modes are allowed) */}
      {allowModeChoice && (
        <div className="space-y-3 pb-6 border-b border-border/40">
          <Label className="text-xs uppercase font-mono tracking-wider text-ccf-muted">
            Registration Mode
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setRegType("INDIVIDUAL");
                setErrors({});
                setGeneralError(null);
              }}
              disabled={submitting}
              className={`p-3.5 rounded-lg border text-left transition-all flex items-center gap-3 ${
                regType === "INDIVIDUAL"
                  ? "bg-ccf-gold/10 border-ccf-gold text-ccf-offwhite shadow-sm ring-1 ring-ccf-gold/50"
                  : "bg-ccf-surface-elevated/60 border-border/50 text-ccf-muted hover:border-border hover:text-ccf-offwhite"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                  regType === "INDIVIDUAL"
                    ? "bg-ccf-gold text-ccf-navy-dark"
                    : "bg-ccf-surface text-ccf-muted"
                }`}
              >
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight">Individual</div>
                <div className="text-[11px] text-ccf-muted truncate">Single Participant</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setRegType("TEAM");
                setErrors({});
                setGeneralError(null);
              }}
              disabled={submitting}
              className={`p-3.5 rounded-lg border text-left transition-all flex items-center gap-3 ${
                regType === "TEAM"
                  ? "bg-ccf-gold/10 border-ccf-gold text-ccf-offwhite shadow-sm ring-1 ring-ccf-gold/50"
                  : "bg-ccf-surface-elevated/60 border-border/50 text-ccf-muted hover:border-border hover:text-ccf-offwhite"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                  regType === "TEAM"
                    ? "bg-ccf-gold text-ccf-navy-dark"
                    : "bg-ccf-surface text-ccf-muted"
                }`}
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight">Team</div>
                <div className="text-[11px] text-ccf-muted truncate">Multiple Students</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Category selector if both Crescent and External are eligible */}
      {isMixedEvent && (
        <div className="space-y-3 pb-6 border-b border-border/40">
          <Label className="text-xs uppercase font-mono tracking-wider text-ccf-muted">
            {regType === "TEAM" ? "Team Leader Category" : "Select Your Participant Category"}
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
        submitLabel={
          submitting
            ? "Processing Registration..."
            : regType === "TEAM"
            ? "Complete Team Registration"
            : "Complete Registration"
        }
      >
        {/* Team Roster Builder embedded when in team registration mode */}
        {regType === "TEAM" && (
          <TeamRosterBuilder
            primaryParticipant={{
              name: primaryName,
              participantType,
              identifierNormalized: primaryIdentifier,
              collegeNormalized: primaryCollege,
              phone: values.phone || values.whatsapp_number,
              academicDepartment: values.academic_department || values.department,
              year: values.year,
            }}
            teamName={teamName}
            onTeamNameChange={setTeamName}
            teamNameRequired={
              teamConfig?.teamNameRequired ?? (teamNameField ? teamNameField.required : true)
            }
            additionalMembers={additionalMembers}
            onAdditionalMembersChange={setAdditionalMembers}
            eligibilityCrescent={event.eligibilityCrescent}
            eligibilityExternal={event.eligibilityExternal}
            minTeamSize={teamConfig?.minTeamSize}
            maxTeamSize={teamConfig?.maxTeamSize}
            errors={errors}
            disabled={submitting}
          />
        )}
      </FormRenderer>
    </Card>
  );
}
