---
website: public
title: Anveshana On-Device Reflection App
description: How the Anveshana questionnaire is built, hosted and kept private within the static site.
status: Architecture decision record
---
# ADR-003: Anveshana on-device reflection app

- **Status:** Accepted
- **Date:** 2026-11-25
- **Decision owners:** VICHARA maintainers
- **References:** ADR-000; ADR-002; `products/anveshana/README.md`

## Context

Anveshana is the first interactive product hosted in VICHARA. It asks personal
questions about how someone responds in difficult moments. ADR-000 rules out a
backend, database, authentication and analytics for the MVP, and the answers
are sensitive enough that they should not leave the person's device at all.
The product also needs to be hosted on other websites and to move to a mobile
app later without a rewrite.

## Decisions

1. Anveshana is a static, client-only application inside the existing Astro
   site at `/anveshana/`. No runtime service is added.
2. No dependency is added. The interface is a standards-based web component
   written in TypeScript and bundled by the existing Astro build.
3. The code is split into three layers under `website/src/anveshana/`:
   versioned JSON content, a pure TypeScript engine with no DOM, storage,
   network or clock access, and the web component. The engine and content are
   the portable contract for any future front end.
4. Answers are held in memory only. The app uses no browser storage, cookies,
   analytics or network calls, puts no answers in URLs, and attaches no answer
   data to the events it fires. A plain-text copy is produced only when the
   person asks for it.
5. A post-build step (`website/scripts/anveshana-standalone.mjs`) writes a
   single self-contained `anveshana.html` and a standalone `anveshana.js`. The
   step fails the build if the bundle contains a storage or network API, or if
   the single file still references another file.
6. Content carries a `contentVersion` and a `rulesVersion`. Every reading and
   every downloaded copy shows both. Bundle validation runs in the unit tests,
   so a broken reference fails CI.
7. Results are framed as self-reflection. The app makes no diagnostic,
   severity or energetic-measurement claim, and the chakra reading is labeled
   as a contemplative lens that can be switched off.

## Consequences

- The questionnaire content is public, like the rest of the site. Answers are
  not collected, so there is no pilot data unless feedback is gathered
  separately and with consent.
- A sitting is lost on reload. Saved history, accounts or sync would require a
  new ADR covering storage, retention, export and deletion.
- A mobile release can wrap the single file in a WebView shell, or reuse the
  engine and content behind native screens. Either is a follow-up decision.
- The scoring rule is an editorial heuristic. Changing thresholds requires a
  `rulesVersion` bump and updated fixtures.

## Verification

Accepted when Astro and TypeScript checks, lint, unit tests (bundle
validation, rule fixtures, session flow and export) and the production build
with its single-file step pass, and a browser run of a full sitting shows no
console errors and no network requests after the page loads.
