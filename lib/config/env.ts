export type RuntimeEnvironment = "development" | "test" | "production";
export type EnvironmentSource = Record<string, string | undefined>;

export type GitHubRuntimeConfig = {
  appId?: string;
  privateKey?: string;
  webhookSecret?: string;
  apiBaseUrl: string;
};

export type GitHubAppConfig = {
  appId: string;
  privateKey: string;
  apiBaseUrl: string;
};

export type RuntimeConfig = {
  nodeEnv: RuntimeEnvironment;
  databaseUrl?: string;
  appBaseUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
  github: GitHubRuntimeConfig;
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

function normalizePrivateKey(value: string | undefined) {
  return clean(value)?.replace(/\\n/g, "\n");
}

export function getRuntimeConfig(source: EnvironmentSource = process.env): RuntimeConfig {
  return {
    nodeEnv: readNodeEnv(source.NODE_ENV),
    databaseUrl: clean(source.DATABASE_URL),
    appBaseUrl: clean(source.ENGINE_ROOM_BASE_URL) ?? "http://localhost:3000",
    logLevel: readLogLevel(source.LOG_LEVEL),
    github: {
      appId: clean(source.GITHUB_APP_ID),
      privateKey: normalizePrivateKey(source.GITHUB_APP_PRIVATE_KEY),
      webhookSecret: clean(source.GITHUB_WEBHOOK_SECRET),
      apiBaseUrl: clean(source.GITHUB_API_BASE_URL) ?? "https://api.github.com"
    }
  };
}

export function requireDatabaseUrl(source: EnvironmentSource = process.env) {
  const databaseUrl = getRuntimeConfig(source).databaseUrl;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database operations.");
  }
  return databaseUrl;
}

export function requireGitHubAppConfig(source: EnvironmentSource = process.env): GitHubAppConfig {
  const { appId, privateKey, apiBaseUrl } = getRuntimeConfig(source).github;
  const missing = [
    !appId ? "GITHUB_APP_ID" : undefined,
    !privateKey ? "GITHUB_APP_PRIVATE_KEY" : undefined
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`GitHub App configuration is missing: ${missing.join(", ")}.`);
  }

  return { appId: appId!, privateKey: privateKey!, apiBaseUrl };
}
