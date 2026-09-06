"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

const STORAGE_KEY = "ccf_initial_loaded";

/**
 * CCF Branded Initial Application Loader
 *
 * Provides a prestigious, editorial first-load experience:
 * 1. Deep navy foundation (#040C17)
 * 2. CCF crescent mark gently fades in
 * 3. Restrained gold radial illumination
 * 4. "CRESCENT CLUB" and "OF FINANCE" typography reveals
 * 5. Disciplined hold (~1.25s)
 * 6. Slow, elegant fade-out (450ms) controlled via AnimatePresence
 *
 * Requirements:
 * - AnimatePresence remains mounted while the child exits with transition={{ duration: 0.45 }}.
 * - Fires once per browser session via sessionStorage.
 * - Skips immediately for prefers-reduced-motion: reduce.
 * - Uses the canonical CCF logo asset (/images/ccf_logo_edited.png).
 */
export function AppLoader() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // If reduced motion is preferred, skip immediately with zero latency
    if (shouldReduceMotion) {
      return;
    }

    try {
      if (window.sessionStorage.getItem(STORAGE_KEY)) {
        return;
      }
    } catch {
      // In private browsing or restricted environments, gracefully proceed
    }

    // Mount loader and trigger entrance in frame callback
    const animFrame = requestAnimationFrame(() => {
      setMounted(true);
      setShow(true);
    });

    // Initial presentation hold: ~1.25s before initiating the 450ms fade-out
    const minHoldMs = 1250;
    const startTime = Date.now();
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const startExit = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minHoldMs - elapsed);

      exitTimer = setTimeout(() => {
        setShow(false); // Triggers AnimatePresence exit animation (450ms)
        try {
          window.sessionStorage.setItem(STORAGE_KEY, "true");
        } catch {
          // Ignore storage write issues
        }
      }, remaining);
    };

    if (document.readyState === "complete") {
      startExit();
    } else {
      window.addEventListener("load", startExit, { once: true });
      fallbackTimer = setTimeout(startExit, 2000);
    }

    return () => {
      cancelAnimationFrame(animFrame);
      if (exitTimer) clearTimeout(exitTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      window.removeEventListener("load", startExit);
    };
  }, [shouldReduceMotion]);

  if (!mounted) {
    return null;
  }

  return (
    <AnimatePresence
      onExitComplete={() => {
        setMounted(false);
      }}
    >
      {show && (
        <motion.div
          key="ccf-app-loader-overlay"
          role="status"
          aria-live="polite"
          aria-label="Loading Crescent Club of Finance"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#040C17]"
        >
          <div className="relative flex flex-col items-center justify-center space-y-6 text-center px-4">
            {/* Subtle gold radial aura */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.35, scale: 1.15 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute -top-12 h-48 w-48 rounded-full bg-ccf-gold/20 blur-2xl pointer-events-none"
              aria-hidden="true"
            />

            {/* CCF Crescent Emblem */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-20 w-20 md:h-24 md:w-24 rounded-full border border-ccf-gold/40 p-1 shadow-xl bg-[#071426] overflow-hidden"
            >
              <Image
                src="/images/ccf_logo_edited.png"
                alt="CCF Emblem"
                width={96}
                height={96}
                priority
                className="h-full w-full object-cover rounded-full"
              />
            </motion.div>

            {/* Editorial Brand Name Reveal */}
            <div className="space-y-1.5 overflow-hidden">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
                className="font-display text-xl md:text-2xl font-semibold tracking-[0.25em] text-ccf-offwhite uppercase"
              >
                CRESCENT CLUB
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
                className="font-sans text-[0.72rem] md:text-xs font-semibold tracking-[0.35em] text-ccf-gold uppercase"
              >
                OF FINANCE
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
