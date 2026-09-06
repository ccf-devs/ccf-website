"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface SmoothImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

/**
 * SmoothImage: Presentation-level image component with soft fade-in UX.
 *
 * Prevents jarring visual pops by starting with the container background
 * placeholder and smoothly transitioning opacity 0 -> 1 when the image finishes loading.
 */
export function SmoothImage({
  className,
  containerClassName,
  alt,
  onLoad,
  ...props
}: SmoothImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-ccf-navy-secondary", containerClassName)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "transition-opacity duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
