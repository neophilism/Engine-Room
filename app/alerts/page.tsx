import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function AlertsPage() {
  return <DashboardPage
    eyebrow="Mission Control"
    title="Alerts & Incidents"
    description="Triage live alerts, incidents, escalations, acknowledgement, and resolution across every project."
    signals={["Live alerts", "Severity", "Escalation", "Resolution"]}
  />;
}
