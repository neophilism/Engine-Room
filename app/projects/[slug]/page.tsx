import React from "react";
import { notFound } from "next/navigation";
import { ProjectDashboard } from "../../../components/projects/project-dashboard";
import { PortfolioRefresh } from "../../../components/portfolio/portfolio-refresh";
import { loadProjectDashboard } from "../../../lib/server/project-dashboard";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadProjectDashboard(slug);
  if (data.source === "database" && !data.project) notFound();
  return <><ProjectDashboard data={data} /><div className="project-page-refresh"><PortfolioRefresh /></div></>;
}
