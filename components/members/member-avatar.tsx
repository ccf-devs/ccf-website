"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { getMemberPhotoUrl } from "@/lib/data/members";

interface MemberAvatarProps {
  name: string;
  initials: string;
  photoObjectKey?: string;
  sizeClassName?: string;
  textClassName?: string;
}

/**
 * Responsive circular member photo/avatar with CCF Golden Coin Reveal.
 *
 * During initial viewport entrance:
 * 1. Shows a gold coin circular face featuring the CCF crescent motif.
 * 2. Rotates around vertical Y-axis once (650ms).
 * 3. Settles permanently into the member's official photograph (or monogram).
 * 4. Stays completely static afterward with zero re-triggering on hover.
 *
 * Honors prefers-reduced-motion: reduce by skipping 3D flip and rendering the
 * photo or monogram directly with zero animation delay.
 */
export function MemberAvatar({
  name,
  initials,
  photoObjectKey,
  sizeClassName = "h-28 w-28 md:h-36 md:w-36",
  textClassName = "text-2xl md:text-3xl",
}: MemberAvatarProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const photoUrl = getMemberPhotoUrl(photoObjectKey);

  // Reduced motion: render direct static avatar
  if (shouldReduceMotion) {
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

  // Motion Golden Coin Flip (once on initial reveal)
  return (
    <div
      className={`relative ${sizeClassName} shrink-0`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        initial={{ rotateY: 0 }}
        whileInView={{ rotateY: 180 }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ duration: 0.65, ease: [0.25, 1, 0.5, 1] }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-full w-full"
      >
        {/* FRONT FACE: Gold Coin with CCF Crescent Motif */}
        <div
          style={{
            backfaceVisibility: "hidden",
            background:
              "linear-gradient(135deg, rgba(198, 144, 45, 1) 0%, rgba(162, 114, 30, 1) 50%, rgba(110, 75, 20, 1) 100%)",
          }}
          className="absolute inset-0 rounded-full border-2 border-ccf-gold-dark flex items-center justify-center shadow-md p-3 select-none"
          aria-hidden="true"
        >
          <div className="relative h-3/5 w-3/5 rounded-full overflow-hidden opacity-85 border border-ccf-navy/20">
            <Image
              src="/images/ccf_logo_edited.png"
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* BACK FACE: Member Photograph or Monogram (revealed upon 180 deg rotation) */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="absolute inset-0 rounded-full border-2 border-ccf-gold/40 overflow-hidden shadow-sm bg-ccf-surface-elevated"
        >
          {/* Base initials fallback: ensures face is NEVER blank while photo resolves */}
          <div
            className={`absolute inset-0 flex h-full w-full items-center justify-center text-ccf-gold font-display ${textClassName} font-bold tracking-wider select-none`}
            aria-label={photoUrl ? undefined : `${name} initials`}
          >
            <span aria-hidden="true">{initials}</span>
          </div>

          {/* Member Photograph on top */}
          {photoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photoUrl}
              alt={name}
              onLoad={() => setImgLoaded(true)}
              className={`relative z-10 h-full w-full object-cover transition-opacity duration-300 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
