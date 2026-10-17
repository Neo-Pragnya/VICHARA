---
website: public
title: Markdown Documentation and GitHub Pages Publishing
description: How approved theme Markdown is rendered and deployed as a static website.
status: Architecture decision record
---
# ADR-002: Markdown documentation and GitHub Pages publishing

- **Status:** Accepted
- **Date:** 2026-10-16
- **Decision owners:** VICHARA maintainers
- **References:** ADR-001; root `README.md`; `website/README.md`

## Context

VICHARA's knowledge is organized in Markdown under root theme folders, while
the Astro application lives in `website/`. A bootstrap homepage alone does
not make the knowledge browseable. The project needs a repeatable rendering
and hosting contract that preserves the source/application boundary and makes
local and branch builds useful before production release.

## Decisions

1. Astro discovers Markdown in the approved root theme folders and renders
   documents as static pages with theme navigation and a catalog.
2. A document is website-visible only when its frontmatter explicitly sets
   `website: public`. Unmarked documents default to draft and are omitted from
   generated routes and the catalog.
3. Theme Markdown remains the source of truth. The renderer sanitizes Markdown
   HTML and maps relative Markdown references to website routes.
4. Local development and CI builds work on any branch. The website deploy
   workflow publishes only from `main`, using GitHub Pages project base
   `/VICHARA/`.
5. Website opt-in controls generated site inclusion; it is not a privacy
   boundary. The public Git repository exposes all committed files.

## Consequences

- New public docs need title/description/status frontmatter and explicit
  website opt-in.
- Builds and tests may run on feature branches without changing production.
- A merge to `main` is required for the automated production deployment.
- Repository Pages must be configured to use GitHub Actions, and the first
  successful deploy must be verified before advertising the site as live.
- Full-text indexing, relationship graph, authoring, and server capabilities
  remain out of scope for this static docs portal.
