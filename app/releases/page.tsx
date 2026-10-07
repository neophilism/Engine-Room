import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function ReleasesPage() {
  return <DashboardPage
    eyebrow="Delivery"
    title="Releases"
    description="Follow releases from build through approval, rollout, production, and rollback."
    signals={["Release pipeline", "Readiness", "Approvals", "Production rollout"]}
  />;
}
