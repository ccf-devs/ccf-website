"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export interface CardRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  duration?: number;
}

/**
 * CardReveal: Signature CCF Card Initial Reveal Primitive
 *
 * Implements the refined Dr. Strange-inspired gold perimeter arc:
 * 1. Synchronized with viewport entry (useInView).
 * 2. Card gently fades in (opacity 0 -> 1, y: 10px -> 0).
 * 3. A slender gold light trace appears on the border.
 * 4. Trace follows the exact card perimeter around rounded corners for ONE complete circuit (~950ms).
 * 5. Trace fades out cleanly and unmounts from the DOM.
 * 6. Card remains 100% static afterward with zero residual animations or GPU load.
 *
 * Honors prefers-reduced-motion: reduce by rendering the static card directly.
 */
export function CardReveal({
  children,
  delay = 0,
  duration = 0.4,
  className,
  ...props
}: CardRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-40px" });
  const shouldReduceMotion = useReducedMotion();
  const [traceDone, setTraceDone] = useState(false);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const id = useId().replace(/:/g, "");

  // Track card dimensions for exact perimeter calculation
  useEffect(() => {
    if (shouldReduceMotion || !containerRef.current) return;

    const el = containerRef.current;
    const updateDimensions = () => {
      if (el) {
        setDims({
          width: el.offsetWidth,
          height: el.offsetHeight,
        });
      }
    };

    updateDimensions();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    );
  }

  // Rounded rectangle perimeter formula with corner radius 16px:
  // P = 2 * (w - 2r) + 2 * (h - 2r) + 2 * PI * r = 2(w + h) - 128 + 100.53 ~= 2(w + h) - 27.5
  const cornerRadius = 16;
  const perimeter =
    dims.width > 0 && dims.height > 0
      ? Math.max(100, 2 * (dims.width + dims.height) - 27.5)
      : 1000;
  const arcLength = Math.max(70, Math.min(130, Math.round(perimeter * 0.12)));

  const showTrace = isInView && dims.width > 0 && !traceDone;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 1, 0.5, 1],
      }}
      className={cn("relative group", className)}
      {...(props as HTMLMotionProps<"div">)}
    >
      {/* SVG Single-Circuit Gold Perimeter Light Trace */}
      {showTrace && (
        <svg
          className="absolute -inset-[1px] pointer-events-none z-20 overflow-visible"
          width={dims.width + 2}
          height={dims.height + 2}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`ccf-gold-trace-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C6902D" stopOpacity="0.2" />
              <stop offset="55%" stopColor="#D7A63D" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFF4D4" stopOpacity="1" />
            </linearGradient>
            <filter id={`ccf-gold-glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <motion.rect
            x="1"
            y="1"
            width={Math.max(0, dims.width)}
            height={Math.max(0, dims.height)}
            rx={cornerRadius}
            ry={cornerRadius}
            fill="none"
            stroke={`url(#ccf-gold-trace-${id})`}
            strokeWidth="1.25"
            strokeLinecap="round"
            filter={`url(#ccf-gold-glow-${id})`}
            strokeDasharray={`${arcLength} ${perimeter - arcLength}`}
            initial={{ strokeDashoffset: 0, opacity: 0 }}
            animate={{
              strokeDashoffset: -perimeter,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 0.95,
              delay: delay + 0.15,
              ease: "easeInOut",
              times: [0, 0.1, 0.85, 1],
            }}
            onAnimationComplete={() => setTraceDone(true)}
          />
        </svg>
      )}

      {/* Static Card Content */}
      <div className="relative z-0 h-full w-full rounded-[inherit]">{children}</div>
    </motion.div>
  );
}
