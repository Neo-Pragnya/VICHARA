# VICHARA — Coding Assistant Contract

## Mission and sources of truth

Implement only behavior supported by the files present in this repository and
user-approved requirements. The full VICHARA platform specification pack is
expected under `architectures/vichara/specs/`, but is not currently present;
do not invent its schema or acceptance criteria. Restore or obtain the
authoritative pack before implementing features that depend on it.

Keep source material under its appropriate root theme. The Astro app,
dependencies, and rendering/hosting configuration belong under `website/`.
Keep GitHub Actions workflows under the root `.github/` directory because
GitHub requires that location.

## Non-negotiable constraints

- Keep canonical content in portable, Git-versioned files; the MVP is static
  and has no backend, database, authentication, or runtime AI service.
- Keep the repository root organized around its theme directories and
  `website/`; do not add generic top-level documentation or application-code
  directories.
- Never publish private or draft content through pages, generated data, search,
  feeds, graphs, or artifacts. Hiding content from navigation is not privacy.
- Do not invent content schema or publication contracts that are not present
  in the repository or explicitly approved.
- Keep publication safety explicit; never assume that hiding material from
  navigation makes it private.
- Support both GitHub Pages project paths and root/custom-domain deployments
  through centralized base-path-aware URL handling.
- Do not add a service, dependency, content source, or material architecture
  change without the required evidence and, where applicable, an ADR.
- Do not invent production URLs, credentials, test results, or deployment
  status. Never commit secrets or personal/private source material.
- Work in small, test-first vertical slices. Report unrun checks explicitly.

## Working loop

1. Inspect the repository state, applicable specification sections, and
   dependency-unblocked backlog tasks.
2. State scope, dependencies, acceptance criteria, and intended tests before
   making implementation changes.
3. Add or update tests for the intended behavior, including relevant negative
   and privacy cases.
4. Keep shared contracts and deployment configuration under one integrator.
5. Run the smallest relevant checks and record actual results.
6. Update directly related documentation and backlog evidence.

Stop and ask for direction if implementation would publish sensitive material,
require a new runtime service, or change a major contract without an approved
decision.
