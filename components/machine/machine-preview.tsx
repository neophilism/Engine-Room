"use client";

import React from "react";
import { getMachineStateAppearance, machineStates, type MachineState } from "../../lib/design/theme";
import { BrassPanel } from "./brass-panel";
import { Gauge } from "./gauge";
import { GlassTube } from "./glass-tube";
import { MachineGrid } from "./machine-grid";
import { Machine } from "./machine-state";
import { useMachineController } from "./machine-context";
import { Valve } from "./valve";

const previewValues: Record<MachineState, number> = {
  neutral: 0, live: 25, active: 65, complete: 100, warning: 50, blocked: 35, offline: 0
};

export function MachinePreview() {
  const { state, send } = useMachineController("live");
  const value = previewValues[state];

  return (
    <BrassPanel title="Machine animation preview" eyebrow="Interactive controls" className="machine-preview-panel">
      <p className="machine-preview-description">Try the machine states with sample values.</p>
      <label className="machine-preview-selector">
        Preview machine state
        <select value={state} onChange={(event) => send({ type: "state", state: event.target.value as MachineState })}>
          {machineStates.map((option) => (
            <option key={option} value={option}>{getMachineStateAppearance(option).label}</option>
          ))}
        </select>
      </label>
      <Machine label="Preview machine" state={state}>
        <MachineGrid label="Preview instruments" columns={3}>
          <Gauge value={value} max={100} label="Preview workload" unit="%" />
          <div className="machine-preview-tube">
            <span className="machine-engraved-label">Preview progress</span>
            <GlassTube value={value} max={100} label="Preview progress" showScale />
            <strong>{value}%</strong>
          </div>
          <Valve label="Run preview" open={state === "active"} onChange={(open) => send({ type: open ? "start" : "connect" })} />
        </MachineGrid>
      </Machine>
    </BrassPanel>
  );
}
