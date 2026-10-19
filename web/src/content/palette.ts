import type { PaletteId } from "./types";

// Team-color pairs a student can pick for their skin (R-38). Colors alone, never logos or
// names. Primary carries white text (x-containers, the team badge), so it needs 4.5:1
// against white; secondary is drawn as shapes on the white card, so it needs 3:1.

export interface Colors {
  label: string;
  primary: string;
  secondary: string;
}

export const PALETTE: Record<PaletteId, Colors> = {
  red_pewter: { label: "Red and pewter", primary: "#b3261e", secondary: "#6e6a63" },
  blue_red: { label: "Blue and red", primary: "#1f3f8f", secondary: "#c8102e" },
  green_gold: { label: "Green and gold", primary: "#1d6b3a", secondary: "#a87d0a" },
  purple_black: { label: "Purple and black", primary: "#4b2a7b", secondary: "#1f1f24" },
  orange_navy: { label: "Orange and navy", primary: "#b4440f", secondary: "#14284b" },
  teal_silver: { label: "Teal and silver", primary: "#0f6f74", secondary: "#717b84" },
};

export const PALETTE_IDS = Object.keys(PALETTE) as PaletteId[];

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two "#rrggbb" colors. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
