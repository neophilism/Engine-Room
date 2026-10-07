import React from "react";
import { DashboardPage } from "../../components/dashboard-page";

export default function UsersPage() {
  return <DashboardPage
    eyebrow="People & Access"
    title="Users & Access"
    description="Track adoption, organizations, roles, access controls, and security posture."
    signals={["Active users", "Organizations", "Role distribution", "Access posture"]}
  />;
}
