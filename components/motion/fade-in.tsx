"use client";

import React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  className?: string;
  viewportOnce?: boolean;
}

/**
 * Accessible FadeIn / Reveal motion primitive.
 * Enforces subtle, short, purposeful transitions.
 * Fully honors prefers-reduced-motion: reduce by rendering content immediately
 * without opacity delays or transform shifts, while preserving all forwarded HTML attributes.
 */
export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.35,
  className,
  viewportOnce = true,
  ...props
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  // Subtle shift values (maximum 14px to prevent large jarring layout movements)
  const offset = 14;

  const initialOffset = {
    x: direction === "left" ? offset : direction === "right" ? -offset : 0,
    y: direction === "up" ? offset : direction === "down" ? -offset : 0,
  };

  // When reduced motion is requested, render content immediately without animations
  if (shouldReduceMotion) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...initialOffset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: viewportOnce, margin: "-20px" }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      className={cn(className)}
      {...(props as HTMLMotionProps<"div">)}
    >
      {children}
    </motion.div>
  );
}
