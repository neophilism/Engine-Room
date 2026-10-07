import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function ProjectsPage() {
  return <DashboardPage
    eyebrow="Portfolio Intelligence"
    title="Projects"
    description="Compare project roadmaps, lifecycle stages, risks, and delivery status side by side."
    signals={["Roadmap completion", "Lifecycle stage", "Risk and blockers", "GitHub activity"]}
  />;
}
