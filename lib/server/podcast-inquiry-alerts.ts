import { cookies } from "next/headers";
import { readSession } from "../auth/database";
import { SESSION_COOKIE } from "../auth/security";

type Office = { id: string; memberName: string; chamber: string; state: string; district: string | null; submittedAt: string };
export type PodcastInquiryAlertSummary = {
  uniqueOffices: number;
  offices: Office[];
  source: "FiresideChat";
  verification: string;
  asOf: string;
};

export function validateInquirySummary(value: unknown): PodcastInquiryAlertSummary | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!Number.isSafeInteger(item.uniqueOffices) || Number(item.uniqueOffices) < 0 ||
      !Array.isArray(item.offices) || item.offices.length > 30 || item.source !== "FiresideChat" ||
      typeof item.asOf !== "string" || typeof item.verification !== "string") return null;
  const offices: Office[] = [];
  for (const row of item.offices) {
    if (!row || typeof row !== "object") return null;
    const o = row as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.memberName !== "string" || o.memberName.length > 120 ||
        typeof o.chamber !== "string" || !["HOUSE","SENATE"].includes(o.chamber) ||
        typeof o.state !== "string" || o.state.length > 4 ||
        o.district !== null && typeof o.district !== "string" ||
        typeof o.submittedAt !== "string") return null;
    offices.push({ id:o.id, memberName:o.memberName, chamber:o.chamber, state:o.state,
      district: o.district as string|null, submittedAt:o.submittedAt });
  }
  return { uniqueOffices:Number(item.uniqueOffices), offices, source:"FiresideChat",
    verification:item.verification.slice(0,140), asOf:item.asOf };
}

export async function loadPodcastInquiryAlerts(): Promise<PodcastInquiryAlertSummary | null> {
  const token = process.env.ENGINE_ROOM_INQUIRY_TOKEN;
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return null;

  try {
    // Never show even public officeholder identity to an unauthenticated or viewer account.
    const current = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (current?.role !== "admin") return null;

    const base = process.env.FIRESIDE_CHAT_BASE_URL || "https://fireside-chat-preview.onrender.com";
    const destination = new URL("/api/internal/podcast-production-inquiries", base);
    if (destination.protocol !== "https:" || destination.username || destination.password)
      return null;
    const response = await fetch(destination, {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const result: unknown = await response.json();
    return validateInquirySummary(result);
  } catch {
    return null;
  }
}
