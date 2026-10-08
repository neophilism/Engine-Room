import type { MachineState } from "./theme";

export type MachineEvent =
  | { type: "connect" | "start" | "complete" | "warn" | "block" | "disconnect" | "reset" }
  | { type: "state"; state: MachineState };

// These events describe observed machine status, not project lifecycle gates.
// Recovery and reconciliation may report any canonical state directly.
export function machineStateReducer(state: MachineState, event: MachineEvent): MachineState {
  switch (event.type) {
    case "connect": return "live";
    case "start": return "active";
    case "complete": return "complete";
    case "warn": return "warning";
    case "block": return "blocked";
    case "disconnect": return "offline";
    case "reset": return "neutral";
    case "state": return event.state;
    default: return state;
  }
}
