"use client";

type ValveProps = {
  label: string;
  open: boolean;
  onChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Valve({ label, open, onChange, disabled = false, className }: ValveProps) {
  return (
    <button
      type="button"
      className={["machine-valve", className].filter(Boolean).join(" ")}
      aria-label={`${label}: ${open ? "open" : "closed"}`}
      aria-pressed={open}
      data-open={open ? "true" : "false"}
      disabled={disabled}
      onClick={() => onChange?.(!open)}
    >
      <span className="machine-valve-body" aria-hidden="true">
        <span className="machine-valve-wheel">
          {Array.from({ length: 6 }, (_, index) => (
            <span className="machine-valve-spoke" key={index} style={{ transform: `rotate(${index * 30}deg)` }} />
          ))}
          <span className="machine-valve-hub" />
        </span>
      </span>
      <span className="machine-valve-label">
        <strong>{label}</strong>
        <small>{open ? "Open" : "Closed"}</small>
      </span>
    </button>
  );
}
