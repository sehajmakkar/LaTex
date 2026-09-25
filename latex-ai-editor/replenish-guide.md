# Replenish Guide: setup & verification per step

A companion to [VERO_REVIVAL_PLAN.md](VERO_REVIVAL_PLAN.md). Each step in the plan gets a section here with **what changed**, **setup**, **how to test**, and a **results table** for you to fill in.
Please go through the latest section and fill in the table (or paste it back to me) before we start the next step.

Legend for results: ✅ works · ❌ broken (add what you saw) · ⏭️ skipped

---

## Running the app locally (applies to every step)

```bash
cd latex-ai-editor
npm install           # only needed after dependency changes
npm run dev           # http://localhost:3000
```

Required `.env` values (see `.env.example`): `DATABASE_URL`, the Clerk keys, `GEMINI_API_KEY`, `GEMINI_MODEL`, `LATEX_SERVICE_URL`, `LATEX_API_SECRET`, the Dodo keys, and the R2 keys.
If you remove `LATEX_SERVICE_URL`, `/api/compile` compiles on your Mac using MacTeX. That's useful if Railway is down.

**After any `.env` change, restart `npm run dev`.** Next.js reads env only at startup.

---

## Step: Phase 0 + 1.0 (26 Sep 2026)

### What changed

| Area | Change | Files |
|---|---|---|
| **Inline AI fix** | The code hard-coded `gemini-2.5-flash`. With your new key, Google returned *404 "no longer available to new users"* for it earlier today; later calls worked again, so it's being phased out unevenly. The model now comes from `GEMINI_MODEL` (default `gemini-3.6-flash`) through one shared client. | `src/lib/gemini.ts` (new), `src/lib/env.ts`, `src/services/ai-service.ts`, `src/services/ats/llm-ats-service.ts` |
| AI errors are visible | The server checks the first AI chunk before replying, so a bad key, retired model, or quota problem returns an HTTP 502 with a readable message instead of an empty stream. | `src/app/api/ai/edit/route.ts` |
| AI client fixes | The ⌘K client used to swallow server errors (turning them into an empty edit) and could drop data that arrived split across network chunks. Both are fixed, and an empty AI result now shows an error instead of deleting your selection. | `src/components/editor/CodeMirrorEditor.tsx` |
| Lint | 5 errors → 0 (typed `any`s, a React effect in the project-name editor, unused imports). 4 warnings remain on purpose; they get fixed in Phases 2–3. | several pages and routes |
| Env template | `.env.example` now lists `GEMINI_API_KEY` and `GEMINI_MODEL` (not `OPENAI_API_KEY`), drops Pro Plus, and is no longer gitignored. | `.env.example`, `.gitignore` |

### What I already verified
- `npx tsc --noEmit` is clean, `npm run build` passes, and `eslint` shows 0 errors.
- **Gemini through the real app code** (the same functions the API routes call):
  - Inline edit turned the "Developed a REST API…" bullet into `\resumeItem{Built a FastAPI and PostgreSQL REST API to store LMS data}` in about 7 s.
  - The ATS AI review returned a score, a summary, and 4 suggestions in about 9 s.
- **Railway compile service:**
  - The secret is enforced (no secret gets 401, a wrong secret gets 401).
  - The default resume and **all 13 templates** compile (0.6–1.4 s each).
  - xelatex (`fontspec`) and lualatex (`\directlua`) work.
  - A broken document returns 422 with the TeX error line.
- **Database:**
  - The live Neon schema matches `src/lib/db/schema.ts` (no drift).
  - ⚠️ The DB was always managed with `drizzle-kit push`, so `drizzle/` migrations are out of date and `npm run db:migrate` would fail. **Don't run it.** Phase 2 sets up a proper baseline migration.

### What I could not test (needs you in a browser)
Anything behind Google sign-in: the pages, ⌘K in the editor, uploads.

### Setup
1. `.env` must have `GEMINI_MODEL=gemini-3.6-flash` (already done).
2. Restart the dev server: `npm run dev`.

### Test checklist

**A. Inline AI edit (⌘K), the main fix**
1. Sign in → open any project.
2. Select one `\resumeItem{...}` line → press **⌘K** → type `make this more concise` → Enter.
3. Expected: after a few seconds a green/red diff appears in place. **⌘Y** accepts it, **⌘U** rejects it.
4. Error path: in `.env`, set `GEMINI_MODEL=gemini-2.5-flash`, restart, and repeat step 2.
   Expected: a red toast **"The AI service is unavailable right now. Please try again."** and your text is left unchanged. The terminal running `npm run dev` logs `AI provider error: … 404 …`.
   **Set it back to `gemini-3.6-flash` and restart afterwards.**

**B. Phase 0 smoke test (existing features)**

| # | Flow | Steps | Expected |
|---|---|---|---|
| 1 | Sign in | `/` → Sign in with Google | Lands on `/dashboard` |
| 2 | Create project | Dashboard → new blank project | Editor opens with the default resume |
| 3 | Create from template | `/templates` → pick one → fill in the form | Project opens with that template |
| 4 | Rename | Click the project name in the editor header → type → Enter | New name is saved (refresh to check) |
| 5 | Compile | Click **Compile** | PDF appears on the right in about 1–2 s |
| 6 | Compile error | Type `\badmacro` inside the document → Compile | Error toast "Compilation failed", no crash |
| 7 | Download | Click **Download** after compiling | A PDF downloads |
| 8 | Autosave | Edit some text, wait 3 s, refresh | The edit is still there |
| 9 | Delete | Dashboard → delete a project | Removed from the list |
| 10 | Project limit | As a free user, create a 4th project | Blocked with the "limited to 3 projects" message |
| 11 | ATS: project scan | `/ats` → pick a project → Analyze | Report page with scores and suggestions (takes about 10 s) |
| 12 | ATS: upload PDF | `/ats` → upload a PDF resume | Report opens and the original PDF shows (from R2) |
| 13 | ATS: upload DOCX | Same, with a `.docx` | Report opens |
| 14 | ATS: with JD | Paste a job description, then analyze | A keyword section appears |
| 15 | ATS free (signed out) | Sign out → `/ats/free` → upload | **Expected to fail** (known bug #1; fixed in Phase 4). Just note what you see. |
| 16 | Sign out | User menu → Sign out | Back to `/` |

### Results: run by Claude on 26 Sep 2026

Run against `localhost:3000` with a temporary Clerk test user, using the real API routes with real session tokens. The test user and all its data were deleted afterwards. Full evidence is in the Phase 0 table of [VERO_REVIVAL_PLAN.md](VERO_REVIVAL_PLAN.md). Browser-only interactions were skipped at your request; they're marked *(optional for you)*.

| Test | Result | Notes |
|---|---|---|
| A. ⌘K AI edit (API) | ✅ | 2.5–2.9 s, returns a valid `\resumeItem{…}` |
| A. ⌘K error with a bad model | ✅ | 502 with "The AI service is unavailable right now…"; cause logged on the server |
| A. ⌘K popup, diff, ⌘Y/⌘U in the editor | ⏭️ | *(optional for you)* Browser-only |
| B1 Sign in / user provisioning | ✅ | |
| B2 Create project | ✅ | |
| B3 From template | ✅ | |
| B4 Rename | ✅ API | *(optional for you)* the inline name box |
| B5 Compile | ✅ | ~1.2 s via Railway |
| B6 Compile error | ✅ | 422 with the TeX log |
| B7 Download | ✅ data | *(optional for you)* the button itself |
| B8 Autosave | ✅ API | |
| B9 Delete | ✅ | |
| B10 Project limit | ✅ | 403 on the 4th project |
| B11 ATS project scan | ✅ | ~11 s |
| B12 ATS PDF upload | ✅ | Original file stored in and served from R2 |
| B13 ATS DOCX upload | ✅ | |
| B14 ATS with JD | ✅ | Keyword section present |
| B15 ATS free (signed out) | ❌ expected | 500 on upload / HTML 404 on analyze. Fixed in Phase 1.2 + Phase 4 |
| B16 Sign out | ⏭️ | *(optional for you)* Browser-only |

---

## Step: Phase 1.1, hardened compile service (26 Sep 2026)

### What changed

| Area | Change | Files |
|---|---|---|
| Sandbox | TeX can only read or write inside its own job folder (`openin_any=p`, `openout_any=p`); shell escape is off; TeX gets an allow-listed environment only | `latex-service/server.js` |
| **User isolation** | Each compile runs as its own Linux user (`texjob0`–`7`) in a private folder. This closes a hole found during testing: lualatex's Lua could read the server's memory and environment (where the secret is) and write to `/tmp` | `server.js`, `Dockerfile` |
| Secret | Service **refuses to start** without `LATEX_API_SECRET`; constant-time comparison | `server.js` |
| Stability | 1 compile at a time + queue of 4 (Railway Free has 512 MB RAM); **503 + `Retry-After`** when full; timeout kills all child processes; 50 MB file cap; CPU cap; `tini` as PID 1 | `server.js`, `Dockerfile` |
| Coverage | Same Alpine TeX Live 2023 "full minus docs" as before, plus `latexmk` multi-pass (references, biber/bibtex), biber, extra fonts, fonts findable by name, prebuilt font caches | `Dockerfile` |
| Tests | `latex-service/test/run-tests.mjs` (31 checks) · `npm run test:templates` (compiles every template) · GitHub Action that runs both on every change to the service or templates | `latex-service/test/`, `scripts/compile-templates.ts`, `.github/workflows/latex-service.yml` |
| Cleanup | Dropped the unused `uuid` dependency; Railway healthcheck timeout 30 s → 120 s | `package.json`, `railway.toml` |

New optional Railway variables (defaults suit Free): `MAX_CONCURRENT_COMPILES` (1, max 8), `MAX_QUEUED_COMPILES` (4), `QUEUE_TIMEOUT_MS` (30000), `COMPILE_TIMEOUT_MS` (60000).

### What I already verified (local Docker, amd64 like Railway, limited to 512 MB RAM and 1 CPU)
**30/31 checks pass:**
- Auth (401 without the secret or with a wrong one); empty document → 400.
- pdflatex, xelatex (with TeX Gyre, Liberation, Carlito, Roboto and Source Sans by name) and lualatex all compile.
- latexmk resolves `\ref`, `\pageref` and biblatex/biber citations.
- tikz, pgfplots, fontawesome5, tcolorbox, siunitx and 20 more packages load; moderncv compiles.
- **Security, all blocked:**
  - TeX: `\input{/proc/self/environ}`, reads of `/etc/passwd`, `/proc/1/environ` and `../` paths, `\write18`, writes to `/tmp`.
  - Lua: reading the service code, writing `/tmp`, `/var/tmp` or `/dev/shm`, `io.popen`, `os.execute`, `os.getenv(secret)`, opening any other process's `environ` or `mem`.
- An infinite loop is killed at the timeout. A burst of 10 gives 5×200 + 5×503 (with `Retry-After`), and the service is idle afterwards.
- **1 cosmetic failure:** a 200 MB file write *is* stopped at 50 MB within ~1 s, but it's labelled `reason: "error"` instead of `"limit"`. Logged as a low-priority follow-up.

**Image size: 3.98 GiB unpacked**, about the same as the image Railway already accepted (it has the same TeX Live payload). See the deploy note below.

Timings above are under emulation on a Mac (Rosetta), so Railway should be faster. lualatex's ~8 s is mostly font loading; that's expected, and xelatex/pdflatex are the usual engines for resumes.

### Deploy (you)
1. Commit and push to `main`. Railway rebuilds the service from `latex-ai-editor/latex-service` automatically. The first build takes about 10–15 min.
2. In Railway → the service → **Variables**, make sure `LATEX_API_SECRET` is still set. **Without it the new service stops at startup** (by design).
3. **Watch the build/deploy log.**
   - If it fails with an **image size** error: tell me, and I'll drop the Chinese/Japanese/Korean packs (~650 MB) from the Dockerfile.
   - A good deploy log ends with:
     `LaTeX compiler listening on 0.0.0.0:8080 (pdfTeX … TeX Live 2023/Alpine Linux; 1 concurrent, queue 4)`
4. The **GitHub Action "LaTeX service"** runs on the push. Check it goes green under the repo's **Actions** tab. It builds the image, runs the 31 checks, and compiles every template.

### Test against Railway after deploying (you, or ask me)
```bash
cd latex-ai-editor
# quick checks without the slow timeout/burst tests
SERVICE_URL="$LATEX_SERVICE_URL" LATEX_API_SECRET="<your secret>" SKIP_SLOW=1 node latex-service/test/run-tests.mjs
# every template
LATEX_SERVICE_URL="<url>" LATEX_API_SECRET="<your secret>" npm run test:templates
```
Then, in the app: open a project → **Compile** → the PDF appears.

### Results (fill in)

| Test | Result | Notes |
|---|---|---|
| Railway build succeeded (no image-size error) | | |
| Deploy log shows "listening … 1 concurrent, queue 4" | | |
| GitHub Action "LaTeX service" green | | |
| `run-tests.mjs` against Railway (SKIP_SLOW=1) | | |
| `npm run test:templates` against Railway | | |
| Compile from the app editor | | |
