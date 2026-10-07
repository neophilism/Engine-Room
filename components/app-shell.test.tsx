import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname
}));

describe("AppShell", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("marks the current route in the persistent navigation", () => {
    pathname = "/operations";
    render(<AppShell><p>Operations content</p></AppShell>);

    const operationsLinks = screen.getAllByRole("link", { name: /operations/i });
    expect(operationsLinks.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("opens and closes the mobile navigation drawer", () => {
    render(<AppShell><p>Portfolio content</p></AppShell>);

    const openButton = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(openButton);

    expect(screen.getByRole("button", { name: "Close navigation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Close navigation" })[0]);
    expect(openButton).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the global shell around page content", () => {
    render(<AppShell><p>Portfolio content</p></AppShell>);

    expect(screen.getByText("Portfolio content")).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByLabelText("Portfolio data status")).toBeInTheDocument();
  });
});
