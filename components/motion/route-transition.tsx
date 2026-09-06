"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";

export interface RouteTransitionProps {
  children: React.ReactNode;
}

/**
 * Lightweight Route Transition Wrapper
 *
 * Executes a fast, subtle entrance animation (180ms) on page navigation:
 * - Opacity 0 -> 1
 * - Translation 6px -> 0
 *
 * Honors prefers-reduced-motion: reduce by returning static children immediately
 * with zero perceived latency.
 */
export function RouteTransition({ children }: RouteTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
