import { createHash, timingSafeEqual } from "node:crypto";
import type { EnvironmentSource } from "../config/env";

export type AdminAuthorization = "authorized" | "unauthorized" | "unconfigured";

export function authorizeAdmin(headers: Headers, source: EnvironmentSource = process.env): AdminAuthorization {
  const secret = source.ENGINE_ROOM_ADMIN_TOKEN;
  if (!secret || secret.length < 32) return "unconfigured";
  const header = headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return "unauthorized";
  const submitted = header.slice(7);
  if (submitted.length < 32 || submitted.length > 512) return "unauthorized";
  const actual = createHash("sha256").update(submitted).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(actual, expected) ? "authorized" : "unauthorized";
}

export function trustedWriteOrigin(request: Request, source: EnvironmentSource = process.env): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Allows authenticated server-to-server schedulers.
  try {
    const submitted = new URL(origin);
    if (submitted.origin !== origin) return false;
    const requestOrigin = new URL(request.url).origin;
    const configuredOrigin = source.ENGINE_ROOM_BASE_URL ? new URL(source.ENGINE_ROOM_BASE_URL).origin : requestOrigin;
    return origin === requestOrigin || origin === configuredOrigin;
  } catch {
    return false;
  }
}
