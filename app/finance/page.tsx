import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function FinancePage() {
  return <DashboardPage
    eyebrow="Portfolio Economics"
    title="Finance"
    description="Track spend, revenue, forecasts, unit economics, and financial health across the portfolio."
    signals={["Spend by project", "Cost drivers", "Revenue and recoveries", "Forecast and runway"]}
  />;
}
