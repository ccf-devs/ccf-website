"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Building2,
  Phone,
  User,
  Hash,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { CRESCENT_RRN_REGEX } from "@/lib/registrations/normalization";
import { PublicApplicationConfirmationView } from "@/lib/recruitment/types";

export interface DepartmentOption {
  id: string;
  name: string;
  slug?: string;
}

interface RecruitmentFormProps {
  departments: DepartmentOption[];
  defaultDepartmentId?: string;
  onSuccess?: (confirmation: PublicApplicationConfirmationView) => void;
}

export function RecruitmentForm({
  departments,
  defaultDepartmentId,
  onSuccess,
}: RecruitmentFormProps) {
  const [name, setName] = useState("");
  const [rrn, setRrn] = useState("");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || "");
  const [academicDepartment, setAcademicDepartment] = useState("");
  const [year, setYear] = useState("");
  const [phone, setPhone] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] =
    useState<PublicApplicationConfirmationView | null>(null);

  const validateClient = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters.";
    }

    const cleanRrn = rrn.trim();
    if (!cleanRrn) {
      errors.rrn = "Crescent RRN is required.";
    } else if (!CRESCENT_RRN_REGEX.test(cleanRrn)) {
      errors.rrn = "Crescent RRN must be exactly 12 digits starting with 2.";
    }

    if (!departmentId) {
      errors.departmentId = "Please select one desired CCF department.";
    }

    if (!academicDepartment.trim()) {
      errors.academicDepartment = "Current academic department is required.";
    }

    if (!year.trim()) {
      errors.year = "Year of study is required.";
    }

    const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, "");
    if (!cleanPhone) {
      errors.phone = "WhatsApp-enabled phone number is required.";
    } else if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      errors.phone = "Please enter a valid 10 to 15 digit phone number.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateClient()) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/recruitment/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          rrn: rrn.trim(),
          departmentId,
          academicDepartment: academicDepartment.trim(),
          year: year.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to submit recruitment application.");
        if (data.details?.fieldErrors) {
          const apiFieldErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(data.details.fieldErrors)) {
            if (Array.isArray(val) && val.length > 0) {
              apiFieldErrors[key] = String(val[0]);
            }
          }
          setFieldErrors(apiFieldErrors);
        }
        return;
      }

      setConfirmation(data.application);
      if (onSuccess) {
        onSuccess(data.application);
      }
    } catch {
      setFormError("A network error occurred. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <Card className="max-w-xl mx-auto p-6 md:p-8 bg-ccf-surface border-emerald-500/40 shadow-xl rounded-xl text-center space-y-6 animate-in fade-in">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Application Received
          </span>
          <h3 className="text-xl md:text-2xl font-bold text-ccf-offwhite">
            Thank You, {confirmation.name}!
          </h3>
          <p className="text-xs text-ccf-muted leading-relaxed">
            Your application for the{" "}
            <strong className="text-ccf-gold">{confirmation.departmentName}</strong>{" "}
            department has been recorded for review by CCF leadership.
          </p>
        </div>

        {confirmation.whatsappGroupUrl && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-left">
            <span className="text-xs font-semibold text-emerald-400 block">
              Official New Joiners WhatsApp Group
            </span>
            <p className="text-xs text-ccf-muted">
              Join our official WhatsApp group for applicant updates, announcements, and orientation details:
            </p>
            <Button asChild variant="gold" size="sm" className="w-full">
              <a
                href={confirmation.whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2"
              >
                <span>Join WhatsApp Group</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setConfirmation(null);
              setName("");
              setRrn("");
              setAcademicDepartment("");
              setYear("");
              setPhone("");
              setFieldErrors({});
            }}
            className="text-xs"
          >
            Submit Another Application
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      id="apply-form"
      className="max-w-xl mx-auto p-6 md:p-8 bg-ccf-surface border-border/80 shadow-xl rounded-xl space-y-6"
    >
      <div className="space-y-1 text-center md:text-left">
        <span className="text-xs font-mono uppercase tracking-wider text-ccf-gold font-semibold">
          Student Intake
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-ccf-offwhite">
          Recruitment Application Form
        </h3>
        <p className="text-xs text-ccf-muted">
          Exclusively for registered students of B.S. Abdur Rahman Crescent Institute of Science and Technology.
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="recruitment-name"
            className="text-xs font-medium text-ccf-offwhite flex items-center gap-1.5"
          >
            <User className="h-3.5 w-3.5 text-ccf-gold" />
            <span>Full Name</span>
            <span className="text-red-400">*</span>
          </label>
          <Input
            id="recruitment-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: "" }));
              }
            }}
            placeholder="Official student name as registered at Crescent"
            disabled={submitting}
            className={`h-9 text-xs bg-ccf-surface-elevated/50 border-border/80 ${
              fieldErrors.name ? "border-red-500" : ""
            }`}
          />
          {fieldErrors.name && (
            <p className="text-[11px] text-red-400">{fieldErrors.name}</p>
          )}
        </div>

        {/* Crescent RRN */}
        <div className="space-y-1.5">
          <label
            htmlFor="recruitment-rrn"
            className="text-xs font-medium text-ccf-offwhite flex items-center gap-1.5"
          >
            <Hash className="h-3.5 w-3.5 text-ccf-gold" />
            <span>Crescent RRN (12 Digits)</span>
            <span className="text-red-400">*</span>
          </label>
          <Input
            id="recruitment-rrn"
            type="text"
            value={rrn}
            onChange={(e) => {
              setRrn(e.target.value);
              if (fieldErrors.rrn) {
                setFieldErrors((prev) => ({ ...prev, rrn: "" }));
              }
            }}
            placeholder="e.g. 220071601001"
            maxLength={12}
            disabled={submitting}
            className={`h-9 text-xs font-mono bg-ccf-surface-elevated/50 border-border/80 ${
              fieldErrors.rrn ? "border-red-500" : ""
            }`}
          />
          {fieldErrors.rrn && (
            <p className="text-[11px] text-red-400">{fieldErrors.rrn}</p>
          )}
        </div>

        {/* Desired CCF Department */}
        <div className="space-y-1.5">
          <label
            htmlFor="recruitment-department"
            className="text-xs font-medium text-ccf-offwhite flex items-center gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5 text-ccf-gold" />
            <span>Desired CCF Department (Select Exactly One)</span>
            <span className="text-red-400">*</span>
          </label>
          <select
            id="recruitment-department"
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              if (fieldErrors.departmentId) {
                setFieldErrors((prev) => ({ ...prev, departmentId: "" }));
              }
            }}
            disabled={submitting}
            className={`h-9 w-full px-3 rounded-md border bg-ccf-surface-elevated/50 text-ccf-offwhite text-xs focus:outline-none focus:ring-1 focus:ring-ccf-gold border-border/80 ${
              fieldErrors.departmentId ? "border-red-500" : ""
            }`}
          >
            <option value="">-- Choose Desired CCF Department --</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {fieldErrors.departmentId && (
            <p className="text-[11px] text-red-400">{fieldErrors.departmentId}</p>
          )}
        </div>

        {/* Academic Department */}
        <div className="space-y-1.5">
          <label
            htmlFor="recruitment-academic-dept"
            className="text-xs font-medium text-ccf-offwhite flex items-center gap-1.5"
          >
            <GraduationCap className="h-3.5 w-3.5 text-ccf-gold" />
            <span>Current Academic Department / Major</span>
            <span className="text-red-400">*</span>
          </label>
          <Input
            id="recruitment-academic-dept"
            type="text"
            value={academicDepartment}
            onChange={(e) => {
              setAcademicDepartment(e.target.value);
              if (fieldErrors.academicDepartment) {
                setFieldErrors((prev) => ({ ...prev, academicDepartment: "" }));
              }
            }}
            placeholder="e.g. Computer Science and Engineering, Commerce, BBA"
            disabled={submitting}
            className={`h-9 text-xs bg-ccf-surface-elevated/50 border-border/80 ${
              fieldErrors.academicDepartment ? "border-red-500" : ""
            }`}
          />
          {fieldErrors.academicDepartment && (
            <p className="text-[11px] text-red-400">
              {fieldErrors.academicDepartment}
            </p>
          )}
        </div>

        {/* Year of Study */}
        <div className="space-y-1.5">
          <label
            htmlFor="recruitment-year"
            className="text-xs font-medium text-ccf-offwhite flex items-center gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5 text-ccf-gold" />
            <span>Year of Study</span>
            <span className="text-red-400">*</span>
          </label>
          <select
            id="recruitment-year"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              if (fieldErrors.year) {
                setFieldErrors((prev) => ({ ...prev, year: "" }));
              }
            }}
            disabled={submitting}
            className={`h-9 w-full px-3 rounded-md border bg-ccf-surface-elevated/50 text-ccf-offwhite text-xs focus:outline-none focus:ring-1 focus:ring-ccf-gold border-border/80 ${
              fieldErrors.year ? "border-red-500" : ""
            }`}
          >
            <option value="">-- Select Year of Study --</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
            <option value="Postgraduate (PG)">Postgraduate (PG)</option>
          </select>
          {fieldErrors.year && (
            <p className="text-[11px] text-red-400">{fieldErrors.year}</p>
          )}
        </div>

        {/* WhatsApp-enabled Phone */}
        <div className="space-y-1.5">
          <label
            htmlFor="recruitment-phone"
            className="text-xs font-medium text-ccf-offwhite flex items-center gap-1.5"
          >
            <Phone className="h-3.5 w-3.5 text-ccf-gold" />
            <span>WhatsApp-Enabled Phone Number</span>
            <span className="text-red-400">*</span>
          </label>
          <Input
            id="recruitment-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (fieldErrors.phone) {
                setFieldErrors((prev) => ({ ...prev, phone: "" }));
              }
            }}
            placeholder="e.g. 9876543210 or +91 9876543210"
            disabled={submitting}
            className={`h-9 text-xs font-mono bg-ccf-surface-elevated/50 border-border/80 ${
              fieldErrors.phone ? "border-red-500" : ""
            }`}
          />
          {fieldErrors.phone && (
            <p className="text-[11px] text-red-400">{fieldErrors.phone}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <Button
            type="submit"
            variant="gold"
            size="lg"
            disabled={submitting}
            className="w-full text-xs font-bold uppercase tracking-wider"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Submitting Application...</span>
              </>
            ) : (
              <span>Submit Application</span>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
