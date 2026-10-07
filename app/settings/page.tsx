import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function SettingsPage() {
  return <DashboardPage
    eyebrow="Master Controls"
    title="Settings & Automation"
    description="Configure integrations, project registration, progress rules, notifications, permissions, and retention."
    signals={["Integrations", "Automation rules", "Permissions", "Audit history"]}
  />;
}
