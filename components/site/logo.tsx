import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface CcfLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const SIZE_MAP = {
  sm: {
    container: "h-9 w-9",
    dimension: 36,
  },
  md: {
    container: "h-10 w-10",
    dimension: 40,
  },
  lg: {
    container: "h-20 w-20 md:h-24 md:w-24",
    dimension: 96,
  },
} as const;

/**
 * Shared Crescent Club of Finance Circular Logo Primitive
 *
 * Ensures consistent circular framing, subtle gold border,
 * clean edge-to-edge presentation clipping the white background into a neat circle,
 * and strict overflow clipping across navigation, hero sections, and footer.
 */
export function CcfLogo({ size = "md", className, priority = false }: CcfLogoProps) {
  const config = SIZE_MAP[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ccf-gold/30 bg-white shadow-sm",
        config.container,
        className
      )}
    >
      <Image
        src="/images/ccf_logo_edited.png"
        alt="Crescent Club of Finance Emblem"
        width={config.dimension}
        height={config.dimension}
        className="h-full w-full object-cover"
        priority={priority}
      />
    </div>
  );
}
