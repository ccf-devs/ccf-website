"use client";

import React, { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);

  // Complete progress on route change
  useEffect(() => {
    let tDone: ReturnType<typeof setTimeout>;
    const tComplete = setTimeout(() => {
      setProgress((prev) => {
        if (prev !== null) {
          tDone = setTimeout(() => setProgress(null), 250);
          return 100;
        }
        return null;
      });
    }, 0);

    return () => {
      clearTimeout(tComplete);
      clearTimeout(tDone);
    };
  }, [pathname, searchParams]);

  // Intercept clicks on internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target || !target.href) return;

      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      ) {
        return;
      }

      try {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);

        if (
          url.origin === currentUrl.origin &&
          (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search)
        ) {
          setProgress(35);
          const t1 = setTimeout(() => setProgress(70), 120);
          const t2 = setTimeout(() => setProgress(88), 350);
          const failsafe = setTimeout(() => setProgress(null), 7000);

          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(failsafe);
          };
        }
      } catch {
        // Invalid URL, ignore
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [progress]);

  if (progress === null) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[2px] pointer-events-none bg-transparent"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div
        className="h-full bg-ccf-gold shadow-[0_0_8px_rgba(197,160,89,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 100ms ease-out, opacity 250ms ease-in"
              : "width 200ms ease-out",
        }}
      />
    </div>
  );
}

export function NavProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
