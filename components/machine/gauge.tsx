"use client";

import React from "react";
import type { CSSProperties } from "react";
import type { MachineState } from "../../lib/design/theme";
import { clamp, machineStateStyle, rangePercent } from "./utils";
import { useMachineState } from "./machine-context";

type GaugeProps = {
  value: number;
  min?: number;
  max: number;
  label: string;
  unit?: string;
  state?: MachineState;
  precision?: number;
  className?: string;
};

export function Gauge({
  value,
  min = 0,
  max,
  label,
  unit = "",
  state: explicitState,
  precision = 0,
  className
}: GaugeProps) {
  const state = useMachineState(explicitState);
  const bounded = clamp(value, min, max);
  const percent = rangePercent(bounded, min, max);
  const angle = -120 + (percent / 100) * 240;
  const style = {
    ...machineStateStyle(state),
    "--gauge-angle": `${angle}deg`
  } as CSSProperties;

  return (
    <div
      className={["machine-gauge", className].filter(Boolean).join(" ")}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value.toFixed(precision)}${unit}`}
      data-state={state}
      style={style}
    >
      <div className="machine-gauge-face" aria-hidden="true">
        <span className="machine-gauge-arc" />
        <span className="machine-gauge-ticks">
          {Array.from({ length: 11 }, (_, index) => (
            <span key={index} style={{ transform: `rotate(${-120 + index * 24}deg)` }} />
          ))}
        </span>
        <span className="machine-gauge-needle" />
        <span className="machine-gauge-hub" />
      </div>
      <div className="machine-gauge-readout">
        <span className="machine-engraved-label">{label}</span>
        <strong>{value.toFixed(precision)}{unit}</strong>
      </div>
    </div>
  );
}

