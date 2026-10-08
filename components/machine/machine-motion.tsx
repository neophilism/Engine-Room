"use client";

import React, { createContext, useContext, useState, type ReactNode } from "react";

const MotionContext = createContext<{
  paused: boolean;
  toggle: () => void;
} | null>(null);

export function MachineMotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);

  return (
    <MotionContext.Provider value={{ paused, toggle: () => setPaused((value) => !value) }}>
      <div className="machine-motion-root" data-machine-motion={paused ? "paused" : "system"}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function MachineMotionToggle() {
  const motion = useContext(MotionContext);
  if (!motion) return null;

  return (
    <button
      type="button"
      className="machine-motion-toggle"
      aria-label="Pause machine motion"
      aria-pressed={motion.paused}
      title={motion.paused ? "Resume machine motion" : "Pause machine motion"}
      onClick={motion.toggle}
    >
      <span aria-hidden="true">{motion.paused ? "▶" : "Ⅱ"}</span>
    </button>
  );
}
