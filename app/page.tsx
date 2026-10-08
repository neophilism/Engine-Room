import React from "react";
import { PortfolioHome } from "../components/portfolio/portfolio-home";
import { loadPortfolioOverview } from "../lib/server/portfolio-overview";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <PortfolioHome overview={await loadPortfolioOverview()} />;
}
