import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { LATEX_SERVICE_URL: "https://compiler.test", LATEX_API_SECRET: "s3cret" } }));
const { compileLatex } = await import("./compile-service");

const ok = () => new Response(JSON.stringify({ ok: true, engine: "pdflatex", log: "", pdf: Buffer.from("%PDF").toString("base64"), errors: [] }), { status: 200 });
const busy = (retryAfter = "1") => new Response(JSON.stringify({ ok: false }), { status: 503, headers: { "Retry-After": retryAfter } });
const latexError = () => new Response(JSON.stringify({ ok: false, reason: "error", log: "! Undefined control sequence.", errors: [{ file: "main.tex", line: 3, message: "Undefined control sequence." }] }), { status: 422 });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("compileLatex (remote)", () => {
  it("sends the secret and a time limit the route can afford", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    const r = await compileLatex("x", "pdflatex", { deadline: Date.now() + 30_000 });
    expect(r.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-api-secret"]).toBe("s3cret");
    const body = JSON.parse(init.body);
    expect(body.timeoutMs).toBeLessThanOrEqual(27_000);
    expect(body.timeoutMs).toBeGreaterThan(20_000);
  });

  it("retries once when the compiler is busy", async () => {
    fetchMock.mockResolvedValueOnce(busy("1")).mockResolvedValueOnce(ok());
    const t0 = Date.now();
    const r = await compileLatex("x", "pdflatex");
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900); // waited for Retry-After
  });

  it("retries once when the service is unreachable (waking up)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(ok());
    const r = await compileLatex("x", "pdflatex");
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives a friendly message when it's still busy after the retry", async () => {
    fetchMock.mockResolvedValue(busy("1"));
    const r = await compileLatex("x", "pdflatex");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("COMPILE_BUSY");
    expect(!r.ok && r.message).toMatch(/busy/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry LaTeX errors", async () => {
    fetchMock.mockResolvedValueOnce(latexError());
    const r = await compileLatex("x", "pdflatex");
    expect(!r.ok && r.code).toBe("COMPILE_ERROR");
    expect(!r.ok && r.errors?.[0].line).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't retry when the deadline leaves no time", async () => {
    fetchMock.mockResolvedValueOnce(busy("5"));
    const r = await compileLatex("x", "pdflatex", { deadline: Date.now() + 10_000 });
    expect(!r.ok && r.code).toBe("COMPILE_BUSY");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses to start with too little time left", async () => {
    const r = await compileLatex("x", "pdflatex", { deadline: Date.now() + 4_000 });
    expect(!r.ok && r.code).toBe("COMPILE_TIMEOUT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a too-large document to a clear error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 413 }));
    const r = await compileLatex("x", "pdflatex");
    expect(!r.ok && r.code).toBe("COMPILE_REJECTED");
    expect(!r.ok && r.message).toMatch(/too large/);
  });

  it("reports the service's own timeout as a timeout", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, reason: "timeout", log: "" }), { status: 422 }));
    const r = await compileLatex("x", "pdflatex");
    expect(!r.ok && r.code).toBe("COMPILE_TIMEOUT");
  });
});
