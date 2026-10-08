"use client";

import React, { Children, type ReactNode } from "react";
import { Pipe } from "./pipe";
import type { MachineState } from "../../lib/design/theme";
import { useMachineState } from "./machine-context";
import { machineStateStyle } from "./utils";

type MachineFlowProps = {
  label: string;
  children: ReactNode;
  state?: MachineState;
  className?: string;
};

export function MachineFlow({ label, children, state: explicitState, className }: MachineFlowProps) {
  const state = useMachineState(explicitState);
  const nodes = Children.toArray(children);

  return (
    <div
      className={["machine-flow", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label}
      data-flow-count={nodes.length}
      data-state={state}
    >
      {nodes.map((node, index) => (
        <React.Fragment key={index}>
          <div className="machine-flow-node">{node}</div>
          {index < nodes.length - 1 && (
            <div className="machine-flow-connector" aria-hidden="true">
              <Pipe className="machine-flow-pipe-desktop" shape="horizontal" state={state} />
              <Pipe className="machine-flow-pipe-mobile" shape="vertical" state={state} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

type FlowStationProps = {
  eyebrow?: string;
  title: string;
  detail?: string;
  children?: ReactNode;
  state?: MachineState;
};

export function FlowStation({ eyebrow, title, detail, children, state: explicitState }: FlowStationProps) {
  const state = useMachineState(explicitState, "neutral");
  return (
    <section className="machine-flow-station" aria-label={title} data-state={state} style={machineStateStyle(state)}>
      {eyebrow && <span className="machine-engraved-label">{eyebrow}</span>}
      <strong>{title}</strong>
      {detail && <small>{detail}</small>}
      {children}
    </section>
  );
}

