"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Shield,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  EventStatus,
  EventCapacityMode,
  RegistrationMode,
  RegistrationMethod,
  PaymentMode,
  PaymentMethod,
} from "@prisma/client";
import {
  createEventSchema,
  formatZodErrors,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/lib/validation/event";

export interface EventFormInitialData {
  id?: string;
  name?: string;
  slug?: string;
  status?: EventStatus | string;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  venue?: string | null;
  capacityMode?: EventCapacityMode | string;
  capacity?: number | null;
  registrationMode?: RegistrationMode | string;
  registrationMethod?: RegistrationMethod | string;
  eligibilityCrescent?: boolean;
  eligibilityExternal?: boolean;
  registrationOpensAt?: Date | string | null;
  registrationClosesAt?: Date | string | null;
  paymentMode?: PaymentMode | string;
  paymentMethod?: PaymentMethod | string | null;
  feeAmount?: number | string | null;
  upiId?: string | null;
  payeeName?: string | null;
  // Canonical EventContent fields
  descriptionRich?: string | null;
  rulesRich?: string | null;
  instructionsRich?: string | null;
  eligibilityRich?: string | null;
  notesRich?: string | null;
}

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: EventFormInitialData;
  eventId?: string;
}

function formatDateForInput(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "";
  // Format as YYYY-MM-DDTHH:mm for datetime-local
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EventForm({ mode, initialData = {}, eventId }: EventFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(initialData.name || "");
  const [slug, setSlug] = useState(initialData.slug || "");
  const [status, setStatus] = useState<EventStatus>(
    (initialData.status as EventStatus) || EventStatus.DRAFT
  );
  const [startsAt, setStartsAt] = useState(formatDateForInput(initialData.startsAt));
  const [endsAt, setEndsAt] = useState(formatDateForInput(initialData.endsAt));
  const [venue, setVenue] = useState(initialData.venue || "");

  const [capacityMode, setCapacityMode] = useState<EventCapacityMode>(
    (initialData.capacityMode as EventCapacityMode) || EventCapacityMode.UNLIMITED
  );
  const [capacity, setCapacity] = useState<string>(
    initialData.capacity !== null && initialData.capacity !== undefined
      ? String(initialData.capacity)
      : ""
  );

  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>(
    (initialData.registrationMode as RegistrationMode) || RegistrationMode.NONE
  );
  const [registrationMethod, setRegistrationMethod] = useState<RegistrationMethod>(
    (initialData.registrationMethod as RegistrationMethod) || RegistrationMethod.NONE
  );
  const [eligibilityCrescent, setEligibilityCrescent] = useState<boolean>(
    initialData.eligibilityCrescent ?? false
  );
  const [eligibilityExternal, setEligibilityExternal] = useState<boolean>(
    initialData.eligibilityExternal ?? false
  );
  const [registrationOpensAt, setRegistrationOpensAt] = useState(
    formatDateForInput(initialData.registrationOpensAt)
  );
  const [registrationClosesAt, setRegistrationClosesAt] = useState(
    formatDateForInput(initialData.registrationClosesAt)
  );

  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    (initialData.paymentMode as PaymentMode) || PaymentMode.FREE
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(
    (initialData.paymentMethod as PaymentMethod) || ""
  );
  const [feeAmount, setFeeAmount] = useState<string>(
    initialData.feeAmount !== null && initialData.feeAmount !== undefined
      ? String(initialData.feeAmount)
      : ""
  );
  const [upiId, setUpiId] = useState(initialData.upiId || "");
  const [payeeName, setPayeeName] = useState(initialData.payeeName || "");

  // Canonical EventContent
  const [descriptionRich, setDescriptionRich] = useState(initialData.descriptionRich || "");
  const [rulesRich, setRulesRich] = useState(initialData.rulesRich || "");
  const [instructionsRich, setInstructionsRich] = useState(initialData.instructionsRich || "");
  const [eligibilityRich, setEligibilityRich] = useState(initialData.eligibilityRich || "");
  const [notesRich, setNotesRich] = useState(initialData.notesRich || "");

  // Form UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-slugify generator
  function handleGenerateSlug() {
    if (!name) return;
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generated);
  }

  // Allowed status options in edit mode
  const currentStatus = (initialData.status as EventStatus) || EventStatus.DRAFT;
  const allowedNextStatuses =
    mode === "edit"
      ? [currentStatus, ...(ALLOWED_STATUS_TRANSITIONS[currentStatus] || [])]
      : Object.values(EventStatus);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);
    setSuccessMessage(null);

    const payload: Record<string, any> = {
      name: name.trim(),
      slug: slug.trim(),
      status,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      venue: venue.trim() || null,
      capacityMode,
      capacity:
        capacityMode !== EventCapacityMode.UNLIMITED && capacity
          ? parseInt(capacity, 10)
          : null,
      registrationMode,
      registrationMethod,
      eligibilityCrescent,
      eligibilityExternal,
      registrationOpensAt: registrationOpensAt
        ? new Date(registrationOpensAt).toISOString()
        : null,
      registrationClosesAt: registrationClosesAt
        ? new Date(registrationClosesAt).toISOString()
        : null,
      paymentMode,
      paymentMethod: paymentMode === PaymentMode.PAID ? paymentMethod || null : null,
      feeAmount:
        paymentMode === PaymentMode.PAID && feeAmount ? parseFloat(feeAmount) : null,
      upiId: paymentMode === PaymentMode.PAID ? upiId.trim() || null : null,
      payeeName: paymentMode === PaymentMode.PAID ? payeeName.trim() || null : null,

      // Content fields
      descriptionRich: descriptionRich.trim() || null,
      rulesRich: rulesRich.trim() || null,
      instructionsRich: instructionsRich.trim() || null,
      eligibilityRich: eligibilityRich.trim() || null,
      notesRich: notesRich.trim() || null,
    };

    // Client-side pre-validation
    const validationResult = createEventSchema.safeParse(payload);
    if (!validationResult.success) {
      setErrors(formatZodErrors(validationResult.error));
      setGlobalError("Please correct the highlighted validation issues before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url =
        mode === "create"
          ? "/api/admin/events"
          : `/api/admin/events/${eventId}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrors(data.details);
        }
        setGlobalError(data.error || "Failed to save event. Please check the form.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        mode === "create"
          ? "Event created successfully! Redirecting to event details..."
          : "Event updated successfully! Redirecting to event details..."
      );

      const targetId = data.event?.id || eventId;
      setTimeout(() => {
        router.push(`/admin/events/${targetId}`);
        router.refresh();
      }, 1000);
    } catch {
      setGlobalError("A network or server communication error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Feedback Banners */}
      {globalError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-300 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-red-200">Validation Error</p>
            <p>{globalError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-300 flex items-start gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* 1. Core Event Information */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <Calendar className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Event Core Identity</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            Fundamental event name, URL slug identifier, and lifecycle status.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Name */}
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-name" required>
              Event Name
            </Label>
            <Input
              id="event-name"
              type="text"
              required
              placeholder="e.g. Magnora’26 Finance Symposium"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-red-400 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div className="md:col-span-6 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="event-slug" required>
                URL Slug
              </Label>
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="text-[11px] text-ccf-gold hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Auto-generate from name</span>
              </button>
            </div>
            <Input
              id="event-slug"
              type="text"
              required
              placeholder="e.g. magnora-26"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              aria-invalid={!!errors.slug}
            />
            {errors.slug && (
              <p className="text-xs text-red-400 mt-1">{errors.slug}</p>
            )}
          </div>

          {/* Status */}
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-status" required>
              Lifecycle Status
            </Label>
            <Select
              id="event-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            >
              {allowedNextStatuses.map((st) => (
                <option key={st} value={st} className="bg-ccf-surface">
                  {st}
                </option>
              ))}
            </Select>
            {errors.status && (
              <p className="text-xs text-red-400 mt-1">{errors.status}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Schedule & Venue */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <Clock className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Date, Time & Venue</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            Configure the official symposium timing and campus/external venue location.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-starts-at" required>
              Start Date & Time
            </Label>
            <Input
              id="event-starts-at"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              aria-invalid={!!errors.startsAt}
            />
            {errors.startsAt && (
              <p className="text-xs text-red-400 mt-1">{errors.startsAt}</p>
            )}
          </div>

          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-ends-at">
              End Date & Time (Optional)
            </Label>
            <Input
              id="event-ends-at"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              aria-invalid={!!errors.endsAt}
            />
            {errors.endsAt && (
              <p className="text-xs text-red-400 mt-1">{errors.endsAt}</p>
            )}
          </div>

          <div className="md:col-span-12 space-y-1.5">
            <Label htmlFor="event-venue">
              Venue / Location
            </Label>
            <Input
              id="event-venue"
              type="text"
              placeholder="e.g. Crescent Auditorium, B.S. Abdur Rahman Crescent Institute"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              aria-invalid={!!errors.venue}
            />
            {errors.venue && (
              <p className="text-xs text-red-400 mt-1">{errors.venue}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Registration Configuration & Window */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <FileText className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Registration Settings</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            Define whether registration is conducted internally, externally, or disabled.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-reg-mode" required>
              Registration Mode
            </Label>
            <Select
              id="event-reg-mode"
              value={registrationMode}
              onChange={(e) => {
                const mode = e.target.value as RegistrationMode;
                setRegistrationMode(mode);
                if (mode === RegistrationMode.NONE) {
                  setRegistrationMethod(RegistrationMethod.NONE);
                } else if (registrationMethod === RegistrationMethod.NONE) {
                  setRegistrationMethod(RegistrationMethod.BUILT_IN);
                }
              }}
            >
              <option value={RegistrationMode.NONE} className="bg-ccf-surface">
                NONE (No Registration)
              </option>
              <option value={RegistrationMode.INTERNAL} className="bg-ccf-surface">
                INTERNAL (CCF Platform)
              </option>
              <option value={RegistrationMode.EXTERNAL} className="bg-ccf-surface">
                EXTERNAL (External Form/Link)
              </option>
            </Select>
            {errors.registrationMode && (
              <p className="text-xs text-red-400 mt-1">{errors.registrationMode}</p>
            )}
          </div>

          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-reg-method" required>
              Registration Method
            </Label>
            <Select
              id="event-reg-method"
              value={registrationMethod}
              onChange={(e) =>
                setRegistrationMethod(e.target.value as RegistrationMethod)
              }
            >
              <option value={RegistrationMethod.NONE} className="bg-ccf-surface">
                NONE
              </option>
              <option value={RegistrationMethod.BUILT_IN} className="bg-ccf-surface">
                BUILT_IN (CCF Form Engine)
              </option>
              <option value={RegistrationMethod.GOOGLE_FORM} className="bg-ccf-surface">
                GOOGLE_FORM (Google Form Fallback)
              </option>
            </Select>
            {errors.registrationMethod && (
              <p className="text-xs text-red-400 mt-1">{errors.registrationMethod}</p>
            )}
          </div>

          {/* Registration Window */}
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-reg-opens-at">
              Registration Opens At
            </Label>
            <Input
              id="event-reg-opens-at"
              type="datetime-local"
              value={registrationOpensAt}
              onChange={(e) => setRegistrationOpensAt(e.target.value)}
              aria-invalid={!!errors.registrationOpensAt}
            />
            {errors.registrationOpensAt && (
              <p className="text-xs text-red-400 mt-1">{errors.registrationOpensAt}</p>
            )}
          </div>

          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-reg-closes-at">
              Registration Closes At
            </Label>
            <Input
              id="event-reg-closes-at"
              type="datetime-local"
              value={registrationClosesAt}
              onChange={(e) => setRegistrationClosesAt(e.target.value)}
              aria-invalid={!!errors.registrationClosesAt}
            />
            {errors.registrationClosesAt && (
              <p className="text-xs text-red-400 mt-1">{errors.registrationClosesAt}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Eligibility & Capacity */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <Shield className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Eligibility & Capacity Limits</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            Configure participant audience permissions and enforce concurrency-safe capacity bounds.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Eligibility Checkboxes */}
          <div className="md:col-span-12 space-y-2">
            <Label>Eligible Audiences</Label>
            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-ccf-offwhite cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={eligibilityCrescent}
                  onChange={(e) => setEligibilityCrescent(e.target.checked)}
                  className="rounded border-border/80 bg-ccf-surface-sunken text-ccf-gold focus:ring-ccf-gold h-4 w-4"
                />
                <span>Crescent Students (Verified RRN)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-ccf-offwhite cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={eligibilityExternal}
                  onChange={(e) => setEligibilityExternal(e.target.checked)}
                  className="rounded border-border/80 bg-ccf-surface-sunken text-ccf-gold focus:ring-ccf-gold h-4 w-4"
                />
                <span>External College Students</span>
              </label>
            </div>
            {errors.eligibilityCrescent && (
              <p className="text-xs text-red-400 mt-1">{errors.eligibilityCrescent}</p>
            )}
          </div>

          {/* Capacity Mode */}
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-capacity-mode" required>
              Capacity Mode
            </Label>
            <Select
              id="event-capacity-mode"
              value={capacityMode}
              onChange={(e) =>
                setCapacityMode(e.target.value as EventCapacityMode)
              }
            >
              <option value={EventCapacityMode.UNLIMITED} className="bg-ccf-surface">
                UNLIMITED (No capacity ceiling)
              </option>
              <option value={EventCapacityMode.PARTICIPANTS} className="bg-ccf-surface">
                PARTICIPANTS (Fixed individual limit)
              </option>
              <option value={EventCapacityMode.TEAMS} className="bg-ccf-surface">
                TEAMS (Fixed team limit)
              </option>
            </Select>
            {errors.capacityMode && (
              <p className="text-xs text-red-400 mt-1">{errors.capacityMode}</p>
            )}
          </div>

          {/* Capacity Limit */}
          {capacityMode !== EventCapacityMode.UNLIMITED && (
            <div className="md:col-span-6 space-y-1.5">
              <Label htmlFor="event-capacity" required>
                Maximum Capacity Limit
              </Label>
              <Input
                id="event-capacity"
                type="number"
                min="1"
                required
                placeholder="e.g. 150"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                aria-invalid={!!errors.capacity}
              />
              {errors.capacity && (
                <p className="text-xs text-red-400 mt-1">{errors.capacity}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Payment & Financial Architecture */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Payment & Registration Fees</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            Configure free admission or manual UPI payment reconciliation details.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="event-payment-mode" required>
              Payment Mode
            </Label>
            <Select
              id="event-payment-mode"
              value={paymentMode}
              onChange={(e) => {
                const mode = e.target.value as PaymentMode;
                setPaymentMode(mode);
                if (mode === PaymentMode.FREE) {
                  setPaymentMethod("");
                  setFeeAmount("");
                } else if (!paymentMethod) {
                  setPaymentMethod(PaymentMethod.MANUAL_UPI);
                }
              }}
            >
              <option value={PaymentMode.FREE} className="bg-ccf-surface">
                FREE (No fee required)
              </option>
              <option value={PaymentMode.PAID} className="bg-ccf-surface">
                PAID (Requires payment verification)
              </option>
            </Select>
            {errors.paymentMode && (
              <p className="text-xs text-red-400 mt-1">{errors.paymentMode}</p>
            )}
          </div>

          {paymentMode === PaymentMode.PAID && (
            <>
              <div className="md:col-span-6 space-y-1.5">
                <Label htmlFor="event-payment-method" required>
                  Payment Method
                </Label>
                <Select
                  id="event-payment-method"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                >
                  <option value={PaymentMethod.MANUAL_UPI} className="bg-ccf-surface">
                    MANUAL_UPI (CCF QR / Manual UPI Verification)
                  </option>
                  <option value={PaymentMethod.PROVIDER} className="bg-ccf-surface">
                    PROVIDER (Payment Gateway Provider)
                  </option>
                </Select>
                {errors.paymentMethod && (
                  <p className="text-xs text-red-400 mt-1">{errors.paymentMethod}</p>
                )}
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="event-fee-amount" required>
                  Fee Amount (INR ₹)
                </Label>
                <Input
                  id="event-fee-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="e.g. 150.00"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  aria-invalid={!!errors.feeAmount}
                />
                {errors.feeAmount && (
                  <p className="text-xs text-red-400 mt-1">{errors.feeAmount}</p>
                )}
              </div>

              {paymentMethod === PaymentMethod.MANUAL_UPI && (
                <>
                  <div className="md:col-span-4 space-y-1.5">
                    <Label htmlFor="event-upi-id" required>
                      Official UPI ID
                    </Label>
                    <Input
                      id="event-upi-id"
                      type="text"
                      required
                      placeholder="e.g. crescentfinance@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      aria-invalid={!!errors.upiId}
                    />
                    {errors.upiId && (
                      <p className="text-xs text-red-400 mt-1">{errors.upiId}</p>
                    )}
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <Label htmlFor="event-payee-name" required>
                      Beneficiary Payee Name
                    </Label>
                    <Input
                      id="event-payee-name"
                      type="text"
                      required
                      placeholder="e.g. Crescent Club of Finance"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      aria-invalid={!!errors.payeeName}
                    />
                    {errors.payeeName && (
                      <p className="text-xs text-red-400 mt-1">{errors.payeeName}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 6. Canonical Event Content (Correction 6: Exact 5 model fields) */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <FileText className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Event Documentation & Content</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            The 5 canonical rich documentation fields defined in the CCF EventContent model.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-description-rich">
              Overview & Description (`description_rich`)
            </Label>
            <Textarea
              id="event-description-rich"
              rows={3}
              placeholder="Detailed introduction to the symposium, objectives, and schedule..."
              value={descriptionRich}
              onChange={(e) => setDescriptionRich(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-rules-rich">
              Competition Rules (`rules_rich`)
            </Label>
            <Textarea
              id="event-rules-rich"
              rows={2}
              placeholder="Official competition rules, rounds, code of conduct..."
              value={rulesRich}
              onChange={(e) => setRulesRich(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-instructions-rich">
              Participant Instructions (`instructions_rich`)
            </Label>
            <Textarea
              id="event-instructions-rich"
              rows={2}
              placeholder="Check-in requirements, dress code, materials to bring..."
              value={instructionsRich}
              onChange={(e) => setInstructionsRich(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-eligibility-rich">
              Eligibility Details (`eligibility_rich`)
            </Label>
            <Textarea
              id="event-eligibility-rich"
              rows={2}
              placeholder="Specific year restrictions, departmental requirements, or prerequisites..."
              value={eligibilityRich}
              onChange={(e) => setEligibilityRich(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-notes-rich">
              Administrative & Operational Notes (`notes_rich`)
            </Label>
            <Textarea
              id="event-notes-rich"
              rows={2}
              placeholder="Internal operational notes for club executives and coordinators..."
              value={notesRich}
              onChange={(e) => setNotesRich(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          asChild
          type="button"
          variant="outline"
          className="border-border text-ccf-muted hover:text-ccf-offwhite"
        >
          <Link href="/admin/events">
            <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
            <span>Cancel & Return</span>
          </Link>
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold shadow-sm px-6"
        >
          <Save className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>
            {isSubmitting
              ? "Saving..."
              : mode === "create"
              ? "Create Event"
              : "Update Event"}
          </span>
        </Button>
      </div>
    </form>
  );
}
