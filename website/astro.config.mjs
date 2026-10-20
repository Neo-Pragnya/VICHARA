import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { remarkDocLinks } from "./src/lib/remark-doc-links";
import { remarkMermaid } from "./src/lib/remark-mermaid";
import { rehypeClassNames } from "./src/lib/rehype-class-names";
import process from "node:process";

const site = "https://neo-pragnya.github.io";
const base = process.env.SITE_BASE ?? "/";

// Inline styles only in the shape Shiki writes (colour custom properties and a few keywords): no url(), no expressions.
const SHIKI_STYLE = /^(?:\s*(?:--shiki-[a-z-]+|color|background-color|overflow-x|font-style|font-weight|text-decoration)\s*:\s*[#a-z0-9 .,%-]+;?)*\s*$/i;

// Markdown is sanitised. Shiki highlighting and Mermaid sources (marked by remark-mermaid) survive.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      ["className", /^(astro-code|astro-code-themes|mermaid-src|github-(light|dark))$/],
      ["style", SHIKI_STYLE],
      "dataLanguage",
      "tabIndex",
    ],
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-[\w-]+$/]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", /^line$/], ["style", SHIKI_STYLE]],
  },
};

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  markdown: {
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" }, defaultColor: false },
    processor: unified({
      remarkPlugins: [remarkDocLinks, remarkMermaid],
      rehypePlugins: [rehypeClassNames, [rehypeSanitize, sanitizeSchema]],
    }),
  },
});
