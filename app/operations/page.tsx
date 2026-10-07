import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function OperationsPage() {
  return <DashboardPage
    eyebrow="System Health"
    title="Operations & Performance"
    description="Monitor services, deployments, CI/CD, latency, queues, backups, and external-source health."
    signals={["Service health", "CI/CD reliability", "Latency", "Backups and source feeds"]}
  />;
}
