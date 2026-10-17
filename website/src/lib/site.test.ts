import { describe, expect, it } from "vitest";
import {
  displayTitle,
  documentHref,
  isWebsitePublished,
  routeSlug,
  sourcePath,
  themeForDocument,
} from "./docs";
import { site } from "./site";

describe("site metadata", () => {
  it("defines the VICHARA identity and purpose", () => {
    expect(site.name).toBe("VICHARA");
    expect(site.tagline).toBe("Where Curiosity Becomes Creation");
    expect(site.description).toContain("Git-backed");
  });
});

describe("documentation routes", () => {
  it("requires explicit opt-in before a document is published", () => {
    expect(isWebsitePublished({ data: { website: "draft" } })).toBe(false);
    expect(isWebsitePublished({ data: { website: "public" } })).toBe(true);
  });

  it("maps README entries to their theme index routes", () => {
    expect(routeSlug("products/pensieve/index")).toBe("products/pensieve");
    expect(documentHref("products/pensieve/index")).toBe(
      "/docs/products/pensieve/",
    );
    expect(sourcePath("products/pensieve/index")).toBe(
      "products/pensieve/README.md",
    );
  });

  it("preserves nested paths and a GitHub Pages base path", () => {
    expect(documentHref("products/pensieve/ideation-plan", "/VICHARA/")).toBe(
      "/VICHARA/docs/products/pensieve/ideation-plan/",
    );
    expect(sourcePath("products/pensieve/ideation-plan")).toBe(
      "products/pensieve/ideation-plan.md",
    );
  });

  it("derives human-readable titles and themes from document IDs", () => {
    expect(displayTitle("products/pensieve/ideation-plan")).toBe("Ideation Plan");
    expect(themeForDocument("products/pensieve/README")).toBe("products");
  });
});
