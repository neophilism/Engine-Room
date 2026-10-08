import React from "react";
import { ProjectComparison } from "../../components/projects/project-comparison";
import { PortfolioRefresh } from "../../components/portfolio/portfolio-refresh";
import { loadPortfolioOverview } from "../../lib/server/portfolio-overview";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const overview = await loadPortfolioOverview();
  return <main className="content">
    <header className="hero"><p className="eyebrow">Portfolio Intelligence</p><h1>Projects</h1>
      <p>Compare approved roadmaps, current lifecycle stages, and delivery work side by side.</p></header>
    <PortfolioRefresh />
    <ProjectComparison overview={overview} />
  </main>;
}
