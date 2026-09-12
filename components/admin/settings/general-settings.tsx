"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  ArrowRight,
  Mail,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  Globe,
} from "lucide-react";
import type { PublicContactSettings } from "@/lib/site-settings/service";

export interface PlatformMetadata {
  appName: string;
  appVersion?: string;
  appUrl: string;
  environment: string;
  databaseEngine?: string;
  storageProvider?: string;
  emailProvider?: string;
  recruitmentStatus: "Open" | "Closed";
  whatsappGroupConfigured: boolean;
}

export interface GeneralSettingsProps {
  platform: PlatformMetadata;
  contactSettings?: PublicContactSettings;
}

export function GeneralSettings({ platform, contactSettings }: GeneralSettingsProps) {
  const [contactEmail, setContactEmail] = useState(contactSettings?.contactEmail || "");
  const [supportEmail, setSupportEmail] = useState(contactSettings?.supportEmail || "");
  const [socialInstagram, setSocialInstagram] = useState(contactSettings?.socialInstagram || "");
  const [socialLinkedin, setSocialLinkedin] = useState(contactSettings?.socialLinkedin || "");

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const updates = [
        { key: "contact_email", value: contactEmail.trim() },
        { key: "support_email", value: supportEmail.trim() },
        { key: "social_instagram", value: socialInstagram.trim() },
        { key: "social_linkedin", value: socialLinkedin.trim() },
      ];

      for (const update of updates) {
        const res = await fetch("/api/admin/site-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to update ${update.key}`);
        }
      }

      setFeedback({
        type: "success",
        message: "Contact settings saved successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Site Contact & Social Configuration */}
      <Card className="bg-ccf-surface border-border/60 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-ccf-surface-elevated text-ccf-gold">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-ccf-offwhite">
                Site Contact & Social Information
              </CardTitle>
              <CardDescription className="text-xs text-ccf-muted">
                Official contact channels and social media profiles displayed across public pages.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveContactSettings} className="space-y-4">
            {feedback && (
              <div
                className={`p-3 rounded-md flex items-center gap-2 text-xs ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="text-xs text-ccf-muted">
                  Official Public Email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. crescentcluboffinance26@gmail.com"
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="support-email" className="text-xs text-ccf-muted">
                  Technical Support Email
                </Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="e.g. support.ccf@gmail.com"
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="social-instagram" className="text-xs text-ccf-muted">
                  Instagram Profile URL
                </Label>
                <Input
                  id="social-instagram"
                  type="url"
                  value={socialInstagram}
                  onChange={(e) => setSocialInstagram(e.target.value)}
                  placeholder="https://www.instagram.com/..."
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="social-linkedin" className="text-xs text-ccf-muted">
                  LinkedIn Page URL
                </Label>
                <Input
                  id="social-linkedin"
                  type="url"
                  value={socialLinkedin}
                  onChange={(e) => setSocialLinkedin(e.target.value)}
                  placeholder="https://www.linkedin.com/company/..."
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold text-xs"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                <span>Save Contact Settings</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recruitment Intake Subsystem Settings */}
      <Card className="bg-ccf-surface border-border/60 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-ccf-surface-elevated text-ccf-gold">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-ccf-offwhite">
                  Student Recruitment Intake
                </CardTitle>
                <p className="text-xs text-ccf-muted">Public portal recruitment status</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                platform.recruitmentStatus === "Open"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold"
                  : "border-border/60 text-ccf-muted"
              }
            >
              {platform.recruitmentStatus === "Open" ? "Intake Open" : "Intake Closed"}
            </Badge>
          </div>
          <CardDescription className="text-xs text-ccf-muted pt-1">
            Controls whether the public <code className="font-mono text-ccf-offwhite">/join-us</code> page accepts new applications from students.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-ccf-surface-sunken p-4 text-xs text-ccf-muted flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-ccf-offwhite">
                Intake Configuration: {platform.recruitmentStatus}
              </p>
              <p>
                WhatsApp Community Link:{" "}
                <span className="font-mono text-ccf-offwhite">
                  {platform.whatsappGroupConfigured ? "Configured" : "None"}
                </span>
              </p>
            </div>

            <Button asChild size="sm" variant="outline" className="text-xs border-border/60 text-ccf-offwhite shrink-0">
              <Link href="/admin/recruitment" className="inline-flex items-center gap-1.5">
                <span>Manage in Recruitment</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Core Specifications */}
      <Card className="bg-ccf-surface border-border/60 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
            <Server className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
            <span>Platform Core Specifications</span>
          </CardTitle>
          <CardDescription className="text-xs text-ccf-muted">
            Current environment runtime and application identities.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border/40 text-xs">
            <div className="flex items-center justify-between p-4">
              <span className="text-ccf-muted">Application Identity</span>
              <span className="font-semibold text-ccf-offwhite">{platform.appName}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-ccf-muted">Application Release</span>
              <span className="font-mono text-ccf-gold font-medium">
                {platform.appVersion || "v0.1.0"}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-ccf-muted">Runtime Environment</span>
              <span className="font-mono uppercase text-emerald-400 font-bold tracking-wider text-[11px]">
                {platform.environment}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-ccf-muted">Canonical Host</span>
              <span className="font-mono text-ccf-offwhite flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-ccf-gold" />
                {platform.appUrl}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

