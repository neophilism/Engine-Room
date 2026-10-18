import React from "react";
import { loadPodcastInquiryAlerts } from "../lib/server/podcast-inquiry-alerts";
import { PortfolioHome } from "../components/portfolio/portfolio-home";
import { loadPortfolioSnapshot } from "../lib/server/portfolio-snapshot";
import { loadRenderDeployments } from "../lib/server/render-deployments";
import "../components/portfolio/render-service-readouts.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [snapshot, renderServices, inquiryAlerts] = await Promise.all([loadPortfolioSnapshot(), loadRenderDeployments(), loadPodcastInquiryAlerts()]);
  const {overview,velocity,github}=snapshot;
  return <PortfolioHome overview={overview} renderServices={renderServices} inquiryAlerts={inquiryAlerts} velocity={velocity} githubStatus={github} />;
}
