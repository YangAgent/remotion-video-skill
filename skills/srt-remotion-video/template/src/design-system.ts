type HostSparkle = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  fontSize: number;
  phase: number;
  base: number;
  amp: number;
  speed: number;
};

export const designTokens = {
  background: {
    host: "#FDF6E3",
    paper: "#FFFEF9",
    grid: "#9EA7AD",
  },
  accent: {
    primary: "#F5B041",
  },
} as const;

export const hostDecor = {
  gridSize: "20px 20px",
  gridSizePx: 20,
  gridOpacity: 0.28,
  gridScrollSpeed: 18,
  sparkles: [
    { top: 75, left: 160, fontSize: 14, phase: 0, base: 0.5, amp: 0.3, speed: 0.11 },
    { top: 50, right: 200, fontSize: 10, phase: 0.5, base: 0.4, amp: 0.3, speed: 0.13 },
    { bottom: 85, right: 150, fontSize: 12, phase: 1, base: 0.4, amp: 0.3, speed: 0.14 },
    { bottom: 60, left: 220, fontSize: 10, phase: 2, base: 0.35, amp: 0.3, speed: 0.12 },
    { top: 160, right: 120, fontSize: 8, phase: 1.5, base: 0.3, amp: 0.25, speed: 0.15 },
  ] satisfies HostSparkle[],
} as const;
