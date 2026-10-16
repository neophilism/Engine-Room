import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortfolioRefresh, PORTFOLIO_REFRESH_MS } from "./portfolio-refresh";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => { vi.useRealTimers(); refresh.mockClear(); });

describe("portfolio refresh", () => {
  it("refreshes visible pages, pauses hidden pages, and removes its timer", () => {
    vi.useFakeTimers();
    let visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    const { unmount } = render(<PortfolioRefresh />);
    act(() => vi.advanceTimersByTime(PORTFOLIO_REFRESH_MS));
    expect(refresh).toHaveBeenCalledTimes(0);
    visibility = "hidden";
    act(() => vi.advanceTimersByTime(PORTFOLIO_REFRESH_MS));
    expect(refresh).toHaveBeenCalledTimes(0);
    visibility = "visible";
    fireEvent(document, new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(0);
    expect(screen.queryByRole("button", { name: "Reload display" })).not.toBeInTheDocument();
    expect(screen.getByText(/click Refresh in the header/)).toBeInTheDocument();
    unmount();
    act(() => vi.advanceTimersByTime(PORTFOLIO_REFRESH_MS));
    expect(refresh).toHaveBeenCalledTimes(0);
  });
});
