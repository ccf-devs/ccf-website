"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Check, ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegistrationConfirmation } from "@/lib/registrations/types";

interface RegistrationSuccessProps {
  confirmation: RegistrationConfirmation;
}

export function RegistrationSuccess({ confirmation }: RegistrationSuccessProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(confirmation.registrationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isPaid = Boolean(confirmation.payment);

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
          <span className="editorial-tag text-emerald-400">REGISTRATION SUCCESSFUL</span>
          <h1 className="text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
            You&apos;re Registered!
          </h1>
          <p className="text-sm text-ccf-muted max-w-md mx-auto">
            Your registration for <span className="text-ccf-offwhite font-medium">{confirmation.event.name}</span> has been confirmed.
          </p>
        </div>

        {/* Registration Code Display */}
        <div className="bg-ccf-surface-elevated/80 border border-border/60 rounded-xl p-5 space-y-2 max-w-md mx-auto">
          <span className="text-xs uppercase font-mono tracking-wider text-ccf-muted">
            Registration Code
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl md:text-2xl font-mono font-bold text-ccf-gold tracking-wide">
              {confirmation.registrationCode}
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
            Save this code for check-in and all event correspondence.
          </p>
        </div>

        {/* Participant & Event Summary Details */}
        <div className="grid grid-cols-2 gap-4 text-left max-w-md mx-auto text-xs bg-ccf-navy/40 p-4 rounded-lg border border-border/40">
          <div>
            <span className="text-ccf-muted block">Participant</span>
            <span className="text-ccf-offwhite font-medium truncate block">
              {confirmation.participantName}
            </span>
          </div>
          <div>
            <span className="text-ccf-muted block">Category</span>
            <span className="text-ccf-offwhite font-medium block">
              {confirmation.participantType === "CRESCENT" ? "Crescent Student" : "External Participant"}
            </span>
          </div>
          <div>
            <span className="text-ccf-muted block">Status</span>
            <span className="text-emerald-400 font-medium font-mono block">
              {confirmation.status}
            </span>
          </div>
          <div>
            <span className="text-ccf-muted block">Event Slug</span>
            <span className="text-ccf-offwhite font-mono block">
              {confirmation.event.slug}
            </span>
          </div>
        </div>

        {/* Payment Section (If PAID) */}
        {isPaid && confirmation.payment && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 text-left space-y-3 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="h-4 w-4" />
                Payment Required
              </span>
              <Badge variant="warning" className="text-[10px] font-mono">
                {confirmation.payment.status}
              </Badge>
            </div>
            <p className="text-xs text-ccf-muted leading-relaxed">
              Registration fee: <span className="font-semibold text-ccf-offwhite font-mono">₹{confirmation.payment.amount}</span>.
              Please complete payment via UPI.
            </p>
            {confirmation.payment.upiId && (
              <div className="bg-ccf-surface p-3 rounded border border-border/60 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-ccf-muted">UPI ID:</span>
                  <span className="text-ccf-gold font-bold">{confirmation.payment.upiId}</span>
                </div>
                {confirmation.payment.payeeName && (
                  <div className="flex justify-between">
                    <span className="text-ccf-muted">Payee:</span>
                    <span className="text-ccf-offwhite">{confirmation.payment.payeeName}</span>
                  </div>
                )}
              </div>
            )}
            {confirmation.payment.paymentUri && (
              <Button asChild variant="gold" size="sm" className="w-full">
                <a href={confirmation.payment.paymentUri} target="_blank" rel="noopener noreferrer">
                  Pay with UPI App
                </a>
              </Button>
            )}
            <p className="text-[11px] text-ccf-muted italic">
              Verification will be reviewed by the CCF administration team.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href={`/events/${confirmation.event.slug}`}>
              Back to Event Page
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
