import type { CSSProperties } from "react";
import type { MachineState } from "../../lib/design/theme";
import { machineStateStyle, rangePercent } from "./utils";

type GlassTubeProps = {
  value: number;
  min?: number;
  max: number;
  label: string;
  state?: MachineState;
  size?: "compact" | "standard" | "large";
  showScale?: boolean;
  className?: string;
};

export function GlassTube({
  value,
  min = 0,
  max,
  label,
  state = "live",
  size = "standard",
  showScale = false,
  className
}: GlassTubeProps) {
  const percent = rangePercent(value, min, max);
  const style = {
    ...machineStateStyle(state),
    "--machine-fill": `${percent}%`
  } as CSSProperties;

  const classes = [
    "machine-glass-tube",
    `machine-glass-tube-${size}`,
    className
  ].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      role="progressbar"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
      data-state={state}
      style={style}
    >
      <span className="machine-tube-endcap machine-tube-endcap-left" aria-hidden="true" />
      <span className="machine-tube-chamber" aria-hidden="true">
        <span className="machine-tube-fill" />
        <span className="machine-tube-highlight" />
        {showScale && (
          <span className="machine-tube-scale">
            {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
          </span>
        )}
      </span>
      <span className="machine-tube-endcap machine-tube-endcap-right" aria-hidden="true" />
    </div>
  );
}
