"use client";

import React, { useState } from "react";
import { AdminRole } from "@prisma/client";
import { Shield, Server } from "lucide-react";
import { SecuritySettings } from "./security-settings";
import { GeneralSettings, PlatformMetadata } from "./general-settings";

export interface SettingsViewProps {
  admin: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
  initialIsTotpEnabled: boolean;
  initialTotpUpdatedAt: string | null;
  initialRecoveryCodesCount: number;
  platform: PlatformMetadata;
}

export function SettingsView({
  admin,
  initialIsTotpEnabled,
  initialTotpUpdatedAt,
  initialRecoveryCodesCount,
  platform,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<"security" | "platform">("security");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-border/60 gap-2">
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "security"
              ? "border-ccf-gold text-ccf-gold"
              : "border-transparent text-ccf-muted hover:text-ccf-offwhite"
          }`}
          aria-selected={activeTab === "security"}
          role="tab"
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Security & Authentication</span>
        </button>

        <button
          onClick={() => setActiveTab("platform")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "platform"
              ? "border-ccf-gold text-ccf-gold"
              : "border-transparent text-ccf-muted hover:text-ccf-offwhite"
          }`}
          aria-selected={activeTab === "platform"}
          role="tab"
        >
          <Server className="h-3.5 w-3.5" />
          <span>Platform Overview</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "security" && (
        <div role="tabpanel" aria-label="Security & Authentication">
          <SecuritySettings
            admin={admin}
            initialIsTotpEnabled={initialIsTotpEnabled}
            initialTotpUpdatedAt={initialTotpUpdatedAt}
            initialRecoveryCodesCount={initialRecoveryCodesCount}
          />
        </div>
      )}

      {activeTab === "platform" && (
        <div role="tabpanel" aria-label="Platform Overview">
          <GeneralSettings platform={platform} />
        </div>
      )}
    </div>
  );
}
