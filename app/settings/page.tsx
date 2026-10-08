import React from "react";
import { ControlConsole } from "../../components/settings/control-console";

export default function SettingsPage() {
  return <main className="content">
    <header className="hero"><p className="eyebrow">Master Controls</p><h1>Settings &amp; Automation</h1>
      <p>Inspect configured integrations, manage versioned automation policy, manually reconcile GitHub projects, and review audit history.</p>
    </header>
    <ControlConsole />
  </main>;
}
