// Post-build step: turns the built /anveshana/embed/ page into
//
//   dist/anveshana/anveshana.html  one self-contained file (no other requests)
//   dist/anveshana/anveshana.js    the component alone, for a <script type="module"> tag
//
// It also refuses to ship a bundle that could store or transmit answers.
// Runs after `astro build`; uses only Node built-ins.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const assets = join(dist, "_astro");
const embedPage = join(dist, "anveshana", "embed", "index.html");

function fail(message) {
  process.stderr.write(`anveshana-standalone: ${message}\n`);
  process.exit(1);
}

/** Reads a built chunk and inlines the side-effect imports it starts with. */
function link(fileName, seen = new Set()) {
  if (seen.has(fileName)) return "";
  seen.add(fileName);
  if (!readdirSync(assets).includes(fileName)) fail(`missing chunk ${fileName}`);
  const source = readFileSync(join(assets, fileName), "utf8");
  const code = source.replace(/import\s*["']\.\/([^"']+)["'];?/g, (_, dependency) => link(dependency, seen));
  if (/(?:^|[;}\n])\s*(?:import|export)[\s{*"'(]/.test(code)) {
    fail(`${fileName} has imports or exports this script cannot inline. Keep the component free of shared chunks.`);
  }
  return code;
}

let html;
try {
  html = readFileSync(embedPage, "utf8");
} catch {
  fail(`${embedPage} not found. Run "astro build" first.`);
}

const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)];
if (scripts.length !== 1) fail(`expected one module script on the embed page, found ${scripts.length}`);
const [tag, src] = scripts[0];
const code = link(basename(src));

// Privacy gate: answers must stay in memory. None of these may appear.
const forbidden = [
  "fetch(",
  "XMLHttpRequest",
  "sendBeacon",
  "WebSocket",
  "EventSource",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "document.cookie",
  "navigator.share",
];
const found = forbidden.filter((needle) => code.includes(needle));
if (found.length > 0) fail(`the bundle uses ${found.join(", ")}. Answers must not be stored or sent.`);

const single = html.replace(tag, () => `<script type="module">${code.replace(/<\/script/gi, "<\\/script")}</script>`);
if (/\b(?:src|href)=["'](?!#|data:)/i.test(single)) {
  fail("the single-file page still references an external file");
}

writeFileSync(join(dist, "anveshana", "anveshana.html"), single);
writeFileSync(join(dist, "anveshana", "anveshana.js"), code);
process.stdout.write(
  `anveshana-standalone: wrote anveshana.html (${Math.round(single.length / 1024)} kB) and anveshana.js (${Math.round(code.length / 1024)} kB)\n`,
);
