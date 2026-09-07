"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Clock, Users, ExternalLink, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type RegistrationStatusReason =
  | "NOT_OPEN_YET"
  | "CLOSED"
  | "FULL"
  | "EXTERNAL_MODE"
  | "NOT_INTERNAL"
  | "NOT_ELIGIBLE";

interface RegistrationStatusNoticeProps {
  reason: RegistrationStatusReason;
  eventName: string;
  eventSlug: string;
  opensAt?: string | null;
  closesAt?: string | null;
  externalUrl?: string | null;
}

export function RegistrationStatusNotice({
  reason,
  eventName,
  eventSlug,
  opensAt,
  closesAt,
  externalUrl,
}: RegistrationStatusNoticeProps) {
  const getStatusConfig = () => {
    switch (reason) {
      case "NOT_OPEN_YET":
        return {
          icon: Clock,
          iconColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
          tag: "REGISTRATION UPCOMING",
          title: "Registration Not Open Yet",
          description: opensAt
            ? `Registration for ${eventName} opens on ${new Date(opensAt).toLocaleDateString("en-IN", {
                dateStyle: "medium",
                timeZone: "Asia/Kolkata",
              })}. Please check back then.`
            : `Registration for ${eventName} has not opened yet. Please check back later.`,
        };
      case "CLOSED":
        return {
          icon: AlertCircle,
          iconColor: "text-red-400 bg-red-400/10 border-red-400/30",
          tag: "REGISTRATION CLOSED",
          title: "Registration Has Closed",
          description: closesAt
            ? `Registration for ${eventName} closed on ${new Date(closesAt).toLocaleDateString("en-IN", {
                dateStyle: "medium",
                timeZone: "Asia/Kolkata",
              })}. No further submissions are being accepted.`
            : `Registration for ${eventName} is now closed.`,
        };
      case "FULL":
        return {
          icon: Users,
          iconColor: "text-orange-400 bg-orange-400/10 border-orange-400/30",
          tag: "CAPACITY REACHED",
          title: "Event at Full Capacity",
          description: `All available registration slots for ${eventName} have been filled. Capacity limits have been reached.`,
        };
      case "EXTERNAL_MODE":
        return {
          icon: ExternalLink,
          iconColor: "text-blue-400 bg-blue-400/10 border-blue-400/30",
          tag: "EXTERNAL REGISTRATION",
          title: "External Registration Required",
          description: `${eventName} uses an external platform for registration. Please use the official external link to register.`,
        };
      case "NOT_ELIGIBLE":
        return {
          icon: AlertCircle,
          iconColor: "text-red-400 bg-red-400/10 border-red-400/30",
          tag: "INELIGIBLE",
          title: "Registration Restricted",
          description: `This event is restricted and not open for your participant category.`,
        };
      default:
        return {
          icon: AlertCircle,
          iconColor: "text-ccf-muted bg-ccf-surface border-border",
          tag: "REGISTRATION NOT AVAILABLE",
          title: "Registration Unavailable",
          description: `Online registration is not currently available for ${eventName}.`,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Card className="bg-ccf-surface border-border/50 p-6 md:p-8 space-y-6 text-center shadow-lg">
        <div className="flex justify-center">
          <div
            className={`h-14 w-14 rounded-full border flex items-center justify-center ${config.iconColor}`}
          >
            <Icon className="h-7 w-7" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="editorial-tag">{config.tag}</span>
          <h2 className="text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
            {config.title}
          </h2>
          <p className="text-sm text-ccf-muted leading-relaxed max-w-md mx-auto">
            {config.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {externalUrl && (
            <Button asChild variant="gold">
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <span>Go to External Form</span>
                <ExternalLink className="h-4 w-4 ml-1.5" />
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/events/${eventSlug}`} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Event Details</span>
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/events">Browse Events</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
