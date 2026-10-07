import type { CSSProperties } from "react";
import { getMachineStateAppearance, type MachineState } from "../../lib/design/theme";
import { machineStateStyle } from "./utils";

type IndicatorLampProps = {
  state: MachineState;
  label: string;
  size?: "small" | "medium" | "large";
  className?: string;
};

export function IndicatorLamp({ state, label, size = "medium", className }: IndicatorLampProps) {
  const appearance = getMachineStateAppearance(state);
  const classes = ["machine-lamp", `machine-lamp-${size}`, className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      role="img"
      aria-label={`${label}: ${appearance.label}`}
      title={`${label}: ${appearance.label}`}
      data-state={state}
      style={machineStateStyle(state) as CSSProperties}
    >
      <span className="machine-lamp-bezel" aria-hidden="true">
        <span className="machine-lamp-bulb" />
        <span className="machine-lamp-glint" />
      </span>
    </span>
  );
}
