import React from "react";
import type { ReactNode } from "react";

type BrassPanelProps = {
  eyebrow?: string;
  title?: string;
  status?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function BrassPanel({ eyebrow, title, status, children, className }: BrassPanelProps) {
  const classes = ["machine-panel", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label={title ?? eyebrow ?? "Machine panel"}>
      {(eyebrow || title || status) && (
        <header className="machine-panel-header">
          <div className="machine-panel-heading">
            {eyebrow && <p className="machine-engraved-label">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {status && <div className="machine-panel-status">{status}</div>}
        </header>
      )}
      <div className="machine-panel-body">{children}</div>
    </section>
  );
}
