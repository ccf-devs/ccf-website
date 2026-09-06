import React from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Shield,
  CreditCard,
  FileText,
  Edit,
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EventStatusBadge } from "./event-status-badge";
import {
  EventStatus,
  EventCapacityMode,
  RegistrationMode,
  RegistrationMethod,
  PaymentMode,
  PaymentMethod,
} from "@prisma/client";

export interface EventDetailData {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  venue: string | null;
  capacityMode: EventCapacityMode;
  capacity: number | null;
  registrationMode: RegistrationMode;
  registrationMethod: RegistrationMethod;
  eligibilityCrescent: boolean;
  eligibilityExternal: boolean;
  registrationOpensAt: Date | string | null;
  registrationClosesAt: Date | string | null;
  activeFormVersionId: string | null;
  paymentMode: PaymentMode;
  paymentMethod: PaymentMethod | null;
  feeAmount: any;
  upiId: string | null;
  payeeName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  content?: {
    descriptionRich?: string | null;
    rulesRich?: string | null;
    instructionsRich?: string | null;
    eligibilityRich?: string | null;
    notesRich?: string | null;
  } | null;
}

interface EventDetailViewProps {
  event: EventDetailData;
}

function formatDateDisplay(val: Date | string | null | undefined): string {
  if (!val) return "Not specified";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventDetailView({ event }: EventDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-border text-ccf-muted hover:text-ccf-offwhite"
          >
            <Link href="/admin/events">
              <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
              <span>Back to Events</span>
            </Link>
          </Button>

          <EventStatusBadge status={event.status} />
        </div>

        <div className="flex items-center gap-2">
          {event.registrationMode !== RegistrationMode.NONE && (
            <Button
              asChild
              variant="outline"
              className="border-ccf-gold/40 text-ccf-gold hover:border-ccf-gold hover:bg-ccf-gold/10"
            >
              <Link href={`/admin/events/${event.id}/form`}>
                <FileText className="h-4 w-4 mr-1.5" aria-hidden="true" />
                <span>Manage Form Engine</span>
              </Link>
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            className="border-border text-ccf-muted hover:text-ccf-offwhite"
          >
            <Link href={`/admin/events/${event.id}/edit`}>
              <Edit className="h-4 w-4 mr-1.5" aria-hidden="true" />
              <span>Edit Configuration</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Configuration Grid (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Schedule & Location */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Calendar className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Schedule & Venue</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Official timing and campus location settings.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Starts At</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.startsAt)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Ends At</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.endsAt)}
              </span>
            </div>

            <div className="flex items-start justify-between pt-1">
              <span className="text-ccf-muted">Venue</span>
              <span className="font-semibold text-ccf-offwhite text-right max-w-xs">
                {event.venue || "None assigned"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Registration Configuration */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <FileText className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Registration Mode & Method</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Platform registration behavior and intake window.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Registration Mode</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.registrationMode}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Registration Method</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.registrationMethod}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Window Opens</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.registrationOpensAt)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Window Closes</span>
              <span className="font-semibold text-ccf-offwhite">
                {formatDateDisplay(event.registrationClosesAt)}
              </span>
            </div>

            {event.registrationMode !== RegistrationMode.NONE && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-ccf-muted">Form Engine</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ccf-offwhite">
                    {event.activeFormVersionId ? "Active Form Configured" : "No Form Published"}
                  </span>
                  <Link
                    href={`/admin/events/${event.id}/form`}
                    className="text-ccf-gold hover:underline text-[11px] font-medium"
                  >
                    Open Builder &rarr;
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Eligibility & Capacity */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Shield className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Eligibility & Capacity</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Participant group authorization and capacity mode.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Crescent Students</span>
              <span className="font-semibold inline-flex items-center gap-1">
                {event.eligibilityCrescent ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Eligible</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-ccf-muted" />
                    <span className="text-ccf-muted">Restricted</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">External Students</span>
              <span className="font-semibold inline-flex items-center gap-1">
                {event.eligibilityExternal ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Eligible</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-ccf-muted" />
                    <span className="text-ccf-muted">Restricted</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Capacity Mode</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.capacityMode}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-ccf-muted">Configured Limit</span>
              <span className="font-semibold text-ccf-offwhite font-mono">
                {event.capacityMode === EventCapacityMode.UNLIMITED
                  ? "Unlimited"
                  : event.capacity ?? "Not set"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Payment & Accounting */}
        <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Payment & Accounting</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Registration fee and UPI collection configuration.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-ccf-muted">Payment Mode</span>
              <span className="font-semibold text-ccf-offwhite">
                {event.paymentMode}
              </span>
            </div>

            {event.paymentMode === PaymentMode.PAID ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-ccf-muted">Payment Method</span>
                  <span className="font-semibold text-ccf-offwhite">
                    {event.paymentMethod || "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-ccf-muted">Registration Fee</span>
                  <span className="font-bold text-ccf-gold font-mono">
                    ₹{Number(event.feeAmount).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-ccf-muted">UPI ID</span>
                  <span className="font-mono text-ccf-offwhite">
                    {event.upiId || "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-ccf-muted">Payee Name</span>
                  <span className="font-semibold text-ccf-offwhite">
                    {event.payeeName || "None"}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-ccf-muted">
                This event is free to register. No fee collection required.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Canonical EventContent Section (Correction 6: Exact 5 model fields) */}
      <Card className="border-border/60 bg-ccf-surface p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <FileText className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Event Documentation & Content (`event_content`)</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            The 5 canonical documentation fields associated with this event record.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5 md:col-span-2">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Overview & Description (`description_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.descriptionRich || "No description provided."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Competition Rules (`rules_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.rulesRich || "No rules provided."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Participant Instructions (`instructions_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.instructionsRich || "No instructions provided."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Eligibility Criteria (`eligibility_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.eligibilityRich || "No specific eligibility notes."}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 space-y-1.5">
            <span className="text-[10px] font-semibold text-ccf-gold uppercase tracking-wider block">
              Administrative Notes (`notes_rich`)
            </span>
            <p className="text-ccf-offwhite whitespace-pre-wrap leading-relaxed">
              {event.content?.notesRich || "No administrative notes."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Identifiers & Timestamps */}
      <Card className="border-border/60 bg-ccf-surface-sunken p-4 shadow-sm text-xs text-ccf-muted">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-ccf-muted" aria-hidden="true" />
            <span>Database UUID:</span>
            <code className="font-mono text-ccf-offwhite">{event.id}</code>
          </div>
          <div className="flex items-center gap-4">
            <span>Created: {formatDateDisplay(event.createdAt)}</span>
            <span>Updated: {formatDateDisplay(event.updatedAt)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
