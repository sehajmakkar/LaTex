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

---

## Step: Phase 1.4, hardened inline AI editing (⌘K) (26 Sep 2026)

### What changed

| Area | Change | Files |
|---|---|---|
| Model + SDK | ⌘K now uses **`gemini-3.1-flash-lite`** (`GEMINI_MODEL_FAST`, ~5× cheaper, ~1.2 s) on the new `@google/genai` SDK with minimal thinking. The old SDK is removed; the ATS review is migrated too | `src/lib/gemini.ts`, `src/lib/env.ts`, `src/services/ats/llm-ats-service.ts` |
| Prompt | New strict system prompt: replacement only, keep macros, escape specials, no file/shell/Lua commands, **never invent facts** (uses `[X]` placeholders + a note) | `src/services/ai/inline-edit-prompt.ts` |
| Injection defence | User text goes in labelled blocks treated as data; fake closing tags are neutralised; context trimmed on the server | same |
| Validation | Every answer is checked before it reaches the editor: braces/environments balanced, dangerous commands denied, unescaped `% & #`, size, **invented numbers**. One automatic retry, then a clear "nothing was changed" error | `src/services/ai/inline-edit-validator.ts`, `src/services/ai-service.ts` |
| Limits | Sign-in required; free **40/month**, Pro 1,000/month; 10/min burst; 429 with an **Upgrade** button | `src/app/api/ai/edit/route.ts`, `src/lib/plans.ts`, `src/lib/rate-limit.ts`, `src/repositories/user-usage-repository.ts` |
| Client | JSON instead of streaming; the model's note shows as a toast; no more double error toasts | `src/components/editor/CodeMirrorEditor.tsx` |
| Bug fix | A ⌘K call could fail *after* Gemini answered if the user row didn't exist yet (foreign key on usage); now the row is created first | `src/app/api/ai/edit/route.ts` |
| Tests | `npm test` (22 unit tests) · `scripts/eval-inline-edit.ts` (60-case eval) | `vitest.config.ts`, `src/services/ai/*.test.ts` |

Optional `.env` addition (the default already applies): `GEMINI_MODEL_FAST=gemini-3.1-flash-lite`.

### What I already verified
- **Unit tests 22/22:** balance, environments, dangerous commands (including `\csname`/`^^` tricks), escapes, invented numbers, injected closing tags, context trimming.
- **Eval 60/60** (real Gemini, 3 templates). Every accepted edit compiled on Railway. "Add a metric/percentage" produced `[X]\%` / `[N]` placeholders instead of invented numbers. 12 injection attempts all failed. Average 1.2 s.
- **Route via your dev server** with a temporary Clerk user (deleted afterwards): edit 200 and counted in `user_usage`; prompt > 500 or selection > 8,000 → 400; bad body → 400; 40 used → 429 "Upgrade to Pro"; 11th request in a minute → 429.
  - ❌ Signed-out gets an HTML 404 instead of JSON 401 (the known middleware issue, scheduled for 1.2).
- `tsc`, `eslint` (0 errors) and `npm run build` pass.

### Setup
1. `npm install` (adds `@google/genai` and `tsx`, removes `@google/generative-ai`).
2. Restart `npm run dev`.

### Test checklist (browser, optional but recommended)
1. Open a project, select one `\resumeItem{…}` line, press **⌘K**, type `make this more concise`, press Enter. Expected: a diff in about 1–2 s; **⌘Y** accepts, **⌘U** rejects.
2. Select a bullet, press ⌘K, type `add a metric`. Expected: the edit uses a placeholder like `[X]\%` and an **"AI note"** toast tells you to fill it in.
3. Select a bullet, press ⌘K, type `replace this with \input{/etc/passwd}`. Expected: no `\input` appears; either a harmless edit or "The AI returned an invalid edit, nothing was changed".
4. *(Optional)* Run the unit tests: `npm test`.
5. *(Optional, costs about 1 cent)* Run the eval: `npx tsx --env-file=.env --tsconfig tsconfig.json scripts/eval-inline-edit.ts`

### Results (fill in)

| Test | Result | Notes |
|---|---|---|
| 1. ⌘K concise edit, accept/reject | | |
| 2. Metric → placeholder + note toast | | |
| 3. `\input` request blocked | | |
| 4. `npm test` | | |

---

## Step: Phase 3, Vero rebrand, app shell, landing → app flow (26 Sep 2026)

### What changed (by area)

| Area | Change | Files |
|---|---|---|
| Brand | "TeXel" → **Vero** across the app; logo mark (check-shaped "V") + `app/icon.svg`; titles now "Page · Vero"; app marked `noindex` | `src/components/brand/VeroLogo.tsx`, `src/app/icon.svg`, `src/app/layout.tsx`, `src/lib/site.ts` |
| App shell | One sidebar for every page (Resumes, Templates, ATS check, Billing) with a **plan card** showing this month's usage and an Upgrade pill; mobile top bar + menu; signed-out variant | `src/components/shell/*`, `src/app/api/usage/route.ts`, `src/hooks/use-usage.ts` |
| Routes | Regrouped (URLs unchanged): `(app)` for shell pages, `(editor)` for the full-screen editor | `src/app/(app)/…`, `src/app/(editor)/…` |
| Resumes | Onboarding when empty; cards with a ⋯ menu (Open, Rename, ATS check, Delete with confirmation) | `src/app/(app)/dashboard/page.tsx` |
| Editor | New compact header (breadcrumb + rename, **Saved** status, ATS check, Download, Compile, shortcuts); **mobile Code/Preview tabs**; **fix:** a previous resume's PDF no longer shows up | `src/components/editor/EditorHeader.tsx`, `src/app/(editor)/project/[id]/page.tsx` |
| Templates | Filter pills; real descriptions (8 were "Placeholder…"); signed-out "Use this template" → sign-up that opens the template afterwards | `src/app/(app)/templates/page.tsx`, `src/templates/**` |
| ATS | Decluttered into one scan panel + recent reports; report page fits the shell and mobile | `src/app/(app)/ats/**` |
| Billing | Free vs Pro $5.99, comparison table, FAQ; success page waits for Pro to activate | `src/app/(app)/billing/**` |
| Auth + flow | Branded sign-in/up; `/` redirects; **intents** from the landing site survive sign-up; `redirect_url` honoured (same-site only) | `src/app/sign-*`, `src/app/page.tsx`, `src/lib/intents.ts`, `src/lib/auth-params.ts`, `src/components/shell/IntentHandler.tsx` |
| Errors | Branded 404 and error pages | `src/app/not-found.tsx`, `src/app/error.tsx` |

New optional env vars (`.env.example`): `NEXT_PUBLIC_MARKETING_URL` (default `https://texels.vercel.app`) for "Back to site", and `NEXT_PUBLIC_SUPPORT_EMAIL` to show a Support link.

### What I already verified
- `tsc` clean · `eslint` 0 errors · **Vitest 27/27** (5 new tests: intent whitelist, open-redirect protection) · `npm run build` passes.
- Screenshots (dark, 1440 px and 390 px) of the **public** pages: Templates (sidebar, pills, cards), free ATS, sign-up with `intent=template:chicago`. `/?intent=ats` signed out → `/sign-up?intent=ats` ✅.
- Signed-in pages were **not** opened in a browser. Please run the checklist below.

### Setup
1. Restart `npm run dev` (routes moved; a stale `.next` can confuse the dev server; delete `.next` if a page 404s).
2. *(Optional)* Add `NEXT_PUBLIC_SUPPORT_EMAIL=you@…` to `.env`.

### Landing page CTAs (you, in the landing repo)
Point the landing buttons at the app (use your app URL; locally `http://localhost:3000`):

| Button | URL |
|---|---|
| Get started / Sign up | `https://<app>/sign-up?intent=start` |
| Log in | `https://<app>/sign-in` |
| Free ATS check | `https://<app>/sign-up?intent=ats` *(becomes `/ats/free` once Phase 4 makes it anonymous)* |
| A specific template | `https://<app>/sign-up?intent=template:<id>`, e.g. `template:chicago`, `template:modern-tech` |
| Pricing → Go Pro | `https://<app>/sign-up?intent=pro` |
| Browse templates (no sign-up) | `https://<app>/templates` |

Signed-in users following any of these skip sign-up and land straight on the action.

### Test checklist (browser)

| # | Check | Expected |
|---|---|---|
| 1 | Open `/` while signed in | Lands on **Resumes**; the sidebar shows your plan card with Resumes x/3 and AI edits x/40 |
| 2 | Sidebar links (Resumes, Templates, ATS check, Billing) | Same shell everywhere; the current page is highlighted |
| 3 | Narrow the window below ~768 px | Top bar with a ☰ menu; the menu closes after tapping a link |
| 4 | Resumes → ⋯ → Rename / Delete | Rename saves; Delete asks for confirmation first |
| 5 | With 0 resumes (or a new account) | Onboarding: template · blank · check an existing resume |
| 6 | Templates → a filter pill → **Use template** | Opens in the editor |
| 7 | Editor header | Breadcrumb "Resumes / name"; click the name to rename; "Saving… → Saved" after typing; Download file is named after the resume |
| 8 | Compile resume A, go back, open resume B | B shows **no** PDF until compiled (bug fix) |
| 9 | Editor at phone width | Code / Preview tabs; after Compile it switches to Preview |
| 10 | ATS check → both tabs, JD toggle, a report | One panel; the report shows beside the file on desktop |
| 11 | ⋯ → ATS check on a resume card | ATS page opens with that resume preselected |
| 12 | Billing | Free vs Pro $5.99, comparison table, FAQ; Upgrade opens Dodo checkout |
| 13 | Sign out, then visit `/templates` → Use this template | Sign-up page; after signing up, that template opens in the editor |
| 14 | Signed out: `/?intent=pro` → sign in | Goes straight to Dodo checkout |
| 15 | Signed in: a bad URL like `/nope` | Branded 404 |
| 16 | Light mode (theme toggle) | Shell, pages and cards readable in light mode (the Clerk widget stays dark; known) |

### Results (fill in)

| # | Result | Notes |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |
| 14 | | |
| 14b | | |
| 14c | | |
| 14d | | |
| 15 | | |
| 16 | | |

---

## Step: Phase 3.4 setup, marketing site moved into this repo (26 Sep 2026)

### What changed
| Change | Where |
|---|---|
| `TeXel-Landing` imported **with history** into `marketing/` (local commit `40f86d4`, not pushed) | `marketing/` |
| Each Vercel project only builds when its own folder changes (`ignoreCommand`) | `marketing/vercel.json`, `latex-ai-editor/vercel.json` |
| Railway only rebuilds the compile image when `latex-service/` changes (`watchPatterns`) | `latex-ai-editor/latex-service/railway.toml` |
| Marketing dev server on port 3001 | `marketing/package.json` |

### Verified
- `marketing/` installs and builds (`npm ci && npm run build`); the page prerenders.
- The ignore commands behave correctly on the import commit: **app skips** (exit 0), **marketing builds** (exit 1).

### Steps for you
1. Commit the small config changes (the three files above) and **push `main`**.
2. **Vercel, marketing project** (the one serving `texels.vercel.app`):
   Settings → Git → **Disconnect** `TeXel-Landing` → **Connect** `sehajmakkar/LaTex` → Settings → Build & Deployment → **Root Directory = `marketing`** → Save → Deployments → **Redeploy**.
3. **Vercel, app project** (`hirex-omega.vercel.app`): check that Root Directory = `latex-ai-editor`. The new `ignoreCommand` comes from `vercel.json` automatically; if a "Ignored Build Step" is already set in the dashboard, clear it so the file's version applies.
4. **Railway:** after the push, check the service's Settings → **Watch Paths** shows `/latex-ai-editor/latex-service/**` (from `railway.toml`). If Railway kept an older dashboard value, set it there to the same.
5. When `texels.vercel.app` deploys fine from the new repo: GitHub → `TeXel-Landing` → Settings → **Archive this repository**.

Local development from now on:
```bash
cd latex-ai-editor && npm run dev   # app        → http://localhost:3000
cd marketing && npm run dev         # marketing  → http://localhost:3001
```

### Results (fill in)
| Check | Result | Notes |
|---|---|---|
| Push OK | | |
| Marketing deploys from `LaTex` repo, root `marketing` | | |
| App still deploys (and skips when only `marketing/` changes) | | |
| Railway doesn't rebuild on a marketing-only push | | |
| Old repo archived | | |

---

## Step: Phase 3.4 round 1, marketing site rebrand, links, pricing, FAQ, SEO (26 Sep 2026)

### What changed (`marketing/`, design unchanged, no dependency changes)
| Area | Change | Files |
|---|---|---|
| Brand | TeXel → **Vero** everywhere; Vero favicon + Apple icon (the old ones were broken base64 text files) | `components/**`, `app/icon.svg`, `app/apple-icon.tsx` |
| Links | All buttons go to the dashboard, login first then the right page (start / ATS / Pro checkout); Log in in the navbar | `lib/site.ts`, navbar, hero, features, CTA, footer |
| Pricing | Free $0 · Pro $5.99, the same features as the dashboard billing page | `components/sections/pricing-section.tsx` |
| New sections | Free ATS check CTA, FAQ (with structured data) | `components/sections/ats-cta-section.tsx`, `faq-section.tsx`, `app/page.tsx` |
| SEO | Title, description, keywords, canonical, social previews; author **Sehaj**; v0 generator removed; app + FAQ structured data; `robots.txt`; `sitemap.xml`; share image | `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/opengraph-image.tsx` |

**The SEO files, briefly:**
- `robots.txt` tells search engines they may index the site and where the sitemap is; Vercel preview links are kept out of Google.
- `sitemap.xml` lists the pages to crawl.
- The share image is what WhatsApp, LinkedIn or X show when someone posts your link.
- Structured data lets Google show Vero's price and FAQ answers directly in results.

Optional env vars (`marketing/.env.example`): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`.

### What I already verified
- `npm run build` passes (7 routes incl. `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/icon.svg`, `/apple-icon`).
- In a browser (production build): every button's destination checked; page title, author "Sehaj", canonical, share image and 2 structured-data blocks present; no console errors apart from the Vercel Analytics script (expected locally).

### Test checklist
| # | Check | Expected |
|---|---|---|
| 1 | Open http://localhost:3001 | "Vero" in the navbar, footer and tab title; Vero icon in the tab |
| 2 | **Get Started** / **Start Writing Free** | Dashboard sign-up → after login, Resumes |
| 3 | **Check My Resume Free** (ATS section) / **Check your resume free** (features) | Sign-up → after login, the ATS page |
| 4 | **Upgrade to Pro** | Sign-up → after login, Dodo checkout |
| 5 | **Log in** | Dashboard sign-in |
| 6 | Pricing | Free $0 · Pro $5.99/month, same features as the dashboard |
| 7 | FAQ | Opens and closes; FAQ link in the navbar scrolls there |
| 8 | After deploy: http://…/robots.txt and /sitemap.xml | Both load |
| 9 | After deploy: paste the site link in WhatsApp/LinkedIn | Vero preview image shows |
| 10 | After deploy: https://search.google.com/test/rich-results with your URL | Detects "FAQ" and "Software App" |

### Results (fill in)
| # | Result | Notes |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |

---

## Step: Phase 4, ATS rebuild (26 Sep 2026)

### What changed
| Area | Change | Files |
|---|---|---|
| Engine | New two-layer ATS: extraction with layout signals (multi-column, icons, tables), ATS-style parse, 11 rule-based categories, AI content review + AI job match with **server-side verification**, weighted scores | `src/services/ats/*` (old ATS services removed) |
| Projects | A project scan **compiles the resume to PDF** first and checks that PDF (stored for the preview) | `src/services/compile-service.ts`, `src/app/api/ats/scan/route.ts` |
| API | One `POST /api/ats/scan` (file upload or `projectId`, + JD or target role); the reports API gates Pro details for Free | `src/app/api/ats/scan`, `src/app/api/ats/reports/[id]` |
| Limits | Rule-based check unlimited; AI review Free 5 / Pro 60 per month | `src/lib/plans.ts`, `/api/usage` |
| Scan page | Resume picker or drag-and-drop, JD or target role, progress, AI reviews left, recent reports | `src/app/(app)/ats/page.tsx` |
| Report page | ResumeWorded-style: score strip, Top fixes / Completed rail, detail panels, What the ATS sees, Job match, **PDF preview (also for projects)**, blurred Pro sections | `src/app/(app)/ats/[id]/page.tsx`, `src/components/ats/*` |
| Fix in editor | Opens the resume, selects the bullet, opens ⌘K with the prompt pre-filled | `src/components/editor/*`, `src/app/(editor)/project/[id]/page.tsx` |
| `/ats/free` | Now a redirect (sign-up with `intent=ats`, or `/ats`) | `src/app/(app)/ats/free/page.tsx` |

### What I already verified
- **Unit tests 43/43** (16 new for ATS and the bullet locator).
- Engine on 5 compiled templates: both sidebar templates flagged as multi-column; single-column ones not.
- AI run: sensible bullet rewrites with [X] placeholders, real typos found in the default resume, JD requirements verified against the text.
- **End-to-end API (dev server, temporary user, deleted afterwards): 10/10**: project scan, Free redaction, compiled-PDF preview, two-column upload, DOCX + target role, fake PDF rejected, quota fallback, usage counter, access control.
- `tsc`, ESLint (0 errors), `npm run build`.

### Setup
Restart `npm run dev`. No new env vars or database changes. (`R2_*` must be set for previews, as it already is.)

### Test checklist (browser)
| # | Check | Expected |
|---|---|---|
| 1 | `/ats` → **One of my resumes** → pick one → paste a real job description → **Run ATS check** | Progress steps, then the report in ~10 s |
| 2 | Report header | ATS score, 3 group scores, Job match %; "Open in editor" / "New check" |
| 3 | Right side (wide screen) | **The compiled PDF** of your resume (not LaTeX code) |
| 4 | Left rail | "Top fixes" (lowest first) and "Completed", each with a /10 badge |
| 5 | Overview → **What the ATS sees** | Your name, email, phone, sections, roles, skills as a parser reads them |
| 6 | **Job match** | Required / Nice to have with ✓ / ≈ (implied) / ✗ and quoted evidence |
| 7 | **Bullet strength** | First 2 fixes show rewrite + prompt; the rest are blurred with "See the rewrite and prompt with Pro" |
| 8 | **Fix in editor** on a fix | Editor opens, the bullet is selected, ⌘K is open with the prompt filled → press Enter → diff → ⌘Y |
| 9 | `/ats` → **Upload a file** → a two-column PDF resume | "Layout & file" shows **Multi-column layout detected** |
| 10 | Upload a DOCX with only a **target role** | Job match based on typical requirements for that role |
| 11 | Narrow window | Section dropdown + "Resume" button instead of the rail and preview |
| 12 | Open an old report from before today | "This report uses the old ATS check" + Run a new check |
| 13 | Signed out: open `/ats/free` | Goes to sign-up; after sign-up lands on `/ats` |

### Results (fill in)
| # | Result | Notes |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |

---

## Step: Phase 5, AI command bar (26 Sep 2026)

### What changed
| Area | Change | Files |
|---|---|---|
| Command bar | Floating chat input at the bottom of the code pane (⌘I). Scope menu (whole / selection / section), quick actions (Tailor to a job, Stronger bullets, Fit on one page, Fix compile error), conversation panel, version history menu, "N left" counter | `src/components/editor/CommandBar.tsx`, `src/hooks/use-ai-commands.ts` |
| Diff review | AI changes show as an inline diff in the editor with **Keep / Undo** on each change and **Keep all / Undo all**; like ⌘K, **Compile works during review** and previews the AI version without saving it (Undo re-renders the original); autosave pauses during review; ⌘Z undoes an applied change | `src/components/editor/ai-review.ts`, `CodeMirrorEditor.tsx`, `EditorPane.tsx` |
| After keeping | Pre-AI version snapshot → save → auto-recompile → if the build breaks, one automatic "fix the compile error" command | `src/app/(editor)/project/[id]/page.tsx` |
| AI + safety | `aiService.command()` (gemini-3.6-flash, JSON schema); every `{find, replace}` edit is verified: unique, in scope, preamble only when asked, no invented numbers, **no job skills the resume doesn't show**, no dangerous commands/packages, no prompt leaks; one retry with reasons | `src/services/ai/command-prompt.ts`, `command-edits.ts`, `src/services/ai-service.ts` |
| API | `POST /api/ai/command`, `PATCH /api/ai/command/[messageId]`, `GET /api/projects/[id]/ai-messages`, `GET/POST /api/projects/[id]/versions`, `GET /api/projects/[id]/versions/[versionId]` | `src/app/api/...` |
| Data | `ai_messages`, `project_versions`, `user_usage.ai_commands` (**already applied to Neon**) | `src/lib/db/schema.ts`, `drizzle/manual/2026-09-26-ai-command-bar.sql` |
| Limits | Free 10 / Pro 120 AI commands a month; versions kept Free 3 / Pro 100; shown in the plan card, billing page and marketing pricing | `src/lib/plans.ts`, `PlanCard.tsx`, `billing/page.tsx`, `marketing/...pricing-section.tsx` |
| Also | ⌘K validator now allows layout lengths (`0.5in`, `-4pt`, `\linespread{0.95}`); editor no longer autosaves right after opening | `inline-edit-validator.ts`, project page |

### What I already verified
- **Unit tests 68/68** (`npm test`): edit verification, tailoring guard, compile-fix balance, prompt leaks, section parsing, rebasing, plus **6 headless editor tests** of the diff review (keep all, undo all, partial, auto-finish, ⌘Z).
- **Eval 60/60** (`npx tsx --env-file=.env --tsconfig tsconfig.json scripts/eval-command.ts`): 20 instructions × 3 templates; every applied result compiled on Railway; no invented numbers or job-only skills; attacks blocked; questions returned no edits; broken documents fixed. Avg 4.0 s, p90 6.3 s.
- **End-to-end API 13/14** (dev server, temporary Clerk user, deleted afterwards along with its DB rows): edits + messageId + remaining, compile of the result, history + status, version snapshot/restore and pruning to 3, section scope, broken compile → AI fix → compiles, question → no edits, bad range 400, other user's project/message 404, usage counter, 429 with Upgrade at the limit. The miss is the timing: 10.5 s for command + compile (target ~10 s).
- `tsc`, ESLint (0 errors), `npm run build`.

### Setup
Restart `npm run dev` (new dependency `@codemirror/merge` is already in `package.json`; run `npm install` if the import fails). No new env vars. The database changes are already applied.

### Test checklist (browser)
| # | Check | Expected |
|---|---|---|
| 1 | Open a resume | Command bar at the bottom of the code pane: quick-action chips, "Ask Vero to edit your resume… ⌘I", scope "Whole resume", "10 left" (free) |
| 2 | Press ⌘I anywhere in the editor | The command bar input gets focus |
| 3 | Type "Add a Projects entry for Vero, built with Next.js and Gemini" → Enter | "Editing your resume…", then Vero's message in the panel and a **green/red diff in the code** with Keep/Undo buttons; the bar turns into "Review N changes · Undo all / Keep all" |
| 4 | Click **Keep all** | Diff disappears, "Compiling…" toast, PDF refreshes with the new project; message shows "Kept" |
| 5 | Press ⌘Z in the editor | The AI change is undone |
| 6 | Run another command, click **Keep** on one change and **Undo** on another | Review ends by itself after the last one; message shows "Partly kept"; only the kept change remains |
| 7 | Run a command and click **Undo all** | Text back to before; "AI changes undone"; nothing recompiles |
| 8 | Select one bullet, click into the bar | Scope switches to "Selection"; "Rewrite this with a stronger verb" only changes that bullet |
| 9 | Scope menu → pick a section → "Shorten this section" | Only that section changes |
| 10 | **Tailor to a job** → paste a JD that asks for a skill you don't have → send | Existing experience reworded toward the JD; the missing skill is **suggested in the message, not added** |
| 11 | Break the LaTeX (delete a `}`), press Compile | Compile error, then a red **Fix compile error** chip appears → click it → diff → Keep → compiles |
| 12 | Ask "What's the weakest part of my resume?" | An answer in the panel, no diff |
| 13 | History (clock) button in the bar | "Before: …" snapshots; pick one → resume restored (⌘Z goes back) |
| 14 | While a diff is open, press **Compile** | PDF shows the AI version; toast "Preview compiled. The AI changes aren't saved until you keep them."; the diff stays open |
| 14b | Then **Undo all** | PDF re-renders the original automatically |
| 14c | Run a command, Compile (preview), then **Keep all** | Saved; no second compile (the preview PDF is already current). If you edit or undo some changes first, it recompiles |
| 14d | Mobile: diff open → tap **Preview** → back to **Code** | Preview works; the diff is still there when you come back |
| 15 | Dark mode | Diff colours and Keep/Undo buttons readable |
| 16 | Mobile width | Bar fits the screen, chips scroll sideways, the last code lines aren't hidden behind the bar |
| 17 | Sidebar plan card / `/billing` | "AI commands" meter and 10 / 120 per month in the comparison |
| 18 | Use up the free commands (or set `ai_commands = 10` for your row in `user_usage`) | Error toast "AI command limit reached" with **Upgrade** |

### Results (fill in)
| # | Result | Notes |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |
| 14 | | |
| 14b | | |
| 14c | | |
| 14d | | |
| 15 | | |
| 16 | | |
| 17 | | |
| 18 | | |
