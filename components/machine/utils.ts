import type { CSSProperties } from "react";
import { getMachineStateAppearance, type MachineState } from "../../lib/design/theme";

export type MachineCssProperties = CSSProperties & {
  "--machine-state-color"?: string;
  "--machine-state-glow"?: string;
  "--machine-fill"?: string;
  "--gauge-angle"?: string;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function rangePercent(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 0;
  }

  return ((clamp(value, min, max) - min) / (max - min)) * 100;
}

export function machineStateStyle(state: MachineState): MachineCssProperties {
  const appearance = getMachineStateAppearance(state);
  return {
    "--machine-state-color": appearance.cssColor,
    "--machine-state-glow": appearance.cssGlow ?? "none"
  };
}

