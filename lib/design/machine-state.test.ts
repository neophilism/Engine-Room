import { describe, expect, it } from "vitest";
import { machineStateReducer, type MachineEvent } from "./machine-state";
import { machineStates, type MachineState } from "./theme";

describe("machine status transitions", () => {
  it("handles work, faults, disconnection, recovery, completion, and reset", () => {
    const sequence: [MachineEvent, MachineState][] = [
      [{ type: "connect" }, "live"],
      [{ type: "start" }, "active"],
      [{ type: "warn" }, "warning"],
      [{ type: "block" }, "blocked"],
      [{ type: "disconnect" }, "offline"],
      [{ type: "connect" }, "live"],
      [{ type: "complete" }, "complete"],
      [{ type: "reset" }, "neutral"]
    ];
    let state: MachineState = "neutral";
    for (const [event, expected] of sequence) {
      state = machineStateReducer(state, event);
      expect(state).toBe(expected);
    }
  });

  it.each(machineStates)("accepts reconciled %s status without waiting for animation", (state) => {
    expect(machineStateReducer("offline", { type: "state", state })).toBe(state);
    expect(machineStateReducer(state, { type: "state", state })).toBe(state);
  });
});
