/**
 * CCF Design System Tokens
 * Source of Truth: CCF Product Engineering Handbook v0.5 FINAL
 *
 * Provides typed constants for colors, typography scales, radii, and spacing
 * for use in TypeScript code (motion variants, charts, canvas, inline styles).
 */

export const CCF_COLORS = {
  // Navy Foundation
  navy: {
    base: "#071426",
    deep: "#040C17",
    secondary: "#0B1D33",
  },
  // Surface Layers
  surface: {
    base: "#101F34",
    elevated: "#162842",
    sunken: "#050E1B",
  },
  // Gold Accent
  gold: {
    primary: "#D7A63D",
    light: "#E5BE65",
    dark: "#C6902D",
    muted: "rgba(215, 166, 61, 0.18)",
  },
  // Typography & Neutral Text
  text: {
    offwhite: "#F7F4EC",
    secondary: "#E2DECE",
    muted: "#A8B0BD",
    subtle: "#64748B",
  },
  // Status Feedback
  status: {
    success: "#4FA77A",
    warning: "#D6A24A",
    error: "#D16A63",
  },
} as const;

export const CCF_TYPOGRAPHY = {
  fonts: {
    display: "var(--font-display), 'Cormorant Garamond', 'Cinzel', 'Playfair Display', Georgia, serif",
    sans: "var(--font-sans), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  scale: {
    display: {
      desktop: "4.5rem",
      mobile: "2.5rem",
      lineHeight: 1.12,
      letterSpacing: "-0.02em",
    },
    h1: {
      desktop: "2.75rem",
      mobile: "2rem",
      lineHeight: 1.18,
      letterSpacing: "-0.015em",
    },
    h2: {
      desktop: "2.125rem",
      mobile: "1.625rem",
      lineHeight: 1.25,
      letterSpacing: "-0.01em",
    },
    h3: {
      desktop: "1.5rem",
      mobile: "1.25rem",
      lineHeight: 1.35,
      letterSpacing: "-0.005em",
    },
    h4: {
      size: "1.125rem",
      lineHeight: 1.4,
    },
    body: {
      size: "1rem",
      lineHeight: 1.65,
    },
    bodySmall: {
      size: "0.9375rem",
      lineHeight: 1.6,
    },
    label: {
      size: "0.875rem",
      lineHeight: 1.4,
      letterSpacing: "0.01em",
    },
    caption: {
      size: "0.8125rem",
      lineHeight: 1.5,
    },
    metadata: {
      size: "0.78125rem",
      lineHeight: 1.4,
      letterSpacing: "0.06em",
    },
  },
} as const;

export const CCF_RADII = {
  xs: "0.25rem", // 4px
  sm: "0.375rem", // 6px
  md: "0.5rem", // 8px (controls)
  lg: "0.75rem", // 12px (default)
  card: "1rem", // 16px (recommended 12-18px)
  xl: "1rem", // 16px
  "2xl": "1.25rem", // 20px
} as const;

export const CCF_SPACING_RHYTHM = {
  unit: 4, // 4px base rhythm
  sectionMobile: "3rem", // 48px
  sectionDesktop: "5rem", // 80px
  cardPadding: "1.5rem", // 24px
  cardGap: "1.5rem", // 24px
} as const;
