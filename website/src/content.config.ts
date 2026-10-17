import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({
    base: "..",
    pattern: [
      "products/**/*.md",
      "ideas/**/*.md",
      "vision/**/*.md",
      "architectures/**/*.md",
      "conceptualization/**/*.md",
      "hypothesis/**/*.md",
      "analysis/**/*.md",
      "research/**/*.md",
    ],
    // README files become the index page for their source folder.
    generateId: ({ entry }) =>
      entry
        .replace(/\\/g, "/")
        .replace(/\.md$/i, "")
        .replace(/(^|\/)README$/i, "$1index"),
  }),
  schema: z.object({
    website: z.enum(["public", "draft"]).default("draft"),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const collections = { docs };
