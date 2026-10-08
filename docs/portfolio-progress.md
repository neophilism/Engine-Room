# Portfolio progress

The Total Portfolio Progress machine sums merged approved roadmap PRs and divides by the sum of each project's approved planned PR total. It does not average percentages or add repository totals to project totals. Underway and remaining counts use the same project snapshot.

An empty portfolio remains neutral with no misleading completion instrument. A fully merged roadmap signals roadmap completion; it does not establish production readiness. The home page renders dynamically so deployments do not freeze portfolio data at build time.

The shared calculation lives in the domain layer and is reusable by client views. Instruments inherit the existing reduced-motion and pause behavior.
