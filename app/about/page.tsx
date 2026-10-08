import type { Metadata } from "next";
import React from "react";
import { PlatformGuide } from "../../components/about/platform-guide";
import "./about.css";

export const metadata: Metadata = {
  title: "About and Platform Guide",
  description: "Explore Engine Room dashboards, evidence and progress calculations, and onboarding."
};

export default function AboutPage() {
  return <PlatformGuide />;
}
