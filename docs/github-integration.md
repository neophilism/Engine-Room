# GitHub App integration

PR 9 introduces Engine Room's provider boundary for GitHub without coupling dashboard code to GitHub payloads.

## Authentication

Engine Room authenticates as a GitHub App with a short-lived RS256 JWT. The app JWT is exchanged for an installation access token before installation-scoped API calls. The private key is loaded only from runtime configuration and is never committed.

Required runtime variables:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`

Optional:

- `GITHUB_API_BASE_URL` for GitHub Enterprise-compatible deployments
- `GITHUB_WEBHOOK_SECRET`, reserved for PR 10 webhook validation

## Repository discovery

`discoverInstallationRepositories` enumerates every repository available to an installation in pages of 100 and normalizes GitHub payloads into Engine Room repository fields:

- GitHub repository ID
- owner/name/full name
- canonical HTML URL
- default branch
- visibility
- archived state

The discovery service does not persist records yet. Repository persistence and periodic reconciliation belong to PR 11.

## Security boundaries

- App JWT lifetime is deliberately shorter than GitHub's ten-minute maximum.
- Installation IDs must be positive integers.
- GitHub API errors fail closed with status/body context for server logs.
- No GitHub secret is exposed through a route or client component.
- Dashboard code will consume normalized Engine Room records rather than vendor payloads.
