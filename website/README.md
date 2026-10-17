---
website: draft
---
# 🌐 VICHARA Website

The website is a static, reader-friendly view of VICHARA's thematic Markdown:
an editorial home page, browsable topic pages, navigation, Mermaid diagrams,
and a lightweight documentation search. Markdown in Git remains the source of
truth; website rendering is an automated build step.

## 🧭 How content gets published

1. Add Markdown under one of the root knowledge themes.
2. Add frontmatter with `website: public` to explicitly include it.
3. Give it a title, a concise description, and a clear editorial status.
4. Push or open a pull request. CI builds and checks the site.
5. Merge to `main` to trigger the GitHub Pages production deployment.

Markdown without explicit opt-in defaults to `website: draft` and is not
generated as a site page. This prevents accidental inclusion in website
output; it does **not** make a file private in this public repository.

```yaml
---
website: public
title: A reader-friendly title
description: A short summary for the documentation catalog.
status: Reviewed reference
---
```

## 🛠️ Develop and preview

Requirements: Node.js 22.22 or newer and npm.

```bash
npm ci
npm run dev
```

The development server works on any branch. The `docs/` index groups pages
from their source themes and provides client-side title, topic, and description
filtering. Article pages include theme navigation, an automatically generated
table of contents, and Mermaid rendering when diagrams are present.

## ✅ Validate

```bash
npm run check
npm run lint
npm test
npm run build
npm run preview
```

`npm run build` creates a static site in `website/dist/`. Local builds use a
root base URL. The Pages workflow sets `SITE_BASE=/VICHARA/` so project-site
links resolve beneath the repository path.

## 🚀 Production hosting

The root `.github/workflows/deploy.yml` builds and deploys only from `main`.
Other branches and pull requests run validation without changing production.
The expected URL is
[`https://neo-pragnya.github.io/VICHARA/`](https://neo-pragnya.github.io/VICHARA/).
The first deployment requires GitHub Pages to be enabled with GitHub Actions
as the source in the repository settings. A successful workflow is required
before calling that URL live.

## 🔐 Rendering boundary

- The content collection scans Markdown within the root theme folders.
- A document is included only when its frontmatter sets `website: public`.
- Markdown HTML is sanitized during rendering.
- Relative links to other Markdown pages are mapped to documentation routes.
- Draft files remain in Git, so never commit secrets or confidential material.

This is an initial documentation portal—not the full planned knowledge graph,
full-text search engine, authoring system, or runtime service.
