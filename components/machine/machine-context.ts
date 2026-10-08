"use client";

import { createContext, useContext, useReducer } from "react";
import { machineStateReducer } from "../../lib/design/machine-state";
import type { MachineState } from "../../lib/design/theme";

export const MachineStateContext = createContext<MachineState | undefined>(undefined);

export function useMachineState(state?: MachineState, fallback: MachineState = "live") {
  const inheritedState = useContext(MachineStateContext);
  return state ?? inheritedState ?? fallback;
}

export function useMachineController(initialState: MachineState = "neutral") {
  const [state, send] = useReducer(machineStateReducer, initialState);
  return { state, send };
}
