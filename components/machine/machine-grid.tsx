import React, { type ReactNode } from "react";

type MachineGridProps = {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  label?: string;
};

export function MachineGrid({ children, columns = 3, className, label }: MachineGridProps) {
  return (
    <div
      className={["machine-grid", className].filter(Boolean).join(" ")}
      data-columns={columns}
      role={label ? "group" : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}
