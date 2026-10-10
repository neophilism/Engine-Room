import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import { MachineMotionProvider } from "../components/machine/machine-motion";
import "./design-tokens.css";
import "./globals.css";
import "../components/machine/machine.css";
import "../components/portfolio/planned-progress.css";

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
        <MachineMotionProvider>
          <AppShell>{children}</AppShell>
        </MachineMotionProvider>
      </body>
    </html>
  );
}

