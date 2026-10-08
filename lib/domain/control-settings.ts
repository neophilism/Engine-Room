export const reconciliationIntervals = [15, 30, 60, 180, 360, 720, 1440] as const;

export type ControlSettings = {
  githubReconciliationEnabled: boolean;
  githubReconciliationIntervalMinutes: number;
};

export const defaultControlSettings: ControlSettings = {
  githubReconciliationEnabled: false,
  githubReconciliationIntervalMinutes: 60
};

export class InvalidControlSettings extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidControlSettings("Settings must be an object.");
  }
  return value as Record<string, unknown>;
}

export function parseControlSettings(value: unknown): ControlSettings {
  const input = record(value);
  const keys = Object.keys(input).sort();
  if (keys.join(",") !== "githubReconciliationEnabled,githubReconciliationIntervalMinutes") {
    throw new InvalidControlSettings("Settings fields are missing or unsupported.");
  }
  if (typeof input.githubReconciliationEnabled !== "boolean" ||
    !reconciliationIntervals.some((interval) => interval === input.githubReconciliationIntervalMinutes)) {
    throw new InvalidControlSettings("Invalid reconciliation enablement or interval.");
  }
  return {
    githubReconciliationEnabled: input.githubReconciliationEnabled,
    githubReconciliationIntervalMinutes: input.githubReconciliationIntervalMinutes as number
  };
}

export function parseControlUpdate(value: unknown): { expectedRevision: number; settings: ControlSettings } {
  const input = record(value);
  if (Object.keys(input).sort().join(",") !== "expectedRevision,settings" ||
    !Number.isSafeInteger(input.expectedRevision) ||
    (input.expectedRevision as number) < 0 ||
    (input.expectedRevision as number) > 2_000_000_000) {
    throw new InvalidControlSettings("A valid expected revision and settings payload are required.");
  }
  return { expectedRevision: input.expectedRevision as number, settings: parseControlSettings(input.settings) };
}

export function parseInstallationId(value: string | undefined): number | null {
  const text = value?.trim() ?? "";
  if (!/^[1-9]\d{0,14}$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}
