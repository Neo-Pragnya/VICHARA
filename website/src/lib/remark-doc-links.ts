import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Root } from "mdast";
import type { Plugin } from "unified";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const siteBase = process.env.SITE_BASE ?? "/";
const basePrefix = siteBase === "/" ? "" : `/${siteBase.replace(/^\/+|\/+$/g, "")}`;

interface LinkNode {
  type: "link" | "definition";
  url: string;
}

function isWithinRepository(filePath: string): boolean {
  const relative = path.relative(repositoryRoot, filePath);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function documentRoute(filePath: string): string | undefined {
  if (!isWithinRepository(filePath) || !filePath.toLowerCase().endsWith(".md")) {
    return undefined;
  }

  const relative = path.relative(repositoryRoot, filePath).replace(/\\/g, "/");
  const route = relative.replace(/(^|\/)README\.md$/i, "$1").replace(/\.md$/i, "");
  return `/docs/${route.replace(/\/$/, "")}/`;
}

export const remarkDocLinks: Plugin<[], Root> = () => (tree, file) => {
  const source = file.history[0];

  const walk = (node: Root | { children?: unknown[] }) => {
    if (!("children" in node) || !Array.isArray(node.children)) return;

    for (const child of node.children) {
      if (!child || typeof child !== "object") continue;

      const candidate = child as LinkNode & { children?: unknown[] };
      if (
        source &&
        path.isAbsolute(source) &&
        (candidate.type === "link" || candidate.type === "definition") &&
        typeof candidate.url === "string" &&
        !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(candidate.url)
      ) {
        const [pathname, ...fragment] = candidate.url.split("#");
        const target = path.resolve(path.dirname(source), pathname ?? "");
        let markdownTarget = target;

        if (pathname?.endsWith("/")) {
          markdownTarget = path.join(target, "README.md");
        }

        const route = documentRoute(markdownTarget);
        if (route) {
          candidate.url = `${basePrefix}${route}${fragment.length ? `#${fragment.join("#")}` : ""}`;
        }
      }

      walk(candidate);
    }
  };

  walk(tree);
};
