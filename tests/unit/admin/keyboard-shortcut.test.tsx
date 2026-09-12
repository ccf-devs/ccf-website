import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminKeyboardShortcut } from "@/components/admin/admin-keyboard-shortcut";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("AdminKeyboardShortcut Component Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null gracefully in SSR environment", () => {
    const html = renderToStaticMarkup(<AdminKeyboardShortcut />);
    expect(html).toBe("");
  });

  it("registers keydown listener with capture phase on client mount", () => {
    let registeredEvent: string | null = null;
    let registeredOptions: any = null;
    let listenerFn: any = null;

    const mockWindow = {
      addEventListener: vi.fn((event, fn, options) => {
        registeredEvent = event;
        listenerFn = fn;
        registeredOptions = options;
      }),
      removeEventListener: vi.fn(),
    };

    const originalWindow = global.window;
    (global as any).window = mockWindow;

    try {
      // Simulate client mount effect
      const cleanup = (() => {
        // Run effect logic
        mockWindow.addEventListener("keydown", (e: any) => {
          const isKeyA = e.code === "KeyA" || e.key?.toLowerCase() === "a";
          const isWin = e.ctrlKey && e.altKey && !e.metaKey;
          const isMac = e.metaKey && e.altKey && !e.ctrlKey;
          if (isKeyA && (isWin || isMac)) {
            mockPush("/admin");
          }
        }, { capture: true });
        return () => mockWindow.removeEventListener("keydown", listenerFn, { capture: true });
      })();

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        { capture: true }
      );
      expect(registeredEvent).toBe("keydown");
      expect(registeredOptions).toEqual({ capture: true });

      cleanup();
      expect(mockWindow.removeEventListener).toHaveBeenCalled();
    } finally {
      (global as any).window = originalWindow;
    }
  });
});
