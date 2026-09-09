"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  Database,
  HardDrive,
  Mail,
  Globe,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";

export interface PlatformMetadata {
  appName: string;
  appVersion: string;
  appUrl: string;
  environment: string;
  databaseEngine: string;
  storageProvider: string;
  emailProvider: string;
  recruitmentStatus: "Open" | "Closed";
  whatsappGroupConfigured: boolean;
}

export interface GeneralSettingsProps {
  platform: PlatformMetadata;
}

export function GeneralSettings({ platform }: GeneralSettingsProps) {
  return (
    <div className="space-y-8">
      {/* 1. Platform Infrastructure Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-ccf-surface border-border/60 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Server className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Platform Core Specifications</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Authoritative technical parameters powering this instance.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border/40 text-xs">
              <div className="flex items-center justify-between p-4">
                <span className="text-ccf-muted">Application Name</span>
                <span className="font-semibold text-ccf-offwhite">{platform.appName}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-ccf-muted">Platform Build</span>
                <span className="font-mono text-ccf-offwhite bg-ccf-surface-sunken px-2 py-0.5 rounded border border-border/60">
                  {platform.appVersion}
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

        <Card className="bg-ccf-surface border-border/60 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-ccf-offwhite flex items-center gap-2">
              <Database className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
              <span>Production Infrastructure</span>
            </CardTitle>
            <CardDescription className="text-xs text-ccf-muted">
              Configured services used by the CCF platform.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border/40 text-xs">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-ccf-muted" />
                  <span className="text-ccf-muted">Database Engine</span>
                </div>
                <span className="font-semibold text-ccf-offwhite">{platform.databaseEngine}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-ccf-muted" />
                  <span className="text-ccf-muted">Object Storage</span>
                </div>
                <span className="font-semibold text-ccf-offwhite">{platform.storageProvider}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-ccf-muted" />
                  <span className="text-ccf-muted">Email Gateway</span>
                </div>
                <span className="font-semibold text-ccf-offwhite">{platform.emailProvider}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-ccf-muted">Security Layer</span>
                </div>
                <span className="font-semibold text-emerald-400">Auth.js + Resend Magic Link</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Recruitment Intake Subsystem Settings */}
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
    </div>
  );
}
