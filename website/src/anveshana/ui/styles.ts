/**
 * Styles for <anveshana-app>. They live inside the component's shadow root, so
 * the host page's CSS cannot leak in and these rules cannot leak out. A host
 * can retheme the app by setting the `--anv-*` custom properties on the element.
 */
export const styles = /* css */ `
:host {
  --bg: var(--anv-bg, #f7f4ee);
  --surface: var(--anv-surface, #fffdf9);
  --ink: var(--anv-ink, #1f2a24);
  --muted: var(--anv-muted, #5a675f);
  --line: var(--anv-line, #e0dace);
  --accent: var(--anv-accent, #285c43);
  --accent-ink: var(--anv-accent-ink, #ffffff);
  --soft: var(--anv-soft, #e8f1ea);
  --warn: var(--anv-warn, #8a5a12);
  --warn-soft: var(--anv-warn-soft, #f6ecd6);
  --radius: var(--anv-radius, 14px);
  --serif: var(--anv-font-display, "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif);
  --sans: var(--anv-font-body, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif);
  display: block;
  color: var(--ink);
  background: var(--bg);
  font-family: var(--sans);
  font-size: 1rem;
  line-height: 1.55;
  -webkit-text-size-adjust: 100%;
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --bg: var(--anv-bg, #131916);
    --surface: var(--anv-surface, #1b2320);
    --ink: var(--anv-ink, #e9ede9);
    --muted: var(--anv-muted, #a3b0a7);
    --line: var(--anv-line, #2d3933);
    --accent: var(--anv-accent, #84cc9f);
    --accent-ink: var(--anv-accent-ink, #0f1f18);
    --soft: var(--anv-soft, #22302a);
    --warn: var(--anv-warn, #e2b765);
    --warn-soft: var(--anv-warn-soft, #33291a);
  }
}
:host([theme="dark"]) {
  --bg: var(--anv-bg, #131916);
  --surface: var(--anv-surface, #1b2320);
  --ink: var(--anv-ink, #e9ede9);
  --muted: var(--anv-muted, #a3b0a7);
  --line: var(--anv-line, #2d3933);
  --accent: var(--anv-accent, #84cc9f);
  --accent-ink: var(--anv-accent-ink, #0f1f18);
  --soft: var(--anv-soft, #22302a);
  --warn: var(--anv-warn, #e2b765);
  --warn-soft: var(--anv-warn-soft, #33291a);
}

*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }

.app {
  max-width: 44rem;
  margin: 0 auto;
  padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 1.75rem) 3rem;
}
.app.wide { max-width: 52rem; }

h1, h2, h3, p, ul, ol, dl, dd, blockquote, figure { margin: 0; }
ul, ol { padding: 0; list-style: none; }
h1, h2, h3 { font-family: var(--serif); font-weight: 600; line-height: 1.2; text-wrap: balance; }
h1 { font-size: clamp(1.9rem, 6vw, 2.6rem); letter-spacing: -0.01em; }
h2 { font-size: clamp(1.35rem, 4vw, 1.6rem); }
h3 { font-size: 1.15rem; }
p { text-wrap: pretty; }
:focus { outline: none; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 6px; }

.eyebrow {
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
}
.muted { color: var(--muted); }
.small { font-size: 0.9rem; }
/* The container owns the spacing, so a nested stack's own --gap cannot shrink the space above it. */
.stack { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--gap, 1rem); }
.stack > .btn { justify-self: start; }

/* ── Buttons ── */
button { font: inherit; color: inherit; cursor: pointer; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.6rem 1.15rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-weight: 600;
  text-decoration: none;
}
.btn:hover { border-color: var(--accent); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.btn.primary:hover { filter: brightness(1.08); }
.btn.quiet { border-color: transparent; background: transparent; color: var(--muted); font-weight: 500; }
.btn.quiet:hover { color: var(--ink); text-decoration: underline; }
.btn[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.row { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
.row.between { justify-content: space-between; }

/* ── Welcome ── */
.brand { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.brand .deva { font-size: 1.1rem; color: var(--muted); }
.lede { font-size: 1.15rem; color: var(--ink); max-width: 36rem; }
.points { display: grid; gap: 0.75rem; }
.points li {
  display: grid;
  grid-template-columns: 2rem 1fr;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}
.points .glyph { font-size: 1.25rem; line-height: 1.4; }
.points strong { display: block; }
.toggle {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
}
.toggle input { width: 1.2rem; height: 1.2rem; margin: 0.2rem 0 0; accent-color: var(--accent); flex: none; }
.note {
  padding: 0.85rem 1rem;
  border-left: 3px solid var(--line);
  color: var(--muted);
  font-size: 0.92rem;
}
.note.warn { border-left-color: var(--warn); background: var(--warn-soft); color: var(--ink); border-radius: 0 10px 10px 0; }

/* ── Question flow ── */
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.topbar .name { font-family: var(--serif); font-weight: 600; }
.progress { height: 6px; border-radius: 999px; background: var(--line); overflow: hidden; }
.progress > span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width 0.25s ease; }
.prompt {
  font-family: var(--serif);
  font-size: clamp(1.35rem, 4.6vw, 1.75rem);
  line-height: 1.3;
  font-weight: 600;
  text-wrap: balance;
}
.options { display: grid; gap: 0.55rem; }
.option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  text-align: left;
}
.option:hover { border-color: var(--accent); background: var(--soft); }
.option .mark {
  flex: none;
  width: 1.15rem;
  height: 1.15rem;
  border: 2px solid var(--muted);
  border-radius: 50%;
}
.option[aria-pressed="true"] { border-color: var(--accent); background: var(--soft); }
.option[aria-pressed="true"] .mark { border-color: var(--accent); background: radial-gradient(circle, var(--accent) 0 45%, transparent 50%); }
.option .hint { display: block; color: var(--muted); font-size: 0.9rem; font-weight: 400; }
.option strong { font-weight: 600; }
.option.aside { border-style: dashed; color: var(--muted); }
.lens-dot { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--dot, var(--muted)); margin-right: 0.4rem; }

/* ── Result ── */
.card {
  padding: clamp(1rem, 3.5vw, 1.5rem);
  border: 1px solid var(--line);
  border-radius: calc(var(--radius) + 4px);
  background: var(--surface);
}
.card.dismissed { background: transparent; border-style: dashed; }
.family-head { display: flex; gap: 0.85rem; align-items: flex-start; }
.family-head .emoji {
  flex: none;
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--soft);
  font-size: 1.5rem;
}
.family-head h3 { font-size: 1.4rem; }
.badge {
  display: inline-block;
  padding: 0.1rem 0.6rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--sans);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  vertical-align: middle;
  white-space: nowrap;
}
.voice {
  padding-left: 1rem;
  border-left: 3px solid var(--accent);
  font-family: var(--serif);
  font-size: 1.15rem;
  font-style: italic;
}
details { border: 1px solid var(--line); border-radius: var(--radius); background: var(--bg); }
details > summary { padding: 0.7rem 1rem; font-weight: 600; cursor: pointer; }
details > .body { padding: 0 1rem 1rem; }
.evidence li { padding: 0.55rem 0; border-top: 1px solid var(--line); display: grid; gap: 0.25rem; }
.evidence li:first-child { border-top: 0; }
.answer {
  justify-self: start;
  padding: 0.05rem 0.6rem;
  border-radius: 999px;
  background: var(--soft);
  font-size: 0.85rem;
  font-weight: 650;
}
.triad { display: grid; gap: 1rem; }
.triad h4, .label {
  margin: 0 0 0.2rem;
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 0.85rem;
  background: var(--bg);
}
.shifts li { padding-left: 1.4rem; position: relative; }
.shifts li::before { content: "→"; position: absolute; left: 0; color: var(--accent); }
.shifts li + li { margin-top: 0.35rem; }
.experiment {
  padding: 0.9rem 1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg);
}
.experiment.chosen { border-color: var(--accent); background: var(--soft); }
.experiment dl { display: grid; gap: 0.3rem; margin-top: 0.5rem; font-size: 0.92rem; }
.experiment dt { font-weight: 650; display: inline; }
.experiment dd { display: inline; color: var(--muted); }
.fit { padding-top: 1rem; border-top: 1px solid var(--line); }

.jumps { display: grid; gap: 0.5rem; margin-bottom: 0.35rem; }
.jump {
  display: grid;
  grid-template-columns: 2.25rem 1fr auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg);
  text-align: left;
}
.jump:hover { border-color: var(--accent); }
.jump .emoji { font-size: 1.35rem; text-align: center; }
.jump .hint { display: block; color: var(--muted); font-size: 0.9rem; }
.jump .go { color: var(--muted); }
article, section { scroll-margin-top: 1rem; }

/* Capacity ladder: read from above the head (top) down to below the root. */
.ladder { position: relative; display: grid; gap: 0; }
.ladder li {
  position: relative;
  display: grid;
  grid-template-columns: 2.25rem 1fr;
  gap: 0.75rem;
  padding: 0.7rem 0;
}
.ladder li::before {
  content: "";
  position: absolute;
  left: calc(1.125rem - 1px);
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--line);
}
.ladder li:first-child::before { top: 1.6rem; }
.ladder li:last-child::before { bottom: calc(100% - 1.6rem); }
.node {
  position: relative;
  z-index: 1;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0.15rem 0 0 0.375rem;
  border-radius: 50%;
  border: 3px solid var(--dot);
  background: var(--surface);
}
.node.active { background: var(--dot); }
.node.mixed { background: linear-gradient(90deg, var(--dot) 50%, var(--surface) 50%); }
.node.constrained { background: radial-gradient(circle, var(--dot) 0 28%, var(--surface) 32%); }
.node.unspecified { border-style: dashed; border-color: var(--muted); border-width: 2px; }
.ladder .state { font-weight: 700; }
.legend { display: flex; flex-wrap: wrap; gap: 0.4rem 1.1rem; font-size: 0.85rem; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
.legend .node { width: 0.95rem; height: 0.95rem; margin: 0; border-width: 2px; --dot: var(--accent); }

.section-title { padding-top: 0.5rem; }
.footer-actions { padding-top: 1.25rem; border-top: 1px solid var(--line); }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .progress > span { transition: none; }
}
@media print {
  .btn, .fit, .footer-actions { display: none !important; }
  :host { background: #fff; }
}
`;
