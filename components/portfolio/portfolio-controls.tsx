"use client";

import React from "react";
import { projectStatuses, type ProjectStatus } from "../../lib/domain/portfolio";
import { defaultPortfolioQuery, type PortfolioQuery, type PortfolioSort } from "../../lib/domain/portfolio-query";

export function PortfolioControls({ query, onChange }: { query: PortfolioQuery; onChange: (query: PortfolioQuery) => void }) {
  return <form className="portfolio-controls" role="search" aria-label="Filter portfolio" onSubmit={(event) => event.preventDefault()}>
    <label>Search projects<input type="search" value={query.search} placeholder="Project or repository"
      onChange={(event) => onChange({ ...query, search: event.target.value })} /></label>
    <label>Lifecycle<select value={query.status} onChange={(event) => onChange({ ...query, status: event.target.value as ProjectStatus | "all" })}>
      <option value="all">All stages</option>
      {projectStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("-", " ")}</option>)}
    </select></label>
    <label>Sort projects<select value={query.sort} onChange={(event) => onChange({ ...query, sort: event.target.value as PortfolioSort })}>
      <option value="portfolio">Portfolio order</option><option value="name">Name</option>
      <option value="completion-desc">Most complete</option><option value="completion-asc">Least complete</option>
      <option value="underway">Most PRs underway</option>
    </select></label>
    {(query.search.trim() !== "" || query.status !== "all") && <button className="portfolio-control-button" type="button" onClick={() => onChange(defaultPortfolioQuery)}>Clear filters</button>}
  </form>;
}
