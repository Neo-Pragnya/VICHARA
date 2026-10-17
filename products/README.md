---
website: public
title: Products
description: Follow product explorations from user needs through research and prototypes.
status: Theme overview
---

# 🚀 Products

Products are places where ideas meet people, needs, constraints, and
implementation. Keep each product's story together—from problem framing and
research through architecture, experiments, and publishable entries.

## 🗂️ Product workspace

| Material | Use it for |
|---|---|
| `README.md` | Product overview, status, and links |
| `research/` | Evidence, source notes, and discovery |
| `drafts/` | Clearly marked, unpublished writing |
| `entries/` | Schema-valid VICHARA entries, once content validation exists |
| `assets/` | Approved, product-specific diagrams or supporting files as needed |

Start with [Pensieve](./pensieve/), the first product exploration.

```mermaid
flowchart LR
  I["💡 Idea"] --> N["👥 Understand a need"]
  N --> R["📚 Research"]
  R --> C["🧠 Shape a concept"]
  C --> A["🏗️ Design the architecture"]
  A --> P["🧪 Prototype or test"]
  P --> L["📈 Learn and iterate"]
  L -. "new evidence" .-> R
```

## 🧭 Keep product folders navigable

Use lowercase, kebab-case names. Add subfolders only when they solve a real
organization need, and label planning drafts clearly so they are not mistaken
for verified product behavior or approved publication.
