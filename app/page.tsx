import React from "react";
import { loadPodcastInquiryAlerts } from "../lib/server/podcast-inquiry-alerts";
import { PortfolioHome } from "../components/portfolio/portfolio-home";
import { loadPortfolioOverview } from "../lib/server/portfolio-overview";
import { loadRenderDeployments } from "../lib/server/render-deployments";
import "../components/portfolio/render-service-readouts.css";
import {readNeonBudget} from "../lib/budget/neon-budget.mjs";
import {BudgetAlert} from "../components/portfolio/budget-alert";

export const dynamic = "force-dynamic";

export default async function Home() {
  const budget=await readNeonBudget();
  if(budget.paused && budget.status !== "unconfigured" && process.env.ENGINE_ROOM_TEST_SERVER !== '1')return <main className="content dashboard-home"><h1>Engine Room</h1><BudgetAlert/><p>Cost protection is active. Expensive portfolio and external-service reads are disabled until usage can be verified and the budget is authorized.</p></main>;
  const [overview, renderServices, inquiryAlerts] = await Promise.all([loadPortfolioOverview(), loadRenderDeployments(), loadPodcastInquiryAlerts()]);
  return <PortfolioHome overview={overview} renderServices={renderServices} inquiryAlerts={inquiryAlerts} />;
}
