import type { AgentConfig } from "./types";

export interface Point {
  xPct: number;
  yPct: number;
}

/**
 * Spread agents across the upper-middle of the meadow on a gentle arc. Kept
 * well above the bottom HUD so sprites and their speech bubbles are never
 * hidden behind the control/log panels. Pure + deterministic.
 */
export function meadowLayout(agents: AgentConfig[]): Record<string, Point> {
  const n = agents.length;
  const out: Record<string, Point> = {};
  agents.forEach((a, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const xPct = 12 + 76 * t;
    const arc = Math.sin(t * Math.PI) * 6;
    const yPct = 50 - arc + (i % 2 ? 4 : -2);
    out[a.id] = { xPct, yPct };
  });
  return out;
}
