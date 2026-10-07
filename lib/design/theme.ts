export const machineStates = [
  "neutral",
  "live",
  "active",
  "complete",
  "warning",
  "blocked",
  "offline"
] as const;

export type MachineState = (typeof machineStates)[number];

export type MachineStateAppearance = {
  label: string;
  cssColor: string;
  cssGlow: string | null;
};

const appearances: Record<MachineState, MachineStateAppearance> = {
  neutral: {
    label: "Neutral",
    cssColor: "var(--er-status-neutral)",
    cssGlow: null
  },
  live: {
    label: "Live",
    cssColor: "var(--er-status-live)",
    cssGlow: "var(--er-glow-teal-sm)"
  },
  active: {
    label: "Active",
    cssColor: "var(--er-status-active)",
    cssGlow: "var(--er-glow-teal-sm)"
  },
  complete: {
    label: "Complete",
    cssColor: "var(--er-status-complete)",
    cssGlow: "var(--er-glow-teal-sm)"
  },
  warning: {
    label: "Warning",
    cssColor: "var(--er-status-warning)",
    cssGlow: "var(--er-glow-amber)"
  },
  blocked: {
    label: "Blocked",
    cssColor: "var(--er-status-blocked)",
    cssGlow: "var(--er-glow-red)"
  },
  offline: {
    label: "Offline",
    cssColor: "var(--er-status-offline)",
    cssGlow: null
  }
};

export function getMachineStateAppearance(state: MachineState): MachineStateAppearance {
  return appearances[state];
}
