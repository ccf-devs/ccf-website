"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  QrCode,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RegistrationConfirmation } from "@/lib/registrations/types";
import { generateUpiQrCodeDataUrl } from "@/lib/payments/upi";

interface RegistrationSuccessProps {
  confirmation: RegistrationConfirmation;
}

export function RegistrationSuccess({ confirmation }: RegistrationSuccessProps) {
  const [copied, setCopied] = React.useState(false);

  // Payment state
  const isPaid = Boolean(confirmation.payment);
  const initialHasReference = Boolean(
    confirmation.payment?.userReference &&
      confirmation.payment?.status !== "REJECTED"
  );
  const initialIsVerified = confirmation.payment?.status === "VERIFIED";

  const [revealedRegistrationCode, setRevealedRegistrationCode] =
    React.useState<string | null>(() => {
      if (isPaid && !initialHasReference && !initialIsVerified) {
        return null;
      }
      return confirmation.registrationCode || null;
    });
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [qrLoading, setQrLoading] = React.useState(Boolean(confirmation.payment?.paymentUri));
  const [currentPaymentStatus, setCurrentPaymentStatus] = React.useState(
    confirmation.payment?.status || "PENDING"
  );
  const [userReference, setUserReference] = React.useState(
    confirmation.payment?.userReference || ""
  );
  const [submittingReference, setSubmittingReference] = React.useState(false);
  const [referenceSubmitted, setReferenceSubmitted] = React.useState(
    Boolean(confirmation.payment?.userReference)
  );
  const [referenceSuccessMsg, setReferenceSuccessMsg] = React.useState<string | null>(
    confirmation.payment?.userReference ? "Payment reference on file." : null
  );
  const [referenceError, setReferenceError] = React.useState<string | null>(null);

  const copyToClipboard = async () => {
    if (!revealedRegistrationCode) return;
    try {
      await navigator.clipboard.writeText(revealedRegistrationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Generate dynamic QR code in-memory on mount if payment URI is present
  React.useEffect(() => {
    let isMounted = true;
    if (confirmation.payment?.paymentUri) {
      generateUpiQrCodeDataUrl(confirmation.payment.paymentUri)
        .then((dataUrl) => {
          if (isMounted) {
            setQrDataUrl(dataUrl);
            setQrLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to generate dynamic payment QR:", err);
          if (isMounted) {
            setQrLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [confirmation.payment?.paymentUri]);

  // Handle UTR reference submission
  const handleReferenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReferenceError(null);
    setReferenceSuccessMsg(null);

    const trimmed = userReference.trim();
    if (!trimmed) {
      setReferenceError("Please enter your 12-digit UPI UTR number.");
      return;
    }

    if (!/^\d{12}$/.test(trimmed)) {
      setReferenceError("Payment reference / UTR must be exactly 12 numeric digits.");
      return;
    }

    setSubmittingReference(true);
    try {
      const identifier = revealedRegistrationCode || confirmation.registrationCode || confirmation.id;
      const res = await fetch(
        `/api/events/${confirmation.event.slug}/registrations/${identifier}/payment-reference`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userReference: trimmed }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setReferenceError(data.error || "Failed to submit reference. Please check and try again.");
        return;
      }

      setReferenceSubmitted(true);
      setReferenceSuccessMsg("Your payment details have been submitted and are awaiting verification by the CCF team.");
      if (data.payment?.status) {
        setCurrentPaymentStatus(data.payment.status);
      }
      if (data.registrationCode) {
        setRevealedRegistrationCode(data.registrationCode);
      }
    } catch {
      setReferenceError("Network error while submitting reference. Please try again.");
    } finally {
      setSubmittingReference(false);
    }
  };

  const hasSubmittedReference =
    referenceSubmitted && currentPaymentStatus !== "REJECTED";
  const isVerified = currentPaymentStatus === "VERIFIED";
  const isRejected = currentPaymentStatus === "REJECTED";

  let statusTag: string;
  let statusTagColor: string;
  let mainTitle: string;
  let headerDescription: React.ReactNode;

  if (!isPaid) {
    statusTag = "REGISTRATION SUCCESSFUL";
    statusTagColor = "text-emerald-400";
    mainTitle = "You're Registered!";
    headerDescription = (
      <>
        Your registration for{" "}
        <span className="text-ccf-offwhite font-medium">
          {confirmation.event?.name || (confirmation as any).eventName || "this event"}
        </span>{" "}
        has been confirmed.
      </>
    );
  } else if (isVerified) {
    statusTag = "REGISTRATION CONFIRMED";
    statusTagColor = "text-emerald-400";
    mainTitle = "Registration Confirmed";
    headerDescription = (
      <>
        Your payment has been verified and your registration for{" "}
        <span className="text-ccf-offwhite font-medium">
          {confirmation.event?.name || (confirmation as any).eventName || "this event"}
        </span>{" "}
        is confirmed.
      </>
    );
  } else if (isRejected) {
    statusTag = "PAYMENT REJECTED";
    statusTagColor = "text-red-400";
    mainTitle = "Payment Rejected";
    headerDescription = (
      <>
        Your payment reference could not be verified by the CCF team. Please check your transaction details and resubmit your 12-digit UTR below.
      </>
    );
  } else if (hasSubmittedReference) {
    statusTag = "PAYMENT SUBMITTED";
    statusTagColor = "text-amber-400";
    mainTitle = "Payment Submitted";
    headerDescription = (
      <>
        Your payment details have been submitted and are awaiting verification by the CCF team.
      </>
    );
  } else {
    statusTag = "PAYMENT REQUIRED";
    statusTagColor = "text-amber-400";
    mainTitle = "Complete Your Payment";
    headerDescription = (
      <>
        Please complete your payment via UPI to proceed with your registration for{" "}
        <span className="text-ccf-offwhite font-medium">
          {confirmation.event?.name || (confirmation as any).eventName || "this event"}
        </span>.
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card className="bg-ccf-surface border-ccf-gold/30 p-6 md:p-8 space-y-6 shadow-xl text-center relative overflow-hidden">
        {/* Subtle accent glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-ccf-gold/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <span className={`editorial-tag ${statusTagColor}`}>{statusTag}</span>
          <h1 className="text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
            {mainTitle}
          </h1>
          <p className="text-sm text-ccf-muted max-w-md mx-auto">
            {headerDescription}
          </p>
        </div>

        {/* Registration Code Display (withheld for paid events until UTR submission) */}
        {revealedRegistrationCode && (
          <div className="bg-ccf-surface-elevated/80 border border-border/60 rounded-xl p-5 space-y-2 max-w-md mx-auto">
            <span className="text-xs uppercase font-mono tracking-wider text-ccf-muted">
              Registration Code
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl md:text-2xl font-mono font-bold text-ccf-gold tracking-wide">
                {revealedRegistrationCode}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="h-8 px-2 text-xs border-border/50 hover:border-ccf-gold"
                title="Copy registration code"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-ccf-muted">
              Save this code for event check-in and future correspondence.
            </p>
          </div>
        )}

        {/* Team Details (If Team Registration) */}
        {confirmation.registrationType === "TEAM" && (
          <div className="bg-ccf-surface-elevated/80 border border-border/60 rounded-xl p-5 space-y-4 max-w-md mx-auto text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-ccf-gold">
                  Team Registration
                </span>
                <h3 className="text-base font-bold text-ccf-offwhite">
                  {confirmation.team?.name || "Team Roster"}
                </h3>
              </div>
              <Badge variant="gold" className="text-xs font-mono">
                {confirmation.team?.members.length ?? 1} Members
              </Badge>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-ccf-muted">
                Confirmed Roster
              </span>
              <div className="divide-y divide-border/30 rounded-lg border border-border/40 bg-ccf-navy/40 overflow-hidden text-xs">
                {(confirmation.team?.members || [
                  {
                    name: confirmation.participantName,
                    participantType: confirmation.participantType,
                    isLeader: true,
                  },
                ]).map((member, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-ccf-offwhite truncate">
                        {member.name}
                      </span>
                      {member.isLeader && (
                        <Badge variant="gold" className="text-[9px] px-1 py-0">
                          Leader
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-ccf-muted">
                        {member.participantType}
                      </span>
                      {member.identifierNormalized && (
                        <span className="text-[10px] font-mono text-ccf-gold">
                          {member.identifierNormalized}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment Section (If PAID) */}
        {isPaid && confirmation.payment && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 text-left space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="h-4 w-4" />
                {isVerified
                  ? "Payment Verified"
                  : isRejected
                  ? "Payment Rejected"
                  : hasSubmittedReference
                  ? "Payment Submitted"
                  : "Payment Required"}
              </span>
              <Badge
                variant={
                  currentPaymentStatus === "VERIFIED"
                    ? "success"
                    : currentPaymentStatus === "REJECTED"
                    ? "destructive"
                    : hasSubmittedReference
                    ? "warning"
                    : "secondary"
                }
                className="text-[10px] font-mono"
              >
                {currentPaymentStatus === "VERIFIED"
                  ? "VERIFIED"
                  : currentPaymentStatus === "REJECTED"
                  ? "REJECTED"
                  : hasSubmittedReference
                  ? "SUBMITTED"
                  : "PENDING"}
              </Badge>
            </div>

            <p className="text-xs text-ccf-muted leading-relaxed">
              Registration fee:{" "}
              <span className="font-semibold text-ccf-offwhite font-mono text-sm">
                ₹{confirmation.payment.amount}
              </span>
              . Please complete payment via UPI.
            </p>

            {/* Payee Details */}
            {confirmation.payment.upiId && (
              <div className="bg-ccf-surface p-3 rounded-lg border border-border/60 text-xs font-mono space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-ccf-muted">UPI ID:</span>
                  <span className="text-ccf-gold font-bold select-all">
                    {confirmation.payment.upiId}
                  </span>
                </div>
                {confirmation.payment.payeeName && (
                  <div className="flex justify-between items-center">
                    <span className="text-ccf-muted">Payee:</span>
                    <span className="text-ccf-offwhite font-medium">
                      {confirmation.payment.payeeName}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic QR Code */}
            {confirmation.payment.paymentUri && (
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-border/40 shadow-inner">
                  {qrLoading ? (
                    <div className="h-48 w-48 flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="h-6 w-6 animate-spin text-ccf-gold" />
                      <span className="text-xs font-mono">Generating dynamic QR...</span>
                    </div>
                  ) : qrDataUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrDataUrl}
                        alt="Scan to Pay with UPI"
                        className="w-48 h-48 object-contain"
                      />
                      <span className="text-[11px] text-gray-700 font-mono mt-1 font-semibold">
                        Scan with GPay / PhonePe / Paytm / Any UPI App
                      </span>
                    </>
                  ) : (
                    <div className="h-48 w-48 flex items-center justify-center text-xs text-gray-500 font-mono">
                      QR code unavailable
                    </div>
                  )}
                </div>

                {/* Mobile UPI Intent Button */}
                <Button asChild variant="gold" size="sm" className="w-full md:hidden">
                  <a
                    href={confirmation.payment.paymentUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Pay with UPI App</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            )}

            {/* UTR Reference Submission Form */}
            <div className="pt-2 border-t border-border/40 space-y-3">
              <div>
                <span className="text-xs font-semibold text-ccf-offwhite block">
                  Submit Payment Reference (UTR)
                </span>
                <span className="text-[11px] text-ccf-muted block">
                  After completing the payment, enter your 12-digit UTR below. Your payment will be verified by the CCF team.
                </span>
              </div>

              <form onSubmit={handleReferenceSubmit} className="space-y-2.5">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={userReference}
                    onChange={(e) =>
                      setUserReference(e.target.value.replace(/\D/g, "").slice(0, 12))
                    }
                    placeholder="e.g. 408112345678 (12-digit UTR)"
                    disabled={submittingReference || currentPaymentStatus === "VERIFIED"}
                    className="h-9 text-xs font-mono bg-ccf-surface border-border/80 focus-visible:border-ccf-gold"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={submittingReference || currentPaymentStatus === "VERIFIED"}
                    className="h-9 px-3 text-xs border-ccf-gold/50 text-ccf-gold hover:bg-ccf-gold/10 shrink-0"
                  >
                    {submittingReference ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : hasSubmittedReference ? (
                      "Update UTR"
                    ) : (
                      "Submit UTR"
                    )}
                  </Button>
                </div>

                {referenceError && (
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{referenceError}</span>
                  </div>
                )}

                {referenceSuccessMsg && (
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{referenceSuccessMsg}</span>
                  </div>
                )}
              </form>

              <p className="text-[11px] text-ccf-muted italic">
                After completing the payment, enter your 12-digit UTR below. Your payment will be verified by the CCF team.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href={`/events/${confirmation.event.slug}`}>
              Back to Event
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/events" className="inline-flex items-center gap-1.5 text-ccf-gold hover:text-ccf-gold-light">
              <span>Explore More Events</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
