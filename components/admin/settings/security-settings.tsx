"use client";

import React, { useState } from "react";
import { AdminRole } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  ShieldCheck,
  KeyRound,
  QrCode,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  RefreshCw,
  Loader2,
  X,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { formatAdminRole } from "@/components/admin";

export interface SecuritySettingsProps {
  admin: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
  initialIsTotpEnabled: boolean;
  initialTotpUpdatedAt: string | null;
  initialRecoveryCodesCount: number;
}

export function SecuritySettings({
  admin,
  initialIsTotpEnabled,
  initialTotpUpdatedAt,
  initialRecoveryCodesCount,
}: SecuritySettingsProps) {
  // TOTP State
  const [isTotpEnabled, setIsTotpEnabled] = useState(initialIsTotpEnabled);
  const [totpUpdatedAt, setTotpUpdatedAt] = useState<string | null>(initialTotpUpdatedAt);
  const [isTotpModalOpen, setIsTotpModalOpen] = useState(false);
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [totpVerifyLoading, setTotpVerifyLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [showManualKey, setShowManualKey] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpSuccess, setTotpSuccess] = useState<string | null>(null);

  // Recovery Codes State
  const [recoveryCodesCount, setRecoveryCodesCount] = useState(initialRecoveryCodesCount);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryGenerateLoading, setRecoveryGenerateLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedManualKey, setCopiedManualKey] = useState(false);

  // --- TOTP HANDLERS ---

  const handleOpenTotpSetup = async () => {
    setIsTotpModalOpen(true);
    setTotpSetupLoading(true);
    setTotpError(null);
    setVerificationCode("");
    setShowManualKey(false);

    try {
      const res = await fetch("/api/admin/auth/totp/setup", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to initiate TOTP setup. Please try again.");
      }

      const data = await res.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setOtpauthUri(data.otpauthUri);

      // Extract secret from URI query param for manual entry fallback
      try {
        const parsed = new URL(data.otpauthUri);
        const secretParam = parsed.searchParams.get("secret");
        setManualKey(secretParam);
      } catch {
        setManualKey(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load authenticator setup.";
      setTotpError(message);
    } finally {
      setTotpSetupLoading(false);
    }
  };

  const handleVerifyTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length !== 6) {
      setTotpError("Please enter a valid 6-digit authentication code.");
      return;
    }

    setTotpVerifyLoading(true);
    setTotpError(null);

    try {
      const res = await fetch("/api/admin/auth/totp/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid code. Please try again.");
      }

      setIsTotpEnabled(true);
      setTotpUpdatedAt(new Date().toISOString());
      setTotpSuccess("Authenticator app successfully verified and enabled for your account!");
      setIsTotpModalOpen(false);
      // Clean up setup memory
      setQrCodeDataUrl(null);
      setOtpauthUri(null);
      setManualKey(null);
      setVerificationCode("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to verify authentication code.";
      setTotpError(message);
    } finally {
      setTotpVerifyLoading(false);
    }
  };

  // --- RECOVERY CODE HANDLERS ---

  const handleGenerateRecoveryCodes = async () => {
    setRecoveryGenerateLoading(true);
    setRecoveryError(null);

    try {
      const res = await fetch("/api/admin/auth/recovery/generate", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate recovery codes.");
      }

      const data = await res.json();
      if (!Array.isArray(data.codes) || data.codes.length === 0) {
        throw new Error("Invalid response received from recovery code generator.");
      }

      setGeneratedCodes(data.codes);
      setRecoveryCodesCount(data.codes.length);
      setIsRecoveryModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate recovery codes.";
      setRecoveryError(message);
    } finally {
      setRecoveryGenerateLoading(false);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    if (!generatedCodes) return;
    const text = generatedCodes.join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const handleDownloadRecoveryCodes = () => {
    if (!generatedCodes) return;
    const content = `Crescent Club of Finance (CCF) — Emergency Recovery Codes\nAccount: ${admin.email}\nGenerated: ${new Date().toISOString()}\n\nKeep these codes in a secure, encrypted location. Each code can be used ONCE to authenticate in break-glass scenarios.\n\n${generatedCodes.join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ccf-recovery-codes-${admin.email.replace(/[^a-zA-Z0-9]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* 1. Global Success / Notice Banners */}
      {totpSuccess && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-semibold text-emerald-400">{totpSuccess}</p>
            <p className="text-xs text-ccf-muted">
              You can now use your authenticator app as a fallback login method.
            </p>
          </div>
          <button
            onClick={() => setTotpSuccess(null)}
            className="text-ccf-muted hover:text-ccf-offwhite text-xs p-1"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Admin Identity & Access Overview */}
      <Card className="bg-ccf-surface border-border/60 p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-ccf-gold/30 bg-ccf-gold/10 text-ccf-gold font-semibold text-xs">
                Active Session
              </Badge>
              <span className="text-xs text-ccf-muted">Auth.js Verified</span>
            </div>
            <h2 className="text-lg font-bold text-ccf-offwhite tracking-tight">
              {admin.name}
            </h2>
            <p className="text-xs text-ccf-muted">
              Primary Email: <span className="font-mono text-ccf-offwhite">{admin.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated px-4 py-2 text-right">
              <span className="text-[10px] text-ccf-muted uppercase tracking-wider block font-semibold">
                Administrative Scope
              </span>
              <span className="text-xs font-bold text-ccf-gold inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                {formatAdminRole(admin.role)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Security Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module A: Two-Factor Authentication (TOTP) */}
        <Card className="bg-ccf-surface border-border/60 flex flex-col justify-between shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-ccf-surface-elevated text-ccf-gold">
                  <Smartphone className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-ccf-offwhite">
                    Two-Factor Authentication
                  </CardTitle>
                  <p className="text-xs text-ccf-muted">Authenticator App (TOTP)</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  isTotpEnabled
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold"
                }
              >
                {isTotpEnabled ? "Enabled" : "Not Configured"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-ccf-muted leading-relaxed pt-1">
              Use standard time-based one-time passcodes from Google Authenticator, Microsoft Authenticator, or 1Password as a secondary fallback login method.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isTotpEnabled ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-ccf-muted space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Authenticator actively protects your account</span>
                </div>
                <p>
                  You can sign in using your 6-digit authenticator code on the fallback login page.
                  {totpUpdatedAt && (
                    <span className="block text-[11px] text-ccf-muted pt-1">
                      Verified on {new Date(totpUpdatedAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-ccf-muted space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <span>Secondary fallback not configured</span>
                </div>
                <p>
                  Configuring TOTP ensures you can still access the CCF admin portal if you lose access to your primary email address.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-2 border-t border-border/40">
            <Button
              onClick={handleOpenTotpSetup}
              variant={isTotpEnabled ? "outline" : "default"}
              size="sm"
              className={
                isTotpEnabled
                  ? "border-border/60 text-ccf-offwhite hover:bg-ccf-surface-elevated text-xs"
                  : "bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs"
              }
            >
              <QrCode className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              <span>{isTotpEnabled ? "Reconfigure Authenticator" : "Set up Authenticator"}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Module B: Emergency Recovery Codes */}
        <Card className="bg-ccf-surface border-border/60 flex flex-col justify-between shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-ccf-surface-elevated text-ccf-gold">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-ccf-offwhite">
                    Recovery Codes
                  </CardTitle>
                  <p className="text-xs text-ccf-muted">Break-Glass Access</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  recoveryCodesCount > 0
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold"
                    : "border-border/60 text-ccf-muted"
                }
              >
                {recoveryCodesCount > 0 ? `${recoveryCodesCount} Active Codes` : "None Generated"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-ccf-muted leading-relaxed pt-1">
              One-time cryptographic codes for emergency administrator access when both primary magic-link email and authenticator app are unavailable.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-3.5 text-xs text-ccf-muted space-y-1.5">
              <p className="font-semibold text-ccf-offwhite flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-ccf-gold" aria-hidden="true" />
                <span>Cryptographic Single-Use Storage</span>
              </p>
              <p className="leading-relaxed">
                Codes are hashed with bcrypt (10 rounds) in PostgreSQL. Each code can be used exactly once and is permanently deleted upon verification.
              </p>
            </div>

            {recoveryError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                {recoveryError}
              </p>
            )}
          </CardContent>

          <CardFooter className="pt-2 border-t border-border/40 flex items-center justify-between">
            <Button
              onClick={handleGenerateRecoveryCodes}
              disabled={recoveryGenerateLoading}
              variant="outline"
              size="sm"
              className="border-border/60 text-ccf-offwhite hover:bg-ccf-surface-elevated text-xs"
            >
              {recoveryGenerateLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  <span>{recoveryCodesCount > 0 ? "Regenerate Codes" : "Generate 8 Codes"}</span>
                </>
              )}
            </Button>
            <span className="text-[11px] text-ccf-muted">
              {recoveryCodesCount > 0 ? "Invalidates old codes" : "Instant creation"}
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* 4. MODAL: TOTP Authenticator Setup Dialog */}
      {/* ==================================================================== */}
      {isTotpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="totp-dialog-title"
        >
          <Card className="bg-ccf-surface border-border/60 w-full max-w-lg shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="totp-dialog-title" className="text-base font-semibold text-ccf-offwhite">
                    Set Up Authenticator App
                  </h3>
                  <p className="text-xs text-ccf-muted">Two-Factor Authentication (TOTP)</p>
                </div>
              </div>
              <button
                onClick={() => setIsTotpModalOpen(false)}
                className="rounded-lg p-1.5 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {totpSetupLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <Loader2 className="h-8 w-8 text-ccf-gold animate-spin" />
                  <p className="text-xs text-ccf-muted">Generating cryptographic QR code...</p>
                </div>
              ) : totpError && !qrCodeDataUrl ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Setup Error</span>
                  </p>
                  <p>{totpError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenTotpSetup}
                    className="mt-2 border-red-500/30 text-red-300 text-xs"
                  >
                    Retry Setup
                  </Button>
                </div>
              ) : (
                <>
                  {/* Step 1: Scan QR Code */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ccf-gold text-ccf-navy text-xs font-bold">
                        1
                      </span>
                      <p className="text-xs font-semibold text-ccf-offwhite">
                        Scan QR Code in your authenticator app
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-ccf-surface-sunken p-4 rounded-xl border border-border/40">
                      {qrCodeDataUrl && (
                        <div className="p-2 bg-white rounded-lg shadow-md shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrCodeDataUrl}
                            alt="TOTP Authenticator QR Code"
                            className="h-36 w-36"
                          />
                        </div>
                      )}
                      <div className="space-y-2 text-xs text-ccf-muted">
                        <p>
                          Open Google Authenticator, Microsoft Authenticator, or 1Password, tap <strong className="text-ccf-offwhite">+ Add Account</strong>, and scan the QR code.
                        </p>
                        {manualKey && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setShowManualKey(!showManualKey)}
                              className="text-ccf-gold hover:underline text-[11px] font-medium"
                            >
                              {showManualKey ? "Hide manual key" : "Can't scan? Use manual setup key"}
                            </button>
                            {showManualKey && (
                              <div className="mt-1.5 flex items-center gap-2 bg-ccf-surface p-2 rounded border border-border/60">
                                <span className="font-mono text-[11px] text-ccf-offwhite break-all select-all flex-1">
                                  {manualKey}
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(manualKey);
                                    setCopiedManualKey(true);
                                    setTimeout(() => setCopiedManualKey(false), 2000);
                                  }}
                                  className="text-ccf-muted hover:text-ccf-gold p-1"
                                  title="Copy manual key"
                                >
                                  {copiedManualKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Verification Code Input */}
                  <form onSubmit={handleVerifyTotpSetup} className="space-y-4 pt-2 border-t border-border/40">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ccf-gold text-ccf-navy text-xs font-bold">
                          2
                        </span>
                        <Label htmlFor="totp-code" className="text-xs font-semibold text-ccf-offwhite">
                          Enter the 6-digit code shown in your app
                        </Label>
                      </div>

                      <Input
                        id="totp-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        className="font-mono tracking-[0.4em] text-center text-lg h-11 bg-ccf-surface-sunken border-border/60 text-ccf-offwhite focus:border-ccf-gold"
                        autoFocus
                      />
                    </div>

                    {totpError && (
                      <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2.5 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{totpError}</span>
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTotpModalOpen(false)}
                        disabled={totpVerifyLoading}
                        className="text-xs border-border/60 text-ccf-muted hover:text-ccf-offwhite"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={totpVerifyLoading || verificationCode.length !== 6}
                        className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs px-4"
                      >
                        {totpVerifyLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <span>Verify & Enable</span>
                        )}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. MODAL: Recovery Codes Display Dialog */}
      {/* ==================================================================== */}
      {isRecoveryModalOpen && generatedCodes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-dialog-title"
        >
          <Card className="bg-ccf-surface border-border/60 w-full max-w-lg shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="recovery-dialog-title" className="text-base font-semibold text-ccf-offwhite">
                    Save Your Recovery Codes
                  </h3>
                  <p className="text-xs text-amber-400 font-semibold">Displayed Exactly Once</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRecoveryModalOpen(false);
                  setGeneratedCodes(null);
                }}
                className="rounded-lg p-1.5 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Important Security Notice</span>
                </p>
                <p className="leading-relaxed">
                  These 8 recovery codes are only displayed once and will not be accessible after you close this dialog. Save them in a password manager or secure location.
                </p>
              </div>

              {/* Codes Grid */}
              <div className="grid grid-cols-2 gap-2.5 bg-ccf-surface-sunken p-4 rounded-xl border border-border/60">
                {generatedCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-ccf-surface border border-border/40 text-xs font-mono text-ccf-offwhite font-bold tracking-wider"
                  >
                    <span className="text-ccf-muted text-[10px] select-none mr-2 font-normal">
                      #{idx + 1}
                    </span>
                    <span>{code}</span>
                  </div>
                ))}
              </div>

              {/* Copy / Download Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCopyRecoveryCodes}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-border/60 text-ccf-offwhite hover:bg-ccf-surface-elevated"
                >
                  {copiedCodes ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      <span>Copy All Codes</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleDownloadRecoveryCodes}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-border/60 text-ccf-offwhite hover:bg-ccf-surface-elevated"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  <span>Download .txt</span>
                </Button>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-ccf-surface-sunken/40 flex justify-end">
              <Button
                onClick={() => {
                  setIsRecoveryModalOpen(false);
                  setGeneratedCodes(null);
                }}
                size="sm"
                className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs px-5"
              >
                I Have Saved These Codes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
