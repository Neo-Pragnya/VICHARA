---
website: public
title: Theme-Based Sources and Website Boundary
description: Why VICHARA separates thematic source material from its website application.
status: Architecture decision record
---

# ADR-001: Theme-based sources and website application boundary

- **Status:** Accepted
- **Date:** 2026-10-16
- **Decision owners:** VICHARA maintainers
- **References:** VICHARA master specification, sections 2.3 and 5

## Context

VICHARA needs a top-level layout that makes its knowledge themes visible while
keeping the website implementation separate from the material it presents.
The bootstrap application and several product/specification documents were
previously mixed at the repository root and under generic documentation
folders.

## Decisions

1. Organize source material under the root themes `products/`, `ideas/`,
   `vision/`, `architectures/`, `conceptualization/`, `hypothesis/`, `analysis/`,
   and `research/`.
2. Place the Astro application, package manifests, TypeScript/ESLint/Astro
   configuration, site assets, tests, and website-specific scripts under
   `website/`.
3. Keep root-level files to repository essentials, including README,
   assistant guidance, license, ignore rules, and `.github/`. GitHub Actions
   workflows remain in root `.github/workflows/` because GitHub requires that
   location.
4. Keep product planning and research with the product. When content
   collections are implemented, the website may render only schema-valid,
   approved entries from the themed source folders; it must not treat these
   folders as deployable static assets or bypass the publication compiler.
5. Keep platform implementation specifications and accepted decisions under
   `architectures/`.

## Consequences

- Run website package scripts from `website/`.
- Update CI to install and validate the website package from that directory.
- The source/theme structure is distinct from generated website output; the
  existing deny-by-default publication and privacy rules remain unchanged.
- Adding a new top-level directory requires it to be a core VICHARA theme or
  an essential repository integration; topic folders belong within themes.
