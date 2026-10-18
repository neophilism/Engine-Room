import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubSourceReadout } from "./github-source-readout";

const observation = (count: number) => ({
  source: "database", repositoryCount: count, pullRequestCount: 10,
  mergedPullRequestCount: 8, mostRecentObservation: new Date().toISOString(),
  repositories: [{name:"Example",visibility:"private",merged:8,total:10,
    lastSuccessAt:new Date().toISOString(),lastAttemptAt:null,error:null,planSource:"repository"}]
});
afterEach(() => vi.unstubAllGlobals());

describe("GitHub source readout refresh", () => {
  it("updates counts on portfolio revision events and preserves private provenance", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>observation(52)})
      .mockResolvedValueOnce({ok:true,json:async()=>observation(53)});
    vi.stubGlobal("fetch", fetcher);
    render(<GitHubSourceReadout/>);
    await screen.findByText("52");
    expect(screen.getByText("Private")).toBeInTheDocument();
    act(()=>window.dispatchEvent(new Event("engine-room-data-changed")));
    await screen.findByText("53");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("clears old counts after an HTTP error instead of presenting them as current", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ok:true,json:async()=>observation(52)})
      .mockResolvedValueOnce({ok:false,status:503}));
    render(<GitHubSourceReadout/>);
    await screen.findByText("52");
    act(()=>window.dispatchEvent(new Event("engine-room-github-sync-complete")));
    await waitFor(()=>expect(screen.queryByText("52")).not.toBeInTheDocument());
    expect(screen.getByText(/loading or unavailable/)).toBeInTheDocument();
  });
  it("coalesces simultaneous refresh events and removes listeners on unmount", async () => {
    let resolve!: (value: unknown) => void;
    const fetcher=vi.fn().mockImplementation(()=>new Promise(r=>{resolve=r;}));
    vi.stubGlobal("fetch",fetcher);
    const view=render(<GitHubSourceReadout/>);
    act(()=>{
      window.dispatchEvent(new Event("engine-room-data-changed"));
      window.dispatchEvent(new Event("engine-room-github-sync-complete"));
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async()=>resolve({ok:true,json:async()=>observation(52)}));
    view.unmount();
    window.dispatchEvent(new Event("engine-room-data-changed"));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
