import { describe, expect, it } from "vitest";
import { parseIntent, postAuthPath, resolvePostAuth, safeRelativePath, sameSiteRedirect } from "./intents";

describe("intents", () => {
  it("accepts only whitelisted intents", () => {
    expect(parseIntent("ats")).toEqual({ kind: "ats" });
    expect(parseIntent("Template:chicago")).toEqual({ kind: "template", templateId: "chicago" });
    expect(parseIntent("https://evil.com")).toBeNull();
    expect(parseIntent("template:../../x")).toBeNull();
  });
  it("builds the post-auth path", () => {
    expect(postAuthPath(null)).toBe("/dashboard");
    expect(postAuthPath({ kind: "template", templateId: "milano" })).toBe("/dashboard?intent=template%3Amilano");
  });
  it("rejects off-site redirects", () => {
    expect(safeRelativePath("/templates")).toBe("/templates");
    expect(safeRelativePath("//evil.com")).toBeNull();
    expect(safeRelativePath("https://evil.com")).toBeNull();
  });
});


describe("post-auth redirects", () => {
  const origins = ["http://localhost:3000"];
  it("keeps same-origin absolute URLs as paths", () => {
    expect(sameSiteRedirect("http://localhost:3000/templates?x=1", origins)).toBe("/templates?x=1");
    expect(sameSiteRedirect("https://evil.com/templates", origins)).toBeNull();
  });
  it("prefers an intent over redirect_url", () => {
    expect(resolvePostAuth({ intent: "ats", redirectUrl: "/templates" }, origins)).toBe("/dashboard?intent=ats");
    expect(resolvePostAuth({ redirectUrl: "/templates" }, origins)).toBe("/templates");
    expect(resolvePostAuth({ redirectUrl: "//evil.com" }, origins)).toBe("/dashboard");
  });
});

describe("safeRelativePath (open-redirect guard)", () => {
  it("keeps normal same-site paths", async () => {
    const { safeRelativePath } = await import("./intents");
    expect(safeRelativePath("/dashboard?intent=ats")).toBe("/dashboard?intent=ats");
    expect(safeRelativePath("/project/abc#x")).toBe("/project/abc#x");
  });
  it("rejects anything a browser could turn into another origin", async () => {
    const { safeRelativePath } = await import("./intents");
    for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/%09/evil.com".replace("%09", "\t"), "https://evil.com", "evil.com", "", null]) {
      expect(safeRelativePath(bad as string | null)).toBeNull();
    }
  });
});
