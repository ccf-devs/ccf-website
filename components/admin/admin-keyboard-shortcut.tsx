"use client";

import { useEffect } from "react";

/**
 * AdminKeyboardShortcut
 *
 * Registers a global keyboard shortcut that navigates to /admin.
 * - Windows/Linux: Ctrl+Alt+A
 * - macOS:         Cmd+Option+A (metaKey+altKey+KeyA)
 *
 * Requirements:
 * - Do not trigger while user is typing in: input, textarea, select, contenteditable
 * - Destination MUST remain /admin
 * - Prevent default browser shortcut behavior when recognized
 * - Avoid duplicate listeners/navigations
 * - Work across public pages without interfering with normal navigation
 */
export function AdminKeyboardShortcut() {
  useEffect(() => {
    function isTypingInField(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
        return true;
      }
      const tagName = target.tagName?.toUpperCase();
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        return true;
      }
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // 1. Never trigger if user is focused inside a form control or editable element
      if (isTypingInField(e.target)) {
        return;
      }

      // 2. Physical key detection: e.code === "KeyA" handles keyboard layouts, AltGr,
      // CapsLock, and macOS Option accents (where Option+A produces 'å')
      const isKeyA = e.code === "KeyA" || e.key?.toLowerCase() === "a";
      if (!isKeyA) return;

      // macOS: Cmd + Option + A (metaKey + altKey, without ctrlKey)
      // Windows/Linux: Ctrl + Alt + A (ctrlKey + altKey, without metaKey)
      const isMacShortcut = e.metaKey && e.altKey && !e.ctrlKey;
      const isWinShortcut = e.ctrlKey && e.altKey && !e.metaKey;

      if (isMacShortcut || isWinShortcut) {
        e.preventDefault();
        e.stopPropagation();

        if (typeof window !== "undefined") {
          // Global keyboard shortcut deliberately performs direct window navigation to ensure clean admin context
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/admin");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  return null;
}

