import React from "react";
import { loadPodcastInquiryAlerts } from "../lib/server/podcast-inquiry-alerts";
import { PortfolioHome } from "../components/portfolio/portfolio-home";
import { loadPortfolioOverview } from "../lib/server/portfolio-overview";
import { loadRenderDeployments } from "../lib/server/render-deployments";
import "../components/portfolio/render-service-readouts.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [overview, renderServices, inquiryAlerts] = await Promise.all([loadPortfolioOverview(), loadRenderDeployments(), loadPodcastInquiryAlerts()]);
  return <PortfolioHome overview={overview} renderServices={renderServices} inquiryAlerts={inquiryAlerts} />;
}
