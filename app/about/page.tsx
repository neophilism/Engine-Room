import React from "react";
import { PlatformGuide } from "../../components/onboarding/platform-guide";

export default function AboutPage() {
  return <main className="content">
    <header className="hero"><p className="eyebrow">Platform Guide</p><h1>Engine Room / Overview</h1>
      <p>A guide to the portfolio machines, their evidence, and the steps from approved development to running production.</p>
    </header>
    <PlatformGuide />
  </main>;
}
