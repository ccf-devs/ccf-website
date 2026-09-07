"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  UserCheck,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";

export interface PaymentDetail {
  id: string;
  status: string;
  amount: string;
  currency?: string;
  upiId?: string | null;
  payeeName?: string | null;
  userReference?: string | null;
  paymentUri?: string | null;
  verifiedBy?: string | null;
  verifierName?: string | null;
  verifiedAt?: string | null;
  createdAt?: string;
}

export interface PaymentVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  registrationId: string;
  eventId: string;
  eventName: string;
  registrationCode: string;
  participantName: string;
  payment: PaymentDetail | null;
  onPaymentUpdated: (updatedPayment: PaymentDetail) => void;
}

export function PaymentVerificationDialog({
  isOpen,
  onClose,
  registrationId,
  eventId,
  eventName,
  registrationCode,
  participantName,
  payment,
  onPaymentUpdated,
}: PaymentVerificationDialogProps) {
  const [actionLoading, setActionLoading] = useState<"VERIFY" | "REJECT" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState(false);

  if (!isOpen || !payment) return null;

  const copyUtr = async () => {
    if (payment.userReference) {
      try {
        await navigator.clipboard.writeText(payment.userReference);
        setCopiedUtr(true);
        setTimeout(() => setCopiedUtr(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const handleAction = async (action: "VERIFY" | "REJECT") => {
    setErrorMessage(null);

    if (action === "REJECT") {
      const confirmed = window.confirm(
        `Are you sure you want to mark payment for "${participantName}" (${registrationCode}) as REJECTED?\n\nThis will invalidate the payment verification for this registration.`
      );
      if (!confirmed) return;
    }

    setActionLoading(action);

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/registrations/${registrationId}/payment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            notes: adminNotes.trim() || undefined,
            reason: action === "REJECT" ? adminNotes.trim() || undefined : undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update payment status.");
        return;
      }

      onPaymentUpdated(data.payment);
      setAdminNotes("");
      onClose();
    } catch {
      setErrorMessage("A network error occurred while communicating with the server.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-dialog-title"
    >
      <div className="bg-ccf-surface border border-border/80 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/40 flex items-start justify-between gap-4 bg-ccf-surface-elevated/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-ccf-gold">
                Payment Verification
              </span>
              <span className="text-border/60">•</span>
              <span className="font-mono text-xs text-ccf-muted">
                {registrationCode}
              </span>
            </div>
            <h2
              id="payment-dialog-title"
              className="text-lg font-bold text-ccf-offwhite flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5 text-ccf-gold shrink-0" />
              <span>{participantName}</span>
            </h2>
            <p className="text-xs text-ccf-muted">{eventName}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-md text-ccf-muted hover:text-ccf-offwhite"
            aria-label="Close payment dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Payment Summary Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-ccf-surface-elevated/60 p-4 rounded-xl border border-border/50">
            <div>
              <span className="text-ccf-muted block mb-0.5">Amount</span>
              <span className="text-base font-bold text-ccf-gold font-mono block">
                ₹{payment.amount}
              </span>
            </div>
            <div>
              <span className="text-ccf-muted block mb-0.5">Payment Status</span>
              <Badge
                variant={
                  payment.status === "VERIFIED"
                    ? "success"
                    : payment.status === "REJECTED"
                    ? "destructive"
                    : "warning"
                }
                className="text-xs font-mono"
              >
                {payment.status}
              </Badge>
            </div>
            {payment.upiId && (
              <div>
                <span className="text-ccf-muted block mb-0.5">Configured UPI ID</span>
                <span className="text-ccf-offwhite font-mono truncate block">
                  {payment.upiId}
                </span>
              </div>
            )}
            {payment.payeeName && (
              <div>
                <span className="text-ccf-muted block mb-0.5">Payee Name</span>
                <span className="text-ccf-offwhite truncate block">
                  {payment.payeeName}
                </span>
              </div>
            )}
          </div>

          {/* UTR / User Reference Card */}
          <div className="bg-ccf-surface-elevated/40 border border-border/60 rounded-xl p-4 space-y-2">
            <span className="text-xs font-mono uppercase text-ccf-muted tracking-wider block">
              Registrant-Submitted Reference (UTR)
            </span>
            {payment.userReference ? (
              <div className="flex items-center justify-between bg-ccf-surface p-2.5 rounded-lg border border-border/50">
                <span className="text-sm font-mono font-bold text-ccf-offwhite select-all">
                  {payment.userReference}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyUtr}
                  className="h-7 px-2 text-xs border-border/60 hover:border-ccf-gold"
                  title="Copy UTR to clipboard"
                >
                  {copiedUtr ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-ccf-surface text-ccf-muted text-xs italic">
                No UTR reference submitted by the registrant yet.
              </div>
            )}
          </div>

          {/* Verification Details (If Verified) */}
          {payment.status === "VERIFIED" && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Payment</span>
              </div>
              <div className="text-ccf-muted space-y-0.5">
                {payment.verifierName && (
                  <p className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-ccf-gold" />
                    <span>
                      Verified by: <strong className="text-ccf-offwhite">{payment.verifierName}</strong>
                    </span>
                  </p>
                )}
                {payment.verifiedAt && (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-ccf-gold" />
                    <span>
                      Verified on:{" "}
                      <span className="text-ccf-offwhite font-mono">
                        {new Date(payment.verifiedAt).toLocaleString("en-IN")}
                      </span>
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Admin Notes Input */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="admin-payment-notes"
              className="text-xs text-ccf-muted block font-medium"
            >
              Admin Audit Notes / Reason (Optional)
            </label>
            <Input
              id="admin-payment-notes"
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Verified against bank statement / UTR matched"
              disabled={Boolean(actionLoading)}
              className="h-9 text-xs bg-ccf-surface border-border/80"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/40 bg-ccf-surface-elevated/40 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={Boolean(actionLoading)}
            className="text-xs"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {payment.status === "PENDING" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(actionLoading)}
                onClick={() => handleAction("REJECT")}
                className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500"
              >
                {actionLoading === "REJECT" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Reject
              </Button>
            )}

            {payment.status !== "VERIFIED" && (
              <Button
                type="button"
                variant="gold"
                size="sm"
                disabled={Boolean(actionLoading)}
                onClick={() => handleAction("VERIFY")}
                className="text-xs"
              >
                {actionLoading === "VERIFY" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                Verify Payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
