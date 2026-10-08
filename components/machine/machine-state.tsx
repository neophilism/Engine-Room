"use client";

import React, { type ReactNode } from "react";
import { getMachineStateAppearance, type MachineState } from "../../lib/design/theme";
import { IndicatorLamp } from "./indicator-lamp";
import { machineStateStyle } from "./utils";
import { MachineStateContext } from "./machine-context";

type MachineProps = {
  label: string;
  state: MachineState;
  children: ReactNode;
  className?: string;
};

export function Machine({ label, state, children, className }: MachineProps) {
  const appearance = getMachineStateAppearance(state);

  return (
    <MachineStateContext.Provider value={state}>
      <div
        className={["machine-state-group", className].filter(Boolean).join(" ")}
        role="group"
        aria-label={label}
        data-state={state}
        style={machineStateStyle(state)}
      >
        <div className="machine-state-readout">
          <IndicatorLamp state={state} label={label} size="small" />
          <span role="status" aria-live="polite" aria-atomic="true">
            {label}: {appearance.label}
          </span>
        </div>
        {children}
      </div>
    </MachineStateContext.Provider>
  );
}
