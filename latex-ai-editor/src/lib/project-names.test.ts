import { describe, expect, it } from "vitest";
import { copyName, MAX_PROJECT_NAME } from "./project-names";

describe("copyName", () => {
  it("adds (copy), then numbers when taken", () => {
    expect(copyName("Google SWE")).toBe("Google SWE (copy)");
    expect(copyName("Google SWE", ["Google SWE", "google swe (copy)"])).toBe("Google SWE (copy 2)");
    expect(copyName("Google SWE", ["Google SWE (copy)", "Google SWE (copy 2)"])).toBe("Google SWE (copy 3)");
  });
  it("doesn't stack suffixes when copying a copy", () => {
    expect(copyName("Google SWE (copy)", ["Google SWE (copy)"])).toBe("Google SWE (copy 2)");
    expect(copyName("Google SWE (copy 4)")).toBe("Google SWE (copy)");
  });
  it("stays within the name limit and handles empty names", () => {
    const long = copyName("x".repeat(100));
    expect(long.length).toBeLessThanOrEqual(MAX_PROJECT_NAME);
    expect(long.endsWith(" (copy)")).toBe(true);
    expect(copyName("   ")).toBe("Untitled resume (copy)");
  });
});
