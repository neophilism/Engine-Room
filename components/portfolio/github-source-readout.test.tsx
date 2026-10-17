import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubSourceReadout, SOURCE_STATUS_REFRESH_MS } from "./github-source-readout";
import type { PublicGitHubStatus, RepositoryGitHubStatus } from "../../lib/server/public-github-status";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function sourceStatus(failing: number): PublicGitHubStatus {
  const recent = new Date().toISOString();
  const repositories: RepositoryGitHubStatus[] = Array.from({ length: 41 }, (_, n) => ({
    name: "Tracked-" + n,
    visibility: n < 18 ? "private" : "public",
    merged: 2,
    total: 2,
    lastSuccessAt: n < failing ? "2026-10-10T15:00:00.000Z" : recent,
    lastAttemptAt: recent,
    error: n < failing ? "GitHub PR access HTTP 404" : null,
    planSource: "repository"
  }));
  return {
    source: "database",
    repositoryCount: 41,
    pullRequestCount: 82,
    mergedPullRequestCount: 82,
    mostRecentObservation: recent,
    githubCredentialConfigured: true,
    repositories
  };
}

describe("GitHub source health live updates", () => {
  it("shows recovered private repositories as current after background sync without waiting five minutes", async () => {
    let failing = 18;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => sourceStatus(failing)
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<GitHubSourceReadout />);
    await waitFor(() => expect(screen.getByText(/23 of 41 repositories synchronized recently/)).toBeInTheDocument());
    expect(screen.getByText(/18 have synchronization errors/)).toBeInTheDocument();

    failing = 0;
    act(() => { window.dispatchEvent(new Event("engine-room-data-changed")); });
    await waitFor(() => expect(screen.getByText(/41 of 41 repositories synchronized recently/)).toBeInTheDocument());
    expect(screen.getByText(/No repository synchronization errors are recorded/)).toBeInTheDocument();
    expect(screen.queryByText(/18 repositories are inaccessible/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(SOURCE_STATUS_REFRESH_MS).toBe(30_000);
  });

  it("does not display outdated success after health API starts failing", async () => {
    let available = true;
    globalThis.fetch = vi.fn(async () => available ? {
      ok: true, json: async () => sourceStatus(0)
    } : { ok: false, status: 403 }) as unknown as typeof fetch;

    render(<GitHubSourceReadout />);
    await waitFor(() => expect(screen.getByText(/41 of 41 repositories synchronized recently/)).toBeInTheDocument());

    available = false;
    act(() => { window.dispatchEvent(new Event("engine-room-github-sync-complete")); });
    await waitFor(() => expect(screen.getByText(/GitHub import status loading or unavailable/)).toBeInTheDocument());
    expect(screen.queryByText(/41 of 41 repositories synchronized recently/)).not.toBeInTheDocument();
  });
});
