import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveConnection } from "./live-connection";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const snapshot = {
  revision: "1", state: "stale", checkedAt: "2026-10-10T12:00:00Z", oldestSyncAt: null,
  latestSyncAt: null, workerAt: null, repositories: 2, unsynchronized: 2, failedRepositories: 0,
  pendingEvents: 0, failedEvents: 0, webhookConfigured: false, authenticatedGitHub: true,
  renderConfigured: false, pollingMinutes: 15, openPrs: 4, failedChecks: 0, rateLimitResetAt: null
};
const fetchMock = vi.fn();
const previousFetch = globalThis.fetch;
const originalEventSource = globalThis.EventSource;

afterEach(() => {
  globalThis.fetch = previousFetch;
  globalThis.EventSource = originalEventSource;
  fetchMock.mockReset();
  refresh.mockReset();
});

function setup(outcome: object, status = 200) {
  globalThis.EventSource = undefined as unknown as typeof EventSource;
  globalThis.fetch = fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/live") return { ok: true, status: 200, json: async () => snapshot };
    return { ok: status < 400, status, json: async () => outcome };
  });
}

describe("header GitHub synchronization", () => {
  it("performs a manual GitHub sync, then refreshes the dashboard", async () => {
    setup({ status: "succeeded", repositories: 2, failed: 0 });
    render(<LiveConnection />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh GitHub data" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 repositories checked"));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/reconcile", expect.objectContaining({
      method: "POST", body: JSON.stringify({ mode: "manual" }), cache: "no-store"
    }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not claim success when only part of the portfolio refreshed", async () => {
    setup({ status: "partial", repositories: 1, failed: 3 });
    render(<LiveConnection />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh GitHub data" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("3 PR queries failed"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports missing admin permission rather than refreshing cached data", async () => {
    setup({ error: "Administrator required" }, 401);
    render(<LiveConnection />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh GitHub data" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Administrator access"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports rate limits without claiming fresh data", async () => {
    setup({ status: "rate-limited", repositories: 0, failed: 0 });
    render(<LiveConnection />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh GitHub data" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("rate limit"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not report an empty run as a completed refresh", async () => {
    setup({ status: "succeeded", repositories: 0, failed: 0 });
    render(<LiveConnection />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh GitHub data" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No repositories were refreshed"));
    expect(refresh).not.toHaveBeenCalled();
  });
});
