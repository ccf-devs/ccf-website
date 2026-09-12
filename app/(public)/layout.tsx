import React from "react";
import { PublicShell } from "@/components/site/public-shell";
import { getPublicContactSettings } from "@/lib/site-settings/service";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const contactSettings = await getPublicContactSettings();
  return <PublicShell contactSettings={contactSettings}>{children}</PublicShell>;
}
