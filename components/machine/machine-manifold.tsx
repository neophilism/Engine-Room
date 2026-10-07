import React, { type ReactNode } from "react";
import type { MachineState } from "../../lib/design/theme";
import { IndicatorLamp } from "./indicator-lamp";
import { Pipe } from "./pipe";

export type ManifoldInput = {
  id: string;
  label: string;
  content: ReactNode;
  state?: MachineState;
};

type MachineManifoldProps = {
  label: string;
  inputs: readonly ManifoldInput[];
  output: ReactNode;
  outputLabel: string;
  state?: MachineState;
  className?: string;
};

export function MachineManifold({
  label,
  inputs,
  output,
  outputLabel,
  state = "live",
  className
}: MachineManifoldProps) {
  return (
    <div
      className={["machine-manifold", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label}
      data-input-count={inputs.length}
    >
      <div className="machine-manifold-inputs">
        {inputs.map((input) => (
          <div className="machine-manifold-input-row" key={input.id}>
            <section className="machine-manifold-input" aria-label={input.label}>
              <IndicatorLamp state={input.state ?? state} label={input.label} size="small" />
              <div>{input.content}</div>
            </section>
            <Pipe className="machine-manifold-branch" shape="horizontal" state={input.state ?? state} />
          </div>
        ))}
      </div>

      <div className="machine-manifold-collector" aria-hidden="true">
        <Pipe shape="vertical" state={state} />
      </div>

      <div className="machine-manifold-output-pipe" aria-hidden="true">
        <Pipe shape="horizontal" state={state} />
      </div>

      <section className="machine-manifold-output" aria-label={outputLabel}>
        {output}
      </section>
    </div>
  );
}
