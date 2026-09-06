import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileNav } from "@/components/site/mobile-nav";
import { PUBLIC_NAV_ITEMS } from "@/components/site/navigation-data";

interface EventListenerRecord {
  type: string;
  listener: EventListenerOrEventListenerObject;
}

let listeners: EventListenerRecord[] = [];

const mockWindow = {
  addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
    listeners.push({ type, listener });
  }),
  removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
    listeners = listeners.filter((l) => !(l.type === type && l.listener === listener));
  }),
  dispatchEvent: (event: { type: string; key?: string }) => {
    const matching = listeners.filter((l) => l.type === event.type);
    for (const record of matching) {
      if (typeof record.listener === "function") {
        record.listener(event as unknown as Event);
      } else if (record.listener && typeof record.listener.handleEvent === "function") {
        record.listener.handleEvent(event as unknown as Event);
      }
    }
    return true;
  },
};

const mockDocument = {
  body: {
    style: {
      overflow: "",
      touchAction: "",
    },
  },
};

const hasGlobalWindow = typeof global.window !== "undefined";
const hasGlobalDocument = typeof global.document !== "undefined";
const originalWindow = global.window;
const originalDocument = global.document;

describe("MobileNav DOM & Accessibility Test Suite", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    items: PUBLIC_NAV_ITEMS,
    pathname: "/",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    listeners = [];

    // Attach mock DOM globals
    global.window = mockWindow as unknown as Window & typeof globalThis;
    global.document = mockDocument as unknown as Document;

    mockDocument.body.style.overflow = "";
    mockDocument.body.style.touchAction = "";
  });

  afterEach(() => {
    mockDocument.body.style.overflow = "";
    mockDocument.body.style.touchAction = "";
    listeners = [];

    if (!hasGlobalWindow) {
      delete (global as Record<string, unknown>).window;
    } else {
      global.window = originalWindow;
    }
    if (!hasGlobalDocument) {
      delete (global as Record<string, unknown>).document;
    } else {
      global.document = originalDocument;
    }
  });

  // Helper to execute MobileNav with genuine hook execution in Node
  function renderWithHooks(props: typeof defaultProps): { unmount: () => void } {
    let cleanup: (() => void) | void = undefined;
    const reactInternals = (React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown };
    }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const previousDispatcher = reactInternals?.H;

    if (reactInternals) {
      reactInternals.H = {
        useRef: (initialValue: unknown) => ({ current: initialValue ?? { focus: vi.fn() } }),
        useEffect: (effect: React.EffectCallback) => {
          cleanup = effect();
        },
      };
    }

    try {
      // Execute component function directly to run hooks
      MobileNav(props);
    } finally {
      if (reactInternals) {
        reactInternals.H = previousDispatcher;
      }
    }

    return {
      unmount: () => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      },
    };
  }

  describe("1. Render & Modal Semantics", () => {
    it("1. MobileNav renders when open and returns empty markup when closed", () => {
      const closedHtml = renderToStaticMarkup(<MobileNav {...defaultProps} isOpen={false} />);
      expect(closedHtml).toBe("");

      const openHtml = renderToStaticMarkup(<MobileNav {...defaultProps} isOpen={true} />);
      expect(openHtml).not.toBe("");
      expect(openHtml).toContain("Crescent Club of Finance");
    });

    it("2. renders with role='dialog'", () => {
      const html = renderToStaticMarkup(<MobileNav {...defaultProps} isOpen={true} />);
      expect(html).toContain('role="dialog"');
    });

    it("3. renders with aria-modal='true'", () => {
      const html = renderToStaticMarkup(<MobileNav {...defaultProps} isOpen={true} />);
      expect(html).toContain('aria-modal="true"');
    });

    it("4. renders with aria-label='Mobile navigation menu'", () => {
      const html = renderToStaticMarkup(<MobileNav {...defaultProps} isOpen={true} />);
      expect(html).toContain('aria-label="Mobile navigation menu"');
    });

    it("5. renders accessible close button and all navigation links", () => {
      const html = renderToStaticMarkup(<MobileNav {...defaultProps} isOpen={true} />);
      expect(html).toContain('aria-label="Close navigation menu"');

      for (const item of PUBLIC_NAV_ITEMS) {
        expect(html).toContain(item.label);
        expect(html).toContain(`href="${item.href}"`);
      }
    });
  });

  describe("2. Scroll Locking, Escape Key, and Cleanup Behavior", () => {
    it("6. document.body.style.overflow becomes 'hidden' when opened", () => {
      expect(document.body.style.overflow).toBe("");

      renderWithHooks({ ...defaultProps, isOpen: true });

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("7. Escape key dispatch invokes onClose", () => {
      const onClose = vi.fn();
      renderWithHooks({ ...defaultProps, isOpen: true, onClose });

      expect(listeners.some((l) => l.type === "keydown")).toBe(true);

      // Non-Escape key does not trigger onClose
      window.dispatchEvent({ type: "keydown", key: "Enter" } as unknown as Event);
      expect(onClose).not.toHaveBeenCalled();

      // Escape key triggers onClose
      window.dispatchEvent({ type: "keydown", key: "Escape" } as unknown as Event);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("8. Closing/unmounting restores document.body.style.overflow", () => {
      document.body.style.overflow = "scroll"; // Custom previous overflow

      const instance = renderWithHooks({ ...defaultProps, isOpen: true });
      expect(document.body.style.overflow).toBe("hidden");

      // Unmount / close drawer
      instance.unmount();
      expect(document.body.style.overflow).toBe("scroll");
    });

    it("9. No global touchAction suppression is introduced", () => {
      renderWithHooks({ ...defaultProps, isOpen: true });

      // Ensure no touch-action: none or touchAction suppression was set on body
      expect(document.body.style.touchAction).toBe("");
    });

    it("10. Test cleanup restores document.body state between tests", () => {
      // Prior test operations must have left document.body in pristine state
      expect(document.body.style.overflow).toBe("");
      expect(document.body.style.touchAction).toBe("");
      expect(listeners.length).toBe(0);
    });
  });
});
