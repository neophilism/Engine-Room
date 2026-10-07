import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function AboutPage() {
  return <DashboardPage
    eyebrow="Platform Guide"
    title="About / Overview"
    description="Explain Engine Room, every dashboard, progress logic, data sources, lifecycle stages, and machine indicators."
    signals={["Page guide", "Metric definitions", "Lifecycle glossary", "Data freshness"]}
  />;
}
