import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import "./globals.css";

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
