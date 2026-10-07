import type { CSSProperties } from "react";
import type { MachineState } from "../../lib/design/theme";
import { machineStateStyle } from "./utils";

export type PipeShape = "horizontal" | "vertical" | "elbow-ne" | "elbow-se" | "elbow-sw" | "elbow-nw";

type PipeProps = {
  shape?: PipeShape;
  state?: MachineState;
  label?: string;
  className?: string;
};

const paths: Record<PipeShape, string> = {
  horizontal: "M0 50 H100",
  vertical: "M50 0 V100",
  "elbow-ne": "M0 50 H50 Q75 50 75 25 V0",
  "elbow-se": "M0 50 H50 Q75 50 75 75 V100",
  "elbow-sw": "M100 50 H50 Q25 50 25 75 V100",
  "elbow-nw": "M100 50 H50 Q25 50 25 25 V0"
};

export function Pipe({ shape = "horizontal", state = "neutral", label, className }: PipeProps) {
  return (
    <svg
      className={["machine-pipe", `machine-pipe-${shape}`, className].filter(Boolean).join(" ")}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-state={state}
      style={machineStateStyle(state) as CSSProperties}
    >
      <path className="machine-pipe-shadow" d={paths[shape]} />
      <path className="machine-pipe-metal" d={paths[shape]} />
      <path className="machine-pipe-core" d={paths[shape]} />
      <path className="machine-pipe-highlight" d={paths[shape]} />
    </svg>
  );
}
