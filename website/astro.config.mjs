import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeSanitize from "rehype-sanitize";
import { remarkDocLinks } from "./src/lib/remark-doc-links";
import process from "node:process";

const site = "https://neo-pragnya.github.io";
const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  markdown: {
    processor: unified({
      remarkPlugins: [remarkDocLinks],
      rehypePlugins: [rehypeSanitize],
    }),
  },
});
