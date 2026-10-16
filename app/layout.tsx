import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import "./design-tokens.css";
import "./globals.css";
import "../components/machine/machine.css";
import "../components/portfolio/planned-progress.css";
import "../components/portfolio/development-velocity.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: {
    default: "Engine Room",
    template: "%s | Engine Room"
  },
  description: "Executive software-portfolio control room"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

