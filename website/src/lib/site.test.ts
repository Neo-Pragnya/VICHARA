import { describe, expect, it } from "vitest";
import { site } from "./site";

describe("site metadata", () => {
  it("defines the VICHARA identity and purpose", () => {
    expect(site.name).toBe("VICHARA");
    expect(site.tagline).toBe("Where Curiosity Becomes Creation");
    expect(site.description).toContain("Git-backed");
  });
});
