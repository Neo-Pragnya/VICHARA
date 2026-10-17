---
website: public
title: VICHARA Platform and Privacy Boundaries
description: The initial platform and privacy decisions for the VICHARA bootstrap.
status: Architecture decision record
---

# ADR-000: VICHARA Platform and Privacy Boundaries

- **Status:** Accepted
- **Date:** 2026-10-16
- **Decision owners:** VICHARA maintainers
- **References:** Master Specification sections 1, 4, 5, 10, and 12; roadmap phase P0

## Context

VICHARA needs a small, verifiable foundation before content contracts and
discovery features are implemented. The master specification calls for a
static, Git-backed knowledge site and explicitly excludes a production backend
and database from the MVP.

## Decisions

1. Use Astro with strict TypeScript for static site generation.
2. Use npm and commit `package-lock.json` for reproducible dependency installs.
3. Require Node.js 22.22 or newer. The initial Astro version requires Node
   22.22 or newer; CI uses the Node 22 release line.
4. Keep source content and product documentation in Git. Do not add runtime
   APIs, a database, authentication, or external analytics to the MVP.
5. Treat publication visibility as a build-time security boundary. Draft or
   private material must never enter public pages or generated assets.
6. Add validation-only CI. Deployment is intentionally deferred until the
   master specification's release gates are met.

## Consequences

- Astro, TypeScript, ESLint, and Vitest form the initial validation surface in
  `website/`.
- Search, content schemas, public-only compilation, graph generation, and
  deployment remain future backlog work; this bootstrap does not claim them.
- Any change to framework, runtime services, publication semantics, or
  deployment strategy requires a follow-up ADR.

## Verification

The bootstrap is accepted only when dependency installation, Astro/TypeScript
checks, lint, unit tests, and a production build pass locally and in CI.
