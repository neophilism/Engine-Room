import React from "react";
import Link from "next/link";

type DashboardPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  signals: readonly string[];
};

export function DashboardPage({ eyebrow, title, description, signals }: DashboardPageProps) {
  return (
    <main className="content">
      <header className="hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Architecture online</p>
            <h2>Data surfaces reserved</h2>
          </div>
          <span className="status-lamp" aria-label="Route online" />
        </div>
        <p>
          This route is now part of the Engine Room application architecture. Its full working-machine
          interface arrives in the roadmap phase assigned to this dashboard.
        </p>
        <ul>
          {signals.map((signal) => <li key={signal}>{signal}</li>)}
        </ul>
        <p><Link href="/">← Portfolio overview</Link></p>
      </section>
    </main>
  );
}
