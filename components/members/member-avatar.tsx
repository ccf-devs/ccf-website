import React from "react";
import { getMemberPhotoUrl } from "@/lib/data/members";

interface MemberAvatarProps {
  name: string;
  initials: string;
  photoObjectKey?: string;
  sizeClassName?: string;
  textClassName?: string;
}

/**
 * Responsive circular photo/avatar component.
 * Renders an optimized photo if a valid photoObjectKey is resolved;
 * otherwise displays a tasteful monogram initials fallback.
 * Initial avatars are not described as photographs for accessibility.
 */
export function MemberAvatar({
  name,
  initials,
  photoObjectKey,
  sizeClassName = "h-28 w-28 md:h-36 md:w-36",
  textClassName = "text-2xl md:text-3xl",
}: MemberAvatarProps) {
  const photoUrl = getMemberPhotoUrl(photoObjectKey);

  if (photoUrl) {
    return (
      <div
        className={`relative ${sizeClassName} shrink-0 rounded-full border-2 border-ccf-gold/40 overflow-hidden shadow-sm bg-ccf-surface-elevated`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex ${sizeClassName} shrink-0 items-center justify-center rounded-full border-2 border-ccf-gold/40 bg-ccf-surface-elevated text-ccf-gold font-display ${textClassName} font-bold tracking-wider shadow-sm`}
      aria-label={`${name} initials`}
    >
      <span aria-hidden="true">{initials}</span>
    </div>
  );
}
