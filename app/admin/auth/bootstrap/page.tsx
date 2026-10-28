"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

function BootstrapWizard() {
  const router = useRouter();

  // Step state: 1 = OTP Entry, 2 = TOTP Enrollment, 3 = Recovery Codes, 4 = Final Sign In
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Bootstrap OTP
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: TOTP Setup
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [showManualKey, setShowManualKey] = useState(false);
  const [copiedManualKey, setCopiedManualKey] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Step 3: Recovery Codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [acknowledgedCodes, setAcknowledgedCodes] = useState(false);

  // Step 4: Final Sign In
  const [finalCode, setFinalCode] = useState("");
  const [step4Loading, setStep4Loading] = useState(false);
  const [step4Error, setStep4Error] = useState<string | null>(null);

  function handleOtpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (raw.length <= 4) {
      setOtp(raw);
    } else {
      setOtp(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
    }
  }

  // --- Step 1: Submit Bootstrap OTP ---
  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !otp.trim()) return;

    setStep1Loading(true);
    setStep1Error(null);

    try {
      const res = await signIn("bootstrap-otp", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        redirect: false,
      });

      if (res?.error) {
        setStep1Error(
          "Invalid or expired bootstrap OTP. Please check your credentials or contact an operator."
        );
        setStep1Loading(false);
        return;
      }

      // Bootstrap OTP redeemed successfully -> Session is now restricted enrollment
      // Load TOTP setup data
      await loadTotpSetupData();
      setStep(2);
    } catch {
      setStep1Error("An unexpected error occurred during OTP verification.");
    } finally {
      setStep1Loading(false);
    }
  }

  // --- Step 2: Load and Verify TOTP ---
  async function loadTotpSetupData() {
    setStep2Loading(true);
    setStep2Error(null);

    try {
      const res = await fetch("/api/admin/auth/totp/setup", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to initiate authenticator setup.");
      }

      const data = await res.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);

      try {
        const parsed = new URL(data.otpauthUri);
        setManualKey(parsed.searchParams.get("secret"));
      } catch {
        setManualKey(null);
      }
    } catch (err: unknown) {
      setStep2Error(err instanceof Error ? err.message : "Failed to load TOTP setup.");
    } finally {
      setStep2Loading(false);
    }
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length !== 6) return;

    setStep2Loading(true);
    setStep2Error(null);

    try {
      const res = await fetch("/api/admin/auth/totp/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid authenticator code. Please try again.");
      }

      // Verified! Now load recovery codes for Step 3
      await loadRecoveryCodes();
      setStep(3);
    } catch (err: unknown) {
      setStep2Error(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setStep2Loading(false);
    }
  }

  // --- Step 3: Load and Save Recovery Codes ---
  async function loadRecoveryCodes() {
    setStep3Loading(true);
    setStep3Error(null);

    try {
      const res = await fetch("/api/admin/auth/recovery/generate", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate emergency recovery codes.");
      }

      const data = await res.json();
      if (Array.isArray(data.codes)) {
        setRecoveryCodes(data.codes);
      }
    } catch (err: unknown) {
      setStep3Error(err instanceof Error ? err.message : "Failed to generate recovery codes.");
    } finally {
      setStep3Loading(false);
    }
  }

  async function handleCopyRecoveryCodes() {
    if (recoveryCodes.length === 0) return;
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  }

  function handleDownloadRecoveryCodes() {
    if (recoveryCodes.length === 0) return;
    const content = `Crescent Club of Finance (CCF) — Emergency Recovery Codes\nAccount: ${email}\nGenerated: ${new Date().toISOString()}\n\nKeep these codes in a secure location. Each code can be used ONCE.\n\n${recoveryCodes.join(
      "\n"
    )}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ccf-recovery-codes-${email.replace(/[^a-zA-Z0-9]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleStep3Proceed() {
    if (!acknowledgedCodes) return;
    setStep(4);
  }

  // --- Step 4: Final Authenticated Login via newly enrolled TOTP ---
  async function handleStep4Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!finalCode || finalCode.trim().length !== 6) return;

    setStep4Loading(true);
    setStep4Error(null);

    try {
      const res = await signIn("totp", {
        email: email.trim().toLowerCase(),
        code: finalCode.trim(),
        redirect: false,
        callbackUrl: "/admin/dashboard",
      });

      if (res?.error) {
        setStep4Error("Invalid authenticator code. Please check your app and try again.");
        setStep4Loading(false);
        return;
      }

      // Full administrator session established!
      router.push("/admin/dashboard");
    } catch {
      setStep4Error("An unexpected error occurred during final sign-in.");
      setStep4Loading(false);
    }
  }

  return (
    <div className="w-full max-w-lg space-y-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        {[
          { num: 1, label: "Setup Code" },
          { num: 2, label: "Authenticator" },
          { num: 3, label: "Recovery Codes" },
          { num: 4, label: "Sign In" },
        ].map((item) => (
          <div key={item.num} className="flex items-center gap-1.5 text-xs">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === item.num
                  ? "bg-slate-900 text-white shadow-xs"
                  : step > item.num
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > item.num ? "✓" : item.num}
            </span>
            <span
              className={`hidden sm:inline text-xs ${
                step === item.num
                  ? "font-semibold text-slate-900"
                  : step > item.num
                  ? "text-slate-600"
                  : "text-slate-400"
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* ================================================================== */}
      {/* STEP 1: INITIAL BOOTSTRAP OTP ENTRY                                */}
      {/* ================================================================== */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Administrator Setup
            </h1>
          </div>

          {step1Error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{step1Error}</span>
            </div>
          )}

          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="bootstrap-email" className="block text-xs font-medium text-slate-700">
                Email
              </label>
              <input
                id="bootstrap-email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@crescent.education"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bootstrap-otp" className="block text-xs font-medium text-slate-700">
                One-Time Setup Code
              </label>
              <input
                id="bootstrap-otp"
                type="text"
                required
                autoComplete="one-time-code"
                placeholder="XXXX-XXXX"
                value={otp}
                onChange={handleOtpChange}
                maxLength={9}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-mono text-center text-xl font-bold tracking-widest text-slate-900 uppercase shadow-sm placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            </div>

            <Button
              type="submit"
              disabled={step1Loading || !email.trim() || !otp.trim()}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 h-10 font-medium"
            >
              {step1Loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            <Link href="/admin/auth/login" className="hover:text-slate-800 underline transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 2: TOTP ENROLLMENT                                             */}
      {/* ================================================================== */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Set Up Authenticator
            </h2>
          </div>

          {step2Error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{step2Error}</span>
            </div>
          )}

          {step2Loading && !qrCodeDataUrl ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
              <p className="text-xs text-slate-500">Setting up authenticator...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                {qrCodeDataUrl && (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeDataUrl}
                      alt="Authenticator Setup QR Code"
                      className="h-44 w-44"
                    />
                  </div>
                )}
                {manualKey && (
                  <div className="mt-3 text-center w-full">
                    <button
                      type="button"
                      onClick={() => setShowManualKey(!showManualKey)}
                      className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                    >
                      {showManualKey ? "Hide manual key" : "Can't scan? View manual setup key"}
                    </button>
                    {showManualKey && (
                      <div className="mt-2 flex items-center gap-2 bg-white p-2.5 rounded-md border border-slate-300">
                        <span className="font-mono text-xs text-slate-800 break-all select-all flex-1 text-left">
                          {manualKey}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(manualKey);
                            setCopiedManualKey(true);
                            setTimeout(() => setCopiedManualKey(false), 2000);
                          }}
                          className="text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100"
                          title="Copy setup key"
                        >
                          {copiedManualKey ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="verify-totp-code" className="block text-xs font-medium text-slate-700">
                    6-Digit Code
                  </label>
                  <input
                    id="verify-totp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-mono text-center text-2xl font-bold tracking-[0.4em] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={step2Loading || totpCode.length !== 6}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 h-10 font-medium"
                >
                  {step2Loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 3: RECOVERY CODES DISPLAY                                     */}
      {/* ================================================================== */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Save Recovery Codes
            </h2>
          </div>

          <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
            Save these 8 recovery codes in a secure location. Each code can only be used once.
          </div>

          {step3Loading ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
              <p className="text-xs text-slate-500">Generating recovery codes...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {recoveryCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-md bg-white border border-slate-200 font-mono text-xs font-bold text-slate-800 shadow-xs"
                  >
                    <span className="text-[10px] text-slate-400 select-none mr-1">#{idx + 1}</span>
                    <span>{code}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleCopyRecoveryCodes}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {copiedCodes ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                      <span>Copy All</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                  <span>Download .txt</span>
                </Button>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={acknowledgedCodes}
                    onChange={(e) => setAcknowledgedCodes(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                  />
                  <span>
                    I have saved my recovery codes.
                  </span>
                </label>
              </div>

              <Button
                type="button"
                onClick={handleStep3Proceed}
                disabled={!acknowledgedCodes}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 h-10 font-medium disabled:opacity-50"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 4: FINAL VERIFICATION & FULL ADMIN LOGIN                      */}
      {/* ================================================================== */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Confirm Sign-In
            </h2>
          </div>

          <div className="rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Authenticator and recovery codes configured.</span>
          </div>

          {step4Error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{step4Error}</span>
            </div>
          )}

          <form onSubmit={handleStep4Submit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="final-totp-code" className="block text-xs font-medium text-slate-700">
                6-Digit Code
              </label>
              <input
                id="final-totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
                value={finalCode}
                onChange={(e) => setFinalCode(e.target.value.replace(/\D/g, ""))}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-mono text-center text-2xl font-bold tracking-[0.4em] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={step4Loading || finalCode.length !== 6}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 h-10 font-medium disabled:opacity-50"
            >
              {step4Loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminBootstrapPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <BootstrapWizard />
      </Suspense>
    </div>
  );
}
