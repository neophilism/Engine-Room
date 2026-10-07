import { describe, expect, it } from "vitest";
import { getMachineStateAppearance, machineStates } from "./theme";

describe("machine design states", () => {
  it("defines a semantic appearance for every machine state", () => {
    for (const state of machineStates) {
      const appearance = getMachineStateAppearance(state);
      expect(appearance.label.length).toBeGreaterThan(0);
      expect(appearance.cssColor).toContain("--er-status-");
    }
  });

  it("gives warning and blocked states distinct alert glows", () => {
    expect(getMachineStateAppearance("warning").cssGlow).toBe("var(--er-glow-amber)");
    expect(getMachineStateAppearance("blocked").cssGlow).toBe("var(--er-glow-red)");
  });

  it("keeps offline visually non-glowing", () => {
    expect(getMachineStateAppearance("offline").cssGlow).toBeNull();
  });
});
