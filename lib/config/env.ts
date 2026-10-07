export type RuntimeEnvironment = "development" | "test" | "production";
export type EnvironmentSource = Record<string, string | undefined>;

export type RuntimeConfig = {
  nodeEnv: RuntimeEnvironment;
  databaseUrl?: string;
  appBaseUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
};

function clean(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function readNodeEnv(value: string | undefined): RuntimeEnvironment {
  const normalized = clean(value) ?? "development";
  if (normalized === "development" || normalized === "test" || normalized === "production") {
    return normalized;
  }
  throw new Error(`Unsupported NODE_ENV: ${normalized}`);
}

function readLogLevel(value: string | undefined): RuntimeConfig["logLevel"] {
  const normalized = clean(value) ?? "info";
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
    return normalized;
  }
  throw new Error(`Unsupported LOG_LEVEL: ${normalized}`);
}

export function getRuntimeConfig(source: EnvironmentSource = process.env): RuntimeConfig {
  return {
    nodeEnv: readNodeEnv(source.NODE_ENV),
    databaseUrl: clean(source.DATABASE_URL),
    appBaseUrl: clean(source.ENGINE_ROOM_BASE_URL) ?? "http://localhost:3000",
    logLevel: readLogLevel(source.LOG_LEVEL)
  };
}

export function requireDatabaseUrl(source: EnvironmentSource = process.env) {
  const databaseUrl = getRuntimeConfig(source).databaseUrl;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database operations.");
  }
  return databaseUrl;
}
