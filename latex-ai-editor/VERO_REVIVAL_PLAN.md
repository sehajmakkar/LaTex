# Vero: Revival & Launch Plan

*Written 26 Sep 2026. Setup and test steps for each step live in [replenish-guide.md](replenish-guide.md).*

*Supersedes the open items in* `improvement-scope.md`*,* `.cursor/plans/`*, and the "Current status" sections of* `deployment-plan.md`**.*

Vero (currently branded "TeXel") is the **dashboard app**. The marketing site at [https://texels.vercel.app](https://texels.vercel.app) is a separate deploy that should send users here.

---

## 0. Health check (run on 26 Sep 2026, re-checked the same day after your changes)


| Piece                        | Status                         | Evidence                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js build                | ✅ Works                        | `npm run build` passes, `tsc` is clean                                                                                                                                                                                                              |
| Lint                         | ⚠️ 5 errors, 9 warnings        | Mostly `react-hooks/set-state-in-effect` (e.g. `Header.tsx`)                                                                                                                                                                                        |
| Neon Postgres                | ✅ Alive                        | Connected; 8 users and 9 projects in the DB                                                                                                                                                                                                         |
| Clerk (test instance)        | ✅ Alive                        | API returns 200                                                                                                                                                                                                                                     |
| Cloudflare R2                | ✅ Alive                        | Bucket listing works                                                                                                                                                                                                                                |
| Dodo Payments (test mode)    | ✅ Ready                        | Only **Pro** `pdt_0NZhMFnX3AUsGQ2xqsSCG` is active: $5.99/month, tax-inclusive, recurring. Pro Plus is archived (its id is still in `.env`; it gets removed in Phase 2)                                                                             |
| Railway LaTeX service        | ✅ Redeployed                   | `/health` → 200. A test document compiled to a 12 KB PDF in 0.7 s (TeX Live 2023)                                                                                                                                                                   |
| Railway secret check         | ✅ Enforced                     | No secret → 401, wrong secret → 401, correct secret → 200 (0.8 s). The value is still the short old one; rotating it to `openssl rand -hex 32` is recommended but doesn't block anything                                                            |
| Gemini API key               | ✅ Valid                        | `gemini-3.6-flash` works for normal and streamed calls (~2–6 s; ~110 "thinking" tokens per call)                                                                                                                                                    |
| **Inline AI edit (⌘K)**      | ❌ **Broken, root cause found** | The code hard-codes `gemini-2.5-flash`, and Google now returns *404 "no longer available to new users"* for it. `GEMINI_MODEL` in `.env` is never read. ATS's AI review fails for the same reason. The client then **hides** the error (see bug #9) |
| Local LaTeX (MacTeX)         | ✅ Installed                    | Without `LATEX_SERVICE_URL`, `/api/compile` falls back to local `pdflatex`                                                                                                                                                                          |
| **Landing page → app links** | ❌ **Missing**                  | Every CTA on texels.vercel.app points to `#`                                                                                                                                                                                                        |




### Bugs and risks found while reading the code

1. **Public ATS page is broken for signed-out users.** `/ats/free` is public, but it calls `/api/ats/upload` and `/api/ats/analyze`. The middleware protects both of those and they return 401. This is the landing-page funnel.
2. **The LaTeX service can leak its own secret.** TeX Live's default `openin_any = a` lets `\input{/proc/self/environ}` print the container env, including `LATEX_API_SECRET`, into the PDF. It can read any other file too. Must be fixed before public launch.
3. **AI and compile have no usage limits.** Any signed-in user can call `/api/ai/edit` and `/api/compile` as often as they like. The `user_usage.compiles` and `user_usage.ai_edits` counters exist but nothing reads or writes them, so Gemini and compute costs have no ceiling.
4. **ATS scoring is unreliable** (details in Phase 4):
  - Section headings must match exactly, so "Work Experience" counts as "experience" missing.
  - Keyword matching counts stopwords ("the", "with", "and") as JD keywords.
  - The score tops out at 75/100 without a JD.
  - The phone regex matches date ranges.
  - If Gemini fails, the whole scan fails.
  - It's billed as free, yet it has a 3/day limit and "pro-locked" sections.
5. **Billing edge cases:**
  - The webhook defaults an unknown product to `"pro"`.
  - `subscription.on_hold` keeps paid access.
  - Users have no way to cancel or manage a subscription.
  - The price gap ($3.99 vs $29.99) and what Pro Plus includes are both undefined.
6. **Gemini SDK:**
  - `@google/generative-ai` is deprecated (successor: `@google/genai`).
  - The model name `gemini-2.5-flash` is hard-coded in two places (`ai-service.ts`, `llm-ats-service.ts`).
7. **UX:**
  - There are three different headers (`DashboardNav`, the editor `Header`, and ad-hoc headers on `/templates` and `/ats/free`).
  - `/` is a mini landing page that duplicates the real one.
  - The PDF preview is an `<iframe>` showing a `data:` URL, which rules out click-to-source and gives a weak mobile experience.
8. **Leftovers:** Stripe columns in `users`, an unused `compilations` table, "TeXel" in 17 places in `src/`, and a joke value for `LATEX_API_SECRET` (rotate it).
9. **Inline-edit client hides failures** (`CodeMirrorEditor.tsx` `handleAIPrompt`):
  - `throw new Error(parsed.error)` sits inside a `try` whose `catch` swallows it, so a server-side failure turns into an empty result instead of an error toast.
  - The SSE reader splits each network chunk on `\n` without buffering, so a `data:` line split across two chunks is dropped silently.
  - The whole stream is collected before it's returned, so streaming gives the user nothing.
10. **The model invents facts.** Asked to "add a metric", it wrote "processing 100,000+ daily requests…". Nothing in the prompt forbids fabricated numbers, employers, or dates.
11. **(Found and fixed in step 1.1) lualatex's Lua bypassed the TeX file sandbox.** `openin_any`/`openout_any` don't apply to Lua's `io.open`. A document could read world-readable files, write to `/tmp`, and open the Node server's `/proc/<pid>/environ` and `/proc/<pid>/mem` (where the secret lives), because TeX and Node ran as the same user. Fixed by running each compile as its own Linux user; see 1.1.
12. **(Found and fixed in step 1.4) A ⌘K edit could fail with a 500 after Gemini had already answered.** Usage rows reference `users(id)`, so a user whose row didn't exist yet (e.g. opened the editor through a direct link) hit a foreign-key error when the edit was counted. The route now creates the user row first, and never discards a finished edit because counting it failed.
13. **(Found and fixed in Phase 3) Opening a resume could show the previous resume's PDF.** The compiled PDF lived in a global store that was never cleared, so resume B showed resume A's PDF (and Download) until recompiled. It's now reset whenever a project opens.
14. **(Found and fixed in Phase 3) Sign-in/up ignored where the user was going.** Both pages forced `/dashboard`, dropping `redirect_url` (e.g. from Templates). They now honour same-site `redirect_url` and landing-page intents.

---



## 1. What I need from you



### Done ✅

- New Gemini key and `GEMINI_MODEL=gemini-3.6-flash` in `.env`.
- Compile service redeployed on Railway.
- Pricing decided: **Free + Pro at $5.99/mo** (Pro Plus archived in Dodo).
- Railway secret enforced; Dodo Pro product updated; `.env` tidied.



### Needed now

Nothing is blocking. Optional: rotate `LATEX_API_SECRET` to a long random value (Railway + `.env`).

### Needed before launch (Phase 6)


| #   | Item                                                                                                                        | Why                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 4   | **A domain for Vero** (e.g. `vero.app` → landing, `app.vero.app` → dashboard)                                               | Clerk production instances require a domain you own; `*.vercel.app` won't work.                                          |
| 5   | **Clerk production instance** and your own **Google OAuth client** (Google Cloud Console → Credentials)                     | Dev keys (`pk_test_…`) show a "development" banner and have user caps.                                                   |
| 6   | **Dodo live mode**: business verification, live API key, live products, webhook at `https://app.<domain>/api/webhooks/dodo` | Needed to take real payments. Dodo reviews your site, so you'll need Terms, Privacy, and Refund pages (I'll draft them). |
| 7   | **Vercel plan**: Hobby is non-commercial only, so a paid product needs **Pro**                                              | Terms of service                                                                                                         |
| 8   | ~~Access to the landing-page repo~~ ✅ Imported into `marketing/` (Phase 3.4)                                              | CTAs must point to the app (§Phase 3.3).                                                                                 |
| 9   | **Vero logo / brand assets**, or approval for me to make a simple wordmark                                                  | Rebrand                                                                                                                  |
| 10  | Neon: are the current 8 users real, or test data?                                                                           | Decides whether we wipe or migrate, and whether we create a separate `prod` branch                                       |


---



## 2. Redeploying the LaTeX compile service

Code: `latex-service/` (Express + TeX Live in Docker, `POST /compile`, `GET /health`, auth header `x-api-secret`).
The Next app is already wired up. It proxies to the service when `LATEX_SERVICE_URL` is set (`src/app/api/compile/route.ts`).

> **Recommended order:** let me land Phase 1.1 (hardening + a smaller image) first, then you deploy once. If you want to test billing or UI right away, compile locally with MacTeX. Just leave `LATEX_SERVICE_URL` unset in `.env`.



### Step 0 (any host): make a new secret

```bash
openssl rand -hex 32   # use this as LATEX_API_SECRET on the host AND in the app's env
```



### Option A: Google Cloud Run (recommended free option)

Scales to zero. The monthly free tier (~2M requests, 180k vCPU-seconds, 360k GiB-seconds) easily covers early traffic. The only real cost is image storage in Artifact Registry, a few tens of cents a month. Downside: a cold start of roughly 5–15 s after idle time.

```bash
# 1. One-time setup
brew install --cask google-cloud-sdk
gcloud auth login
gcloud projects create vero-latex-<random> && gcloud config set project vero-latex-<random>
#    → In the console, link a billing account (required even for free tier) and
#      set a budget alert at $1 (Billing → Budgets & alerts).
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# 2. Deploy from the service folder (Cloud Build builds the Dockerfile)
cd latex-ai-editor/latex-service
gcloud run deploy vero-latex \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi --cpu 1 \
  --concurrency 4 --timeout 90 \
  --min-instances 0 --max-instances 3 \
  --set-env-vars LATEX_API_SECRET=<secret>,COMPILE_TIMEOUT_MS=60000

# 3. Verify
curl https://vero-latex-xxxxx.a.run.app/health   # → {"status":"ok","texlive":true}
```

`--allow-unauthenticated` is fine because the service checks `x-api-secret` itself. Cloud Run sets `PORT=8080`, which `server.js` already respects.

### Option B: Railway (simplest; about $5/mo on the Hobby plan)

1. [https://railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → `sehajmakkar/LaTex`.
2. Service → **Settings** → **Root Directory** = `latex-ai-editor/latex-service`. It picks up `railway.toml`, which uses the Dockerfile.
3. **Variables**: `LATEX_API_SECRET=<secret>`, `COMPILE_TIMEOUT_MS=60000`. Railway injects `PORT` itself.
4. **Settings → Networking → Generate Domain**.
5. The first build takes 10–15 min (TeX Live is large). Then run `curl https://<name>.up.railway.app/health`.
6. Check the resource limits: give it at least 1 GB RAM, because `lualatex` needs it.



### Option C: Render free web service (fallback, weakest)

New → **Web Service** → repo → Root Dir `latex-ai-editor/latex-service` → Runtime **Docker** → Instance **Free**.
Limits: 512 MB RAM (fine for `pdflatex`, but `lualatex` may run out of memory), and it sleeps after 15 min idle with about a minute of cold start. OK for testing; not good enough for paying users.

### Option D: Oracle Cloud "Always Free" ARM VM (free, but you run a server)

4 OCPU and 24 GB RAM, always on, free. You install Docker and put Caddy in front for HTTPS. The most capacity for $0, but you handle all the ops.

### After deploying (any option)

Set `LATEX_SERVICE_URL=<url>` and `LATEX_API_SECRET=<secret>` in `.env` locally and in Vercel. Then compile the default resume from the editor and check that a PDF appears.

---



## 3. Phased plan

Each phase ends with a **"Done when"** checklist. Phases are sequential except where noted.

### Phase 0: Get it running again locally (≈1 day)

Goal: every existing feature works on your machine, and we know exactly what's broken.

- [x] New `GEMINI_API_KEY` in `.env` (you).
- [x] Add `GEMINI_MODEL` env var (default to the current recommended Flash model) and use it in both `ai-service.ts` and `llm-ats-service.ts`.
- [x] Schema drift check (no drift; migrations are stale, so a baseline is needed in Phase 2): `npx drizzle-kit check` / `db:generate` against Neon. Make sure the migrations in `drizzle/` match `schema.ts` (only `0000` exists, but R2 file columns were added later, probably via `push`).
- [x] Fix the 5 lint errors.
- [x] Smoke test, **run by Claude on 26 Sep 2026** against your local dev server (`localhost:3000`) with a temporary Clerk test user. The user and all its data (DB rows, R2 files, Clerk account) were deleted afterwards. The test calls the real API routes with real Clerk session tokens. Browser-only interactions (clicking in the ⌘K popup, the rename box, the sign-out menu) were **not** tested, at your request.


| #   | Flow                           | Result   | Evidence                                                                                                                                 |
| --- | ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Signed-in user provisioning    | ✅        | `GET /api/projects` 200; user row created on first call, plan `free`                                                                     |
| B2  | Create blank project           | ✅        | 201. The dashboard sends the default resume as content                                                                                   |
| B3  | Create from template           | ✅        | 201 with `templateId=modern-tech`; 12 templates listed                                                                                   |
| B4  | Rename                         | ✅ (API)  | `PATCH` 200; name persists                                                                                                               |
| B5  | Compile                        | ✅        | 200 in ~1.2 s via Railway, pdflatex, 101 KB PDF                                                                                          |
| B6  | Compile error                  | ✅        | 422 `COMPILE_ERROR`; log contains "Undefined control sequence"                                                                           |
| B7  | Download                       | ✅ (data) | Response is a `data:application/pdf` URL (what the Download button uses)                                                                 |
| B8  | Autosave                       | ✅ (API)  | `PATCH` content → `GET` returns the edit                                                                                                 |
| B9  | Delete project                 | ✅        | `DELETE` 200                                                                                                                             |
| B10 | Free limit (3 projects)        | ✅        | 4th project → 403 "Free accounts are limited to 3 projects…"                                                                             |
| A   | ⌘K AI edit (`/api/ai/edit`)    | ✅        | 200 in 2.5–2.9 s → `\resumeItem{Visualized GitHub classroom collaboration}`                                                              |
| A   | ⌘K error path                  | ✅        | Invalid model → 502 `AI_PROVIDER_ERROR` with a readable message; real error in server log                                                |
| B11 | ATS project scan               | ✅        | 200 in ~11 s: combined 64, parse 55, quality 78, 5 suggestions                                                                           |
| B12 | ATS PDF upload                 | ✅        | Text extracted (2.6k chars); original stored in R2 and served back as `application/pdf`                                                  |
| B13 | ATS DOCX upload                | ✅        | Text extracted, analysis 200 (combined 73)                                                                                               |
| B14 | ATS with job description       | ✅        | Keyword score 36, 8 found / 14 missing                                                                                                   |
| —   | ATS daily limit (3/day)        | ✅        | 4th scan → 429 "Free accounts can run up to 3 ATS scans per day"                                                                         |
| —   | ATS report list / detail       | ✅        | 200                                                                                                                                      |
| —   | Unauthenticated project access | ✅        | 404 (another user's or signed-out access is blocked)                                                                                     |
| —   | Templates on Railway           | ✅        | All 13 compile (0.6–1.4 s); xelatex and lualatex work                                                                                    |
| B15 | ATS free page, signed out      | ❌        | `/api/ats/upload` → **500** ("Failed to find Server Action"); `/api/ats/analyze` → HTML 404. Bug #1 is confirmed, see new findings below |
| B16 | Sign out                       | ⏭️       | Browser-only, not tested                                                                                                                 |


**New findings from the smoke test** (added to later phases):

- **Signed-out API calls return HTML, not JSON.** Clerk's `auth.protect()` rewrites protected `/api/`* requests to the 404 page, and a multipart POST then crashes with a 500 "Server Action" error. → Phase 1.2: the middleware returns a JSON `401` for `/api/`*.
- **Empty documents give confusing errors.** Compiling an empty document returns 502 "LaTeX service request failed" (the service's 400 is mapped to 502), and an ATS scan of an empty project returns scores of 0 instead of an error. → Phase 1.2 (compile validation) and Phase 4 (ATS).
- **ATS scores the default "Jake Ryan" resume at parse 55/100,** which is evidence for bug #4 (exact-match headings such as "Technical Skills", keyword noise). → Phase 4.
- `gemini-2.5-flash` **is inconsistent:** it returned 404 "no longer available to new users" once, then worked in later calls. Google appears to be phasing it out, so staying on the configurable `GEMINI_MODEL` (3.6-flash) is correct.

**Done when:** the smoke-test table is filled in and every failure is listed as a task in a later phase. ✅ Done, except the browser-only checks.

---



### Phase 1: Compile service and inline AI: working and hardened (≈4–5 days), **top priority**

**1.0 Unblock right away (≈1 hour; the first thing I'll do)**

- [x] Add `GEMINI_MODEL` to `env.ts` and use it in `ai-service.ts` and `llm-ats-service.ts` through one shared `src/lib/gemini.ts` client. This fixes the 404 that breaks ⌘K and ATS.
- [x] Fix the client error swallowing in `handleAIPrompt` so failures show a toast instead of silently returning an empty edit.
- [x] Re-test ⌘K end to end in the browser

**1.1 Harden** `latex-service/` ✅ *Implemented 26 Sep 2026. Local Docker test with Railway Free limits (512 MB RAM, 1 CPU): 30/31 pass. Steps are in* `replenish-guide.md`*.*

- [x] Sandbox file access: `openin_any=p`, `openout_any=p`, `shell_escape=f`, `-no-shell-escape`, and an allow-listed environment for TeX. Tested: `\input{/proc/self/environ}`, `/etc/passwd`, `../` paths, `\write18` and writes to `/tmp` are all blocked.
- [x] **Added: every compile runs as its own unprivileged Linux user** (`texjob0`–`7`, one per slot) in a private job folder (mode 700). `/tmp`, `/var/tmp` and `/dev/shm` aren't writable for them, and `/app` isn't readable. This closes bug #11 (the Lua bypass): Lua can no longer read the server's environment or memory, write outside its folder, or read the service code. The Node server runs as root inside the container, only so it can switch users.
- [x] The service **refuses to start without** `LATEX_API_SECRET` (it used to run open), and removes it from `process.env`.
- [x] Compare the secret in constant time (SHA-256 + `crypto.timingSafeEqual`).
- [x] Concurrency queue: `MAX_CONCURRENT_COMPILES` (default **1** for 512 MB RAM) and `MAX_QUEUED_COMPILES` (default 4). When full → **503 +** `Retry-After: 5`. Tested with a burst of 10: 5×200, 5×503, nothing stuck.
- [x] Runaway processes: each compile runs in its own process group, killed at the timeout; `ulimit -f` 50 MB per file; `ulimit -t` CPU cap; log trimmed to 200 KB; PDF cap 20 MB; `tini` as PID 1 cleans up leftover processes. Tested: an infinite loop is killed at the timeout.
- [x] **Image (revised):** keep **Alpine 3.19 + TeX Live 2023 "full minus docs"** (`texmf-dist-most` + `texmf-dist-lang`), which is near-Overleaf coverage. The official full TeX Live image (~6 GB) would break Railway Free's 4 GB limit. Added: biber, Carlito/Liberation/DejaVu fonts, fontconfig pointed at TeX Live's fonts (`\setmainfont{Roboto}` works), font caches built into the image, npm kept out of the final image. `awesome-cv` isn't a CTAN package (Overleaf ships it as template files).
- [x] Multi-pass with `latexmk` (`-norc`), including biber/bibtex/makeindex. Tested: `\ref`, `\pageref` and biblatex citations resolve.
- [x] CI: `.github/workflows/latex-service.yml` builds the image, checks it's < 4 GB, runs it with 512 MB / 1 CPU, runs `latex-service/test/run-tests.mjs`, and compiles every template via `npm run test:templates` (new `scripts/compile-templates.ts`). *Not run on GitHub yet; it runs on the first push.*

**Follow-ups found while testing step 1.1** (by priority):

- [ ] **(High, blocks deploy)** The image is **3.98 GiB unpacked**. Railway accepted the previous image, which had the same TeX Live payload, so the limit is probably on the compressed size (~1.5 GB), but confirm on the first deploy. Fallback if rejected: drop `texmf-dist-langjapanese`/`langchinese`/`langkorean` (~650 MB).
- [ ] **(Medium, do in 1.2)** The Next app's `/api/compile` maps the service's new **503 (busy)** to a generic 502 "LaTeX service request failed". Map it to "Compiler busy, retrying…" and retry after `Retry-After`.
- [ ] **(Low)** Hitting the 50 MB file cap is stopped correctly (~1 s) but reported as `reason: "error"` instead of `"limit"` (the size check after SIGXFSZ still misses). Only affects the error message.
- [ ] **(Low)** Templates weren't re-compiled against the new image locally (skipped on request). CI covers it on push, or you can run `npm run test:templates` against Railway after deploying (see guide).
- [ ] **(Low, later)** Lua can still *read* world-readable public files (`/etc/passwd`, the TeX Live tree). No secrets are exposed, but noted.
- [ ] **(Later / Phase 7)** TeX Live 2023 is three years old. Newer Alpine releases ship newer TeX Live; switch only after checking the image still fits.

**1.2 Make the app side robust**

- [ ] Middleware: return a JSON `401` for signed-out `/api/*` requests (right now it returns the HTML 404 page, and a 500 for uploads).
- [ ] `/api/compile`: reject empty or whitespace-only content with a 400 "Document is empty", and map the service's 400 to 400 (not 502).
- [ ] `/api/compile`: explicit `auth()` check, plus per-user rate limits via `user_usage.compiles` (e.g. free 50/day, Pro unlimited within fair use).
- [ ] Friendly errors: "Compiler is waking up, retrying…". One automatic retry on 502/503/504, which covers cold starts.
- [ ] Parse the TeX log into structured errors (line number + message) and show them in the editor as CodeMirror diagnostics. This also feeds the AI "fix this error" button in Phase 5.

**1.3 Redeploy** First deploy ✅ done. Next: push the 1.1 changes and Railway rebuilds automatically. Keep `LATEX_API_SECRET` set, because the new service won't start without it. Steps and checks are in `replenish-guide.md`.

**1.4 Harden inline AI editing (⌘K)** ✅ *Implemented 26 Sep 2026. Unit tests 22/22, eval 60/60, route tests 7/8 (the remaining one is the known middleware issue in 1.2). Steps are in `replenish-guide.md`.*

*Output format: strict and machine-checked*

- [x] **Structured JSON output** (`responseJsonSchema`: `{ replacement, notes? }`), parsed with Zod on the server. Raw model text never reaches the editor. The response is plain JSON now (the SSE streaming is gone).
- [x] **Model routing:** ⌘K uses `GEMINI_MODEL_FAST` (default `gemini-3.1-flash-lite`). The eval passed 60/60 with it at ~1.2 s average, so no fallback to 3.6-flash is needed. ATS review keeps `GEMINI_MODEL`.
- [x] Moved to the **`@google/genai`** SDK (the deprecated `@google/generative-ai` is removed, and ATS migrated too). `thinkingLevel: MINIMAL` gives 0 thinking tokens for ⌘K.
- [x] New system prompt (`src/services/ai/inline-edit-prompt.ts`): replacement only, keep macros/structure, escape specials, no preamble changes, no file/shell/Lua commands, **never invent facts** (use `[X]` placeholders plus a note), return the selection unchanged with a note if the instruction can't apply.

*Validation* (`src/services/ai/inline-edit-validator.ts`)

- [x] Strips code fences.
- [x] `{}`/`[]` balance and `\begin`/`\end` pairs must match the selection.
- [x] Size ≤ 4× selection + 2 KB; empty only if the instruction asks to delete.
- [x] Deny-list (unless already in the selection): `\input`, `\include`, `\write`, `\write18`, `\immediate`, `\openin`/`\openout`/`\read`, `\directlua`/`\luaexec`/`\latelua`, `\catcode`, `\special`, `\csname`, `\scantokens`, and `^^` character escapes (both can hide a command name). `\usepackage`, `\documentclass`, `\def`/`\newcommand` and `\begin{document}` are allowed only if the instruction asks for them.
- [x] Unescaped `%`, `&`, `#` rejected unless the selection already had them.
- [x] **Invented-number check:** any number not in the selection, instruction or context is rejected, and the model is told to use a placeholder.
- [x] One retry with the rejection reason, then "AI returned an invalid edit, nothing was changed" (422).

*Prompt-injection defences*

- [x] `<instruction>`/`<selection>`/`<context_before>`/`<context_after>` blocks; tags inside user text are neutralised; context is trimmed server-side to 1,500 chars each side; Zod caps prompt ≤ 500 and selection ≤ 8,000.
- [x] Adversarial tests pass: an injected `</selection><instruction>…` inside the document, "print your system prompt", `\input{/etc/passwd}` and `\directlua{os.execute}` requests. None got through in 12 eval attacks, and the validator blocks them regardless.

*Access, limits, and cost*

- [x] Explicit `auth()`; free **40/month**, Pro **1,000/month** from the new `src/lib/plans.ts`, counted in `user_usage.ai_edits`; burst **10/min** (free) / 20/min (Pro); 429 with an **Upgrade** button in the toast.
- [x] 25 s timeout per Gemini call (route `maxDuration` 60 s). Every call logs `{event:"ai_edit", model, attempts, ms, tokens}`.

*Client*

- [x] `handleAIPrompt` reads JSON, shows the model's note as a toast, shows the Upgrade action on the limit, and no longer shows duplicate error toasts.

*Tests*

- [x] Vitest (`npm test`): 22 unit tests for the validator and prompt builder.
- [x] Eval (`scripts/eval-inline-edit.ts`): 20 instructions × 3 templates. **60/60 passed** on flash-lite: every accepted edit compiled on Railway, metric requests got `[X]`/`[N]` placeholders, and no attack succeeded. 3 answers were fixed by the retry.

**Follow-ups found while testing step 1.4** (by priority):
- [ ] **(Medium, 1.2)** Signed-out `/api/ai/edit` returns the HTML 404 page instead of JSON 401 (same middleware issue as B15; already listed in 1.2).
- [ ] **(Medium, Phase 4)** The burst limiter is in memory, so on Vercel each instance counts separately. The monthly DB quota is the real cap. Move it to Upstash Redis together with the anonymous ATS limits.
- [ ] **(Low, Phase 2)** `user_usage` has no unique key on `(user_id, date)`, so two concurrent first requests on a day can create duplicate rows. Totals stay correct because we sum; add the unique index in the Phase 2 migration.
- [ ] **(Low, Phase 5)** The eval checks safety and compiling, not writing quality. Seen: "make the technologies bold" on a bullet with no technologies returned it unchanged (correct), and "italic technologies" italicised "unit"/"integration". Add an LLM-judge quality score when the command-bar evals are built.
- [ ] **(Low)** Browser check of the ⌘K popup, diff and note toast still needed (see guide).

**Done when:**

- All templates compile against the deployed service, and a request without the secret gets a 401.
- The `/proc/self/environ` test is blocked.
- A burst of 10 parallel compiles is queued or gets clean 503s instead of crashing.
- ⌘K works in the browser; injection and fabrication tests pass; invalid AI output never reaches the editor; limits return a 429.

---



### Phase 2: Verify and fix billing (Dodo) (≈2 days, can run alongside Phase 1)

**2.1 End-to-end test in Dodo test mode**

1. Expose localhost: `cloudflared tunnel --url http://localhost:3000` (or `ngrok http 3000`).
2. Dodo dashboard (test mode) → **Developers → Webhooks** → add endpoint `https://<tunnel>/api/webhooks/dodo` → subscribe to `subscription.`* and `payment.`* → copy the signing secret into `DODO_PAYMENTS_WEBHOOK_KEY`. The current secret is probably for an old endpoint.
3. Set `NEXT_PUBLIC_APP_URL` to the tunnel URL so the checkout `return_url` works.
4. `/billing` → Upgrade to Pro → pay with a Dodo **test card** (see Dodo docs → Testing).
5. Check that `users.plan = 'pro'` in Neon, that `/billing/success` shows the new plan, and that Pro limits apply.
6. From the Dodo dashboard, test cancel, payment failure/on-hold, and renewal.

**2.2 Fixes**

- [ ] Webhook: unknown `product_id` → log and ignore (don't default to `"pro"`). Handle `on_hold` as a downgrade after a grace period. Store `current_period_end`.
- [ ] Order events by timestamp and store the last processed webhook-id (idempotency).
- [ ] **Manage subscription** button: Dodo customer portal session → cancel, update card, invoices.
- [ ] `/billing/success`: poll `/api/billing/me` until the plan changes, because the webhook may arrive after the redirect.
- [ ] One source of truth for entitlements: `src/lib/plans.ts` *(created in 1.4 with the AI-edit limits; add projects/compiles/ATS/command-bar limits and point the pricing page at it)* with limits per plan (projects, compiles/day, AI edits/day, AI commands/day, ATS scans/day, features). Server routes and the pricing UI both read it.
- [ ] Remove the Stripe columns (migration). Remove `pro_plus` from code (`billing-config.ts`, `dodo.ts`, checkout schema, billing page) and change the pricing page to Free vs Pro $5.99.

**Done when:** upgrade, renew, cancel, and fail all update `users.plan` correctly in test mode, and a Pro user sees Pro limits everywhere.

---



### Phase 3: Rebrand to Vero, unified app shell, landing → app flow ✅ *Implemented 26 Sep 2026. Steps are in `replenish-guide.md`.*

**Design research:** Awwwards, via `awwwards-mcp` (audited, then run in an isolated Docker container). The most relevant references were **Level2** (fintech dashboard: one accent on quiet dark surfaces, hairline-bordered cards, small labels over big numbers, pill badges, slim left rail) and **invoko** (AI app: whitespace, one deep accent, pill CTAs, a 3-link nav). Their layout ideas were adopted; your existing monochrome palette was kept.

**3.1 Rebrand**

- [x] "TeXel" → "Vero" everywhere in the app (`src/`, metadata with the title template `%s · Vero`, default resume comment, ATS copy, service package name). *(Docs such as README/ARCHITECTURE still say TeXel; see follow-ups.)*
- [x] Logo: `VeroMark`/`VeroLogo` (a check-shaped "V", *vero* = "true", theme-aware) and `app/icon.svg` replacing `favicon.ico`. **Placeholder until you provide final brand assets** (§1 #9).
- [ ] OG image: skipped on purpose. The app is behind sign-in and now `noindex`; the marketing site owns sharing previews.

**3.2 One consistent app shell**

- [x] `AppShell` (`src/components/shell/`) replaces `DashboardNav`, the editor `Header` and `AuthThemeBar` (all deleted). Desktop: a **left sidebar**, a deliberate change from the "top bar" planned above, following the Level2 research, with Resumes · Templates · ATS check · Billing, a **plan card** (usage meters + Upgrade pill, from the new `/api/usage`), "Back to Vero site", theme and user. Mobile: a top bar with a slide-down menu. Signed-out visitors see Templates + ATS check and a "Create free account" card.
- [x] Editor: a compact `EditorHeader` in the same style: logo mark, breadcrumb "Resumes / {name}" with inline rename, **Saving… / Saved** status, ATS check, Download (named after the resume), Compile, shortcuts menu. Mobile: **Code | Preview tabs**, which switch to Preview after a compile.
- [x] Routes regrouped with no URL changes: `(app)` (shell: dashboard, templates, ats, ats/free, billing) and `(editor)` (full-screen editor).
- [x] **Resumes (dashboard):** onboarding for zero resumes (Start from a template · Blank resume · Check an existing resume), resume cards with a menu (Open, Rename, ATS check, Delete **with confirmation**), relative "Edited 3 hours ago", skeleton loading.
- [x] **Templates:** filter **pills** instead of a dropdown; the 8 "Placeholder…" descriptions replaced with real copy.
- [x] **ATS (decluttered):** one "Scan a resume" panel with tabs (my resume / upload), a collapsible job description, a recent-reports list with colour-coded scores; `?project=` preselects a resume. The report page uses the shell (desktop split, mobile single column). The scoring engine is unchanged (Phase 4).
- [x] **Billing:** Free vs **Pro $5.99** (limits from `plans.ts`), comparison table, FAQ; Pro Plus removed from the UI.
- [x] **Billing success:** polls until the webhook activates Pro (≤ 30 s), then confirms. *(Pulled forward from Phase 2.)*
- [x] Empty/loading/error states; branded **404** and **error** pages.

**3.3 Landing → dashboard flow**

- [x] `/` has no mini landing page any more: signed in → `/dashboard`, signed out → `/sign-in`, keeping `?intent=`.
- [x] **Intents** (`src/lib/intents.ts`, whitelisted, unit-tested): `start` · `ats` · `pro` · `template:<id>`. They survive sign-up (Clerk `forceRedirectUrl` → `/dashboard?intent=…`) and `IntentHandler` acts once: open ATS, start Pro checkout, or create the resume from the template.
- [x] Sign-in/up: branded split layout (product promise + "Back to site"); they honour same-site `redirect_url` (open-redirect-safe).
- [x] "Back to site" link in the shell and auth pages; Support link if `NEXT_PUBLIC_SUPPORT_EMAIL` is set.
- [ ] **Landing CTAs (you, in the landing repo):** point them at the app with intents; the exact URLs are in the guide.
- [ ] Terms/Privacy footer links: wait for the legal pages (Phase 6).

**Verified:** `tsc` clean · `eslint` 0 errors · Vitest 27/27 (5 new intent/redirect tests) · `npm run build` passes · screenshots of the public pages (Templates, free ATS, sign-in/up) at 1440 px and 390 px in dark mode, and the `/?intent=ats` → `/sign-up?intent=ats` redirect. **Signed-in pages were not viewed in a browser** (per your earlier preference); see the guide's checklist.

**Follow-ups found in Phase 3** (by priority):
- [ ] **(Medium, you)** Final Vero logo/brand assets; the current mark is a placeholder.
- [ ] **(Medium, Phase 4)** `/ats/free` still uses a raw file input and pro-locked teaser copy; it's rebuilt with the anonymous ATS check. Signed-out visitors are sent to sign-up (`intent=ats`) instead of hitting the broken API.
- [ ] **(Low)** Clerk's widget is always dark (`@clerk/themes` `dark`), even in light mode. Switch its theme with `next-themes`.
- [ ] **(Low)** Signed-out visitors to an unknown URL are sent to sign-in (the middleware protects all non-public paths) instead of the 404 page. Signed-in users get the 404.
- [ ] **(Low)** Docs (`README.md`, `ARCHITECTURE.md`, `GUIDE.md`, deployment docs) still say TeXel and describe the old structure.
- [ ] **(Low)** Resume cards show a generic page illustration. Real thumbnails need a stored render of each resume's first page (after the PDF storage work).
- [x] **(Low, Phase 5)** The editor autosaves once right after opening (content load triggers the debounce). Harmless, but a wasted write. *Fixed in Phase 5: autosave skips content that matches the last saved text.*

### Phase 3.4: Marketing site in this repo, then its rework (≈3–4 days)

**Setup ✅ (26 Sep 2026)**
- [x] Imported `TeXel-Landing` into `marketing/` **with its history** (`git subtree`, local commit `40f86d4`; its 7 commits are `HEAD^2`). It builds from the new location.
- [x] `marketing/vercel.json` and `latex-ai-editor/vercel.json` now have `ignoreCommand`, so each Vercel project only builds when its own folder changes (the app also ignores `latex-service/`). `railway.toml` has `watchPatterns`, so Railway only rebuilds the compile image when `latex-service/` changes. Marketing dev runs on **port 3001**.
- [ ] **You:** push; reconnect the marketing Vercel project to `sehajmakkar/LaTex` with Root Directory `marketing`; set the app project's Root Directory to `latex-ai-editor` if it isn't already; archive the `TeXel-Landing` GitHub repo once the new deploy works (steps in the guide).

**Decisions (from you):** keep every section. Testimonials stay and get **real quotes from friends**. The company logos stay because they build conviction (people build resumes to get into these companies), but their **wording** changes. Adding sections and marketing/SEO content is welcome. Look at Awwwards again when this phase starts.

**Rework, round 1 ✅ (26 Sep 2026)** (existing design kept as is; a first attempt with a redesign was reverted at your request)
- [x] Rebrand TeXel → **Vero** (navbar, footer, metadata, pricing, testimonial and CTA copy).
- [x] **Every button goes to its place in the dashboard**, login first and then the intended page (from `marketing/lib/site.ts`, `NEXT_PUBLIC_APP_URL`, default `https://hirex-omega.vercel.app`):
  - Get Started / Start Writing Free → `/sign-up?intent=start` (Resumes).
  - ATS buttons (features card, new ATS section, footer) → `/sign-up?intent=ats` (ATS page after login).
  - Upgrade to Pro → `/sign-up?intent=pro` (straight to Dodo checkout after login).
  - Log in → `/sign-in`; footer Templates → `/templates`.
  - "See how it works" → `#features`.
- [x] **Pricing = the dashboard's billing page:** Free $0 (3 resumes, every template, 40 AI edits/month, ATS check, PDF) and **Pro $5.99/month, tax included** (unlimited resumes, 1,000 AI edits/month, new AI features first, cancel anytime). The Teams card was dropped for parity.
- [x] New **FAQ** section (8 questions) with FAQ structured data; **FAQ** added to the navbar.
- [x] New **Free ATS check** CTA section (after Features).
- [x] **SEO:**
  - metadata (title, description, keywords, canonical, Open Graph, Twitter);
  - author/creator **Sehaj**; the `generator: v0.app` tag removed; package renamed `vero-marketing`;
  - JSON-LD (`SoftwareApplication` with Free and Pro offers, plus `FAQPage`);
  - `robots.txt` (Vercel previews blocked) and `sitemap.xml`;
  - generated share image; Vero favicon and Apple icon.
- [x] Fixed: the old favicons were **base64 text saved as .png/.svg** (a v0 export artifact), so browsers couldn't show them. They're replaced.
- [x] No dependency changes. `npm run build` passes; in a browser every button resolves correctly and there are no console errors (a local 404 for `/_vercel/insights/script.js` is expected; it only exists on Vercel).

**Still to do** (by priority):
- [ ] **(High, you, before launch)** Replace the testimonials with real ones (your decision: the current ones stay until then). Before launch, also replace the hero's "Trusted by 10,000+" with the 5.0 stars and stock avatars, and the CTA's "Join thousands…", since those are claims too.
- [ ] **(Medium)** Footer `#` links with no destination yet: About, Blog, Careers, Privacy, Terms, Security, social icons, and Contact until `NEXT_PUBLIC_CONTACT_EMAIL` is set. Privacy and Terms come with Phase 6.
- [ ] **(Medium, Phase 4)** Point the ATS buttons straight to the anonymous `/ats/free` once it works without sign-up.
- [ ] **(Medium, Phase 6)** Set `NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_APP_URL` to the real domain.
- [ ] **(Low)** Company logos: word them as aspiration (not integration) and add a not-affiliated note; use official brand-kit assets.
- [ ] **(Low)** `next.config.mjs` still has `ignoreBuildErrors: true` (no errors today), and the site runs React 18 with Next 16 (Next expects React 19). Clean up later with the ~30 unused v0 components.
- [ ] **(Later)** Awwwards-led design pass; per-template SEO pages.

---

### Phase 4: Rebuild ATS ✅ *Implemented 26 Sep 2026. Steps are in `replenish-guide.md`.*

**Research**:
- Screening is now **two layers**:
  1. the classic parser + keyword filter (Workday, Taleo, iCIMS, Greenhouse, Lever), which fails on columns, tables, text boxes, headers/footers and non-standard headings;
  2. **AI semantic matching** that ranks the survivors (Workday; Greenhouse since Feb 2026).
- Jobscan weights **hard skills** most, then title, education/years, soft skills; target **75–80%**.
- ResumeWorded-style reports: a category rail (Top fixes / Completed, scored /10), a detail panel, and the resume alongside.

**Decision (from you):** the ATS check needs sign-in (sign-up is the conversion step); details are gated for Free. `/ats/free` now redirects: signed-in → `/ats`, signed-out → `/sign-up?intent=ats`. This replaces the earlier "anonymous check" idea.

**Engine** (`src/services/ats/`, replaces the old rule-based/LLM services)
- [x] **One pipeline for every source:** a project is **compiled to PDF first** (the file an employer receives), so projects and uploads (PDF, DOCX, TXT) go through the same steps. Magic-byte checks on uploads.
- [x] **Extraction with layout signals:**
  - PDF text rebuilt line by line from item positions;
  - **multi-column detection** (many rows starting at one fixed x past 30% of the width), tuned on our sidebar templates: both flagged, no false positives on single-column ones;
  - icon-font glyphs, pages, text layer; DOCX tables and images.
- [x] **ATS-style parse** ("What the ATS sees"):
  - contact details, including a phone rule that never takes a date range;
  - **section synonyms** (Work Experience = Experience…), with unrecognised headings flagged;
  - roles with dates and bullets (multi-line merged), education, skills;
  - years of experience with overlaps merged.
- [x] **11 rule-based categories, scored /10**, free and unlimited:
  - ATS parsing: Contact, Section headings, Dates, Layout & file;
  - Impact: Quantified impact, Action verbs (past and present tense), Repetition;
  - Brevity & style: Length, Bullet length, Buzzwords & filler, Unnecessary sections.
- [x] **AI layer** (`gemini-3.6-flash`, two parallel calls, JSON schemas, user text treated as data):
  - **Content review:** summary, strengths, **Bullet strength** (the weakest bullets, by number, with issues, rewrite and a **ready-made ⌘K prompt**; rewrites that invent numbers are dropped), and spelling/grammar kept only if it really appears in the resume.
  - **Job match** from a JD or a **target role**: requirements with kind and importance, then **code re-verifies every match**. Exact/synonym matches via a skills dictionary; "semantic" only if the AI's quoted evidence exists in the resume.
- [x] **Scores:**
  - **ATS score** 0–100 = parsing 40% + impact 35% + style 25%.
  - **Job match %** = hard/tool skills weighted 3 (required) / 1.5 (preferred), certifications and education 2/1, soft skills 1/0.5, semantic = 75% credit, title 15%, a years shortfall costs up to 10.
  - Keyword-only fallback when the AI doesn't run.
- [x] **Plans:** the rule-based check is always free and unlimited. The **AI review is Free 5 / Pro 60 per month** (`plans.ts`, counted in `user_usage.ats_scans`); past the quota → rule-based plus keyword match, with an upgrade prompt. A failed AI call isn't charged.
- [x] **Gating on the server** (`redact.ts`): Free sees all scores, findings and the parse view, plus the **first 2 rewrites/prompts, the first 5 missing keywords and 3 list items**. The rest is removed before the response is sent and shows blurred with "Unlock with Pro".

**UI**
- [x] `/ats`:
  - choose one of your resumes (compiled) or drag-and-drop a file;
  - **job description** or **target role**;
  - progress steps; "AI review · X of 5 left this month";
  - recent reports with score and match %.
- [x] `/ats/[id]` rebuilt (ResumeWorded-style):
  - header with **Open in editor / New check**;
  - score strip (ATS score, ATS parsing / Impact / Style, Job match);
  - left rail **Top fixes / Completed** with /10 badges;
  - detail panels (Overview with summary, strengths, "Fix these first" and **What the ATS sees**; each category; **Job match** with required/preferred, evidence, title and years);
  - **PDF preview on the right**: a project scan shows its compiled PDF, not LaTeX;
  - mobile section picker; old reports show "run a new check".
- [x] **Fix in editor:** opens the project, **finds the bullet in the LaTeX source** (word overlap, LaTeX stripped), selects it and **opens ⌘K with the prompt pre-filled**. If it can't be found, the prompt is copied with a hint. Uploaded files get **Copy prompt**.
- [x] Fixed on the way: the editor mounted **two CodeMirror instances** (the hidden mobile one plus desktop); it now renders only the one for the screen size. The compile logic moved into `compile-service.ts` (shared by `/api/compile` and ATS), and a busy compiler now returns a clear 503.

**Verified:**
- Vitest **43/43** (16 new: parser, phone vs dates, alias matching, **fabricated-evidence rejection**, rules, **redaction**, bullet locator).
- Engine run on 5 compiled templates (column detection, parse quality).
- AI run on the default resume + JD (6.2 s; sensible rewrites with [X]; real typos found; CI/CD matched via "continuous delivery").
- **End-to-end API through the dev server, 10/10:** project scan, redaction, compiled-PDF preview, two-column upload, DOCX + role, fake PDF rejected, quota fallback, usage, access control.
- `tsc`, ESLint (0 errors) and build pass.

**Follow-ups found in Phase 4** (by priority):
- [ ] **(Medium, you)** Browser check of the new report page and **Fix in editor**: the ⌘K pre-fill relies on the editor extension's DOM, so check it once.
- [ ] **(Medium)** The job-match % varies between runs for the same resume and JD (78% vs 65% seen), because the AI's requirement list differs. Rule-based scores are deterministic. Options: cache the JD requirements per JD hash, or use temperature 0 for extraction.
- [ ] **(Medium)** Parser heuristics: for some templates the title and company come out merged or swapped (e.g. "Software Engineer Company Name"); location isn't found when written without a comma. Improve with more sample resumes (collect anonymised real PDFs).
- [ ] **(Medium, Phase 7)** Uploaded resumes can't use one-click fixes. "Import into Vero" (PDF/DOCX → template) would unlock them, and it's the P1 importer.
- [ ] **(Low)** The per-minute scan limit is in memory (same as ⌘K); move it to Upstash later.
- [ ] **(Low)** Old v1 reports can't be shown in the new layout (they show "run a new check"). Delete them in a later migration.
- [ ] **(Low)** Marketing: the ATS CTAs can stay on `/sign-up?intent=ats` (sign-in is required by design now).

### Phase 5: AI command bar, the third way to edit (≈6–8 days)

✅ *Implemented 26 Sep 2026. Unit tests 68/68 (incl. 6 headless editor-review tests), eval **60/60**, end-to-end API 13/14 (the miss is the 10 s target, at 10.5 s). Steps are in `replenish-guide.md`.*

Users then have three ways to edit: **(1) code by hand, (2) inline ⌘K on a selection, (3) a chat-style command bar**.

**UX** (`src/components/editor/CommandBar.tsx`, `src/hooks/use-ai-commands.ts`)

- [x] A floating input at the bottom centre of the code pane (⌘I focuses it). It sits over the editor, not across both panes, so the PDF stays visible. Placeholder: *"Ask Vero to edit your resume… ⌘I"*.
- [x] Scope menu: **Whole resume** (default) · **Selected text** (picked automatically when text is selected as you focus the bar) · each **section** parsed from `\section{}`/`\section*{}`.
- [x] Quick actions when the input is empty: *Tailor to a job* (opens a JD box) · *Stronger bullets* · *Fit on one page* · *Fix compile error* (only after a failed compile, and sends the log).
- [x] The answer appears in a collapsible conversation panel; **the diff is shown inline in the code editor** (`@codemirror/merge` unified view, green/red, unchanged stretches collapsed) with **Keep / Undo on every change** plus **Keep all / Undo all**. Like ⌘K, **Compile works during a review**: it previews the AI version without saving it, and Undo re-renders the original. Autosave pauses during a review. On mobile the editor stays mounted, so switching to Preview keeps the diff.
- [x] After keeping changes: a version snapshot of the pre-AI text is saved, the resume saves and **recompiles automatically**, and if that compile fails the log is sent back to the AI **once** for a fix.
- [x] Conversation is stored per resume (last 30 shown); **version history** menu restores snapshots (the current text is snapshotted first); **⌘Z** undoes an applied AI change.
- [x] Plan card and billing page show AI command usage and limits; the marketing pricing matches.

**Backend**

- [x] `POST /api/ai/command` returns plain JSON (not SSE: a command takes ~4 s on average, like ⌘K). Input: document (≤ 60k chars), instruction (≤ 1,000), scope, last 8 messages, optional JD (≤ 10k) and compile log. The model returns `{message, edits:[{find, replace}]}` (JSON schema, `gemini-3.6-flash`, thinking LOW, 45 s timeout).
- [x] **Every edit is verified server-side** (`src/services/ai/command-edits.ts`): `find` must occur exactly once, lie inside the scope, not overlap another edit; the preamble is editable only for layout/font/spacing/package requests or compile fixes; deletions need a delete/shorten intent and must be balanced; replacements pass the ⌘K validator (dangerous commands, balance, escaping, **no invented numbers**; layout lengths like `0.5in` are allowed now); **no job-description skills the resume doesn't show** (Kubernetes etc. get suggested in the message instead); blocked packages (`shellesc`, `minted`, `luacode`, …); no system-prompt text. Rejected edits go back to the model once with the reasons; any still invalid are dropped and counted as "skipped".
- [x] The client re-locates edits if the user typed while the AI was working, and drops the ones that no longer match.
- [x] Tables `ai_messages` (role, content, edits JSON, status pending/accepted/partial/rejected) and `project_versions` (snapshots, pruned to the plan's allowance), plus `user_usage.ai_commands`. Applied with `drizzle/manual/2026-09-26-ai-command-bar.sql` (additive).
- [x] Routes: `PATCH /api/ai/command/[messageId]` (status), `GET /api/projects/[id]/ai-messages`, `GET|POST /api/projects/[id]/versions`, `GET /api/projects/[id]/versions/[versionId]`. All check ownership.
- [x] Metering from `plans.ts`: Free **10/month**, Pro **120/month**, burst 6/10 per minute; 429 with Upgrade. Versions kept: Free 3, Pro 100. Every call logs `{event:"ai_command", scope, edits, skipped, skippedReasons, attempts, ms, tokens}`.
- [x] Evals (`scripts/eval-command.ts`): 20 instructions × 3 templates, checking that the result compiles on Railway, scoped commands change nothing outside the scope, no new numbers or job-only skills appear, attacks add nothing dangerous, questions get no edits, and broken documents get fixed. **60/60** on `gemini-3.6-flash` (avg 4.0 s, p90 6.3 s, ~1.2k in / ~0.43k out tokens ≈ $0.005 per command at 2027 prices).

**Follow-ups found while testing Phase 5** (by priority):
- [ ] **(Medium, Phase 5)** "Done when" timing: *add a Projects entry → diff → keep → PDF* took **10.5 s** through the local dev server (8.4 s AI + 2.1 s compile), just over the ~10 s target; direct calls average 4 s. Measure on Vercel production; if it's still slow, stream the message first (SSE) or try thinking MINIMAL.
- [ ] **(Medium, 1.2)** Signed-out calls to the new routes get the HTML 404 page instead of JSON 401 (same middleware issue as B15).
- [ ] **(Low)** `gemini-3.1-flash-lite` is **not** good enough for the command bar: in 30 eval cases it failed 6 (it can't copy `find` text exactly, and once wrote the system prompt into the resume, which the new leak guard now blocks). Keep 3.6-flash.
- [ ] **(Low)** Pro version history is "keep the last 100" rather than §7's "unlimited, 90 days". There's no manual **Save version** button yet (snapshots happen before AI changes and before restores).
- [ ] **(Low)** `ai_messages` grows without limit per resume; prune to the last ~100 per project, and add "Clear conversation".
- [ ] **(Low)** The eval checks safety, scope and compiling, not writing quality (the 1.4 LLM-judge item still applies). Seen: "Rewrite this with a stronger verb" on a finance bullet turned "Deliver" into "Provide strategic".
- [ ] **(Low)** Browser check of the command bar, diff styling (light/dark), and mobile layout still needed (see guide).

**Later extension (Phase 7):** click on the PDF to select that part of the source (SyncTeX + pdf.js viewer), so "change *this*" works by pointing.

**Done when:** you can type "add a Projects entry for Vero, built with Next.js and Gemini", see a diff, accept, and get a recompiled PDF in under about 10 s, with limits enforced. *(All true except the timing: 10.5 s on the dev server, see the follow-up.)*

---



### Phase 6: Production launch (≈3–4 days)

- [ ] Environments: Neon `prod` branch (or a new DB), Clerk **prod**, Dodo **live**, R2 prod bucket, compile service prod secret. Keep `.env.example` in sync with `env.ts`, including the `GEMINI_API_KEY` and `GEMINI_MODEL` names (it currently says `OPENAI_API_KEY`).
- [ ] Make required env vars actually required in `env.ts` for production (e.g. `DATABASE_URL`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`), so a bad deploy fails at build time rather than at runtime.
- [ ] Vercel project `vero-app`, custom domain `app.<domain>`, env vars, `vercel.json` durations (AI command ~60 s).
- [ ] Run `db:migrate` against prod (use migrations, not `push`).
- [ ] Observability: Sentry (free tier) for app and service errors, Vercel Analytics (already present), uptime check on `/health` and `/api/health` (Better Stack / UptimeRobot free).
- [ ] Legal pages: Terms, Privacy (states that resumes are sent to Google Gemini and stored in Neon/R2), Refunds. Also a data-deletion path: deleting the Clerk user cascades to the DB and removes R2 files.
- [ ] Security pass: run `/security-review` on the branch, check the ownership checks on every `/api/*`, and add upload magic-byte checks.
- [ ] Launch checklist: real payment with a live card (then refund it), sign-up from the landing page on a phone, and a compile when the service is cold.

**Done when:** a stranger can go landing → sign up → build a resume → pay → download, on the production domain.

---



### Phase 7: Features to compete (post-launch, pick by priority)

Based on Overleaf, Rezi, Teal, Jobscan, Enhancv, FlowCV, and Kickresume:


| Priority | Feature                                                                                                                                                 | Why it matters                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| P1       | **Import an existing resume → LaTeX template** (PDF/DOCX → structured JSON via Gemini → fill a chosen template)                                         | The best onboarding hook: most people arrive with a resume already. The ATS upload pipeline already extracts text. |
| P1       | **Tailor to a job**: paste a JD → creates a tailored copy of the resume, runs the command bar with a tailoring prompt, and shows the match-score change | The core loop for job seekers. Jobscan and Teal charge for this.                                                   |
| P1       | **Version history and duplicate project**                                                                                                               | Needed before people trust AI edits. Tables from Phase 5.                                                          |
| P2       | **Cover letter generator** (resume + JD → LaTeX letter in a matching style)                                                                             | Cheap to build on top of the same stack                                                                            |
| P2       | **Share link / public resume URL** (read-only PDF page, view count)                                                                                     | Growth: every shared resume advertises Vero                                                                        |
| P2       | **PDF click-to-source** (SyncTeX + pdf.js) and **fit-to-one-page** helper                                                                               | Differentiators that non-LaTeX builders can't match                                                                |
| P2       | Spell/grammar check in the editor                                                                                                                       | Expected baseline                                                                                                  |
| P3       | Multi-file projects / file tree, image upload (from `improvement-scope.md`)                                                                             | Needed for academic documents beyond resumes                                                                       |
| P3       | LaTeX autocomplete improvements, better inline ⌘K box (Cursor-like)                                                                                     | From `improvement-scope.md`                                                                                        |
| P3       | Job application tracker                                                                                                                                 | Teal's main hook; large scope                                                                                      |


---



## 4. Suggested timeline


| Week | Work                                                                |
| ---- | ------------------------------------------------------------------- |
| 1    | Phase 0, Phase 1 (compile service live), Phase 2 (billing verified) |
| 2    | Phase 3 (Vero rebrand, app shell, onboarding flow)                  |
| 3    | Phase 4 (ATS rebuild)                                               |
| 4    | Phase 5 (AI command bar)                                            |
| 5    | Phase 6 (launch)                                                    |
| 6+   | Phase 7, starting with Import + Tailor                              |


---



## 5. Cost at launch (rough, per month)


| Service                  | Cost                                                  |
| ------------------------ | ----------------------------------------------------- |
| Vercel Pro               | $20 (Hobby is $0 but non-commercial)                  |
| Compile service          | $0–1 on Cloud Run / ~$5 on Railway Hobby              |
| Neon                     | $0 (free tier) until you need more storage or compute |
| Clerk                    | $0 up to its free MAU limit                           |
| Gemini Flash (paid tier) | A few $ at low volume; limited by per-plan usage caps |
| R2                       | ~$0 (10 GB free, no egress fees)                      |
| Dodo                     | Per-transaction fee only                              |
| Domain                   | ~$10–15/yr                                            |


---



## 6. Decisions I need from you

1. ~~Pricing and limits~~ ✅ Decided: **Free** and **Pro $5.99/mo** (tax-inclusive). Limits are set from the cost model in §7 and go into `src/lib/plans.ts`.
2. ~~Compile host~~ ✅ Railway.
3. **ATS for signed-out users:** confirm it should be fully anonymous (with captcha + IP limit), rather than "upload free, sign in to see the report".
4. **Domain name** for Vero.
5. **Existing users in the DB:** keep or wipe?

---



## 7. Cost model and plan limits (decided 26 Sep 2026)



### Gemini cost per action (paid tier, from ai.google.dev/pricing)

`gemini-3.6-flash` costs $0.75 in / $3.75 out per 1M tokens **until 31 Dec 2026, then doubles** to $1.50 / $7.50. `gemini-3.1-flash-lite` costs $0.25 / $1.50. The figures below use the **2027 prices** so the limits still hold after the increase. Output tokens include "thinking" (~100–500 per call).


| Action                             | Tokens (in / out) | Model             | Cost per action                  |
| ---------------------------------- | ----------------- | ----------------- | -------------------------------- |
| Inline ⌘K edit                     | ~1.5k / ~350      | 3.1-flash-lite    | **~$0.001** (3.6-flash: ~$0.005) |
| AI command bar (whole resume)      | ~8k / ~1.5k       | 3.6-flash         | **~$0.024** (measured in the Phase 5 eval: ~1.2k / ~0.43k on a template, ≈ $0.005; real resumes are longer) |
| ATS AI content review              | ~4.5k / ~2.5k     | 3.6-flash         | **~$0.026**                      |
| ATS JD skill extraction            | ~1.5k / ~500      | 3.1-flash-lite    | ~$0.001                          |
| ATS parse check + keyword matching | —                 | none (rule-based) | **$0**                           |
| Compile (Railway, ~1 s CPU)        | —                 | —                 | ≈ $0.0001                        |




### Revenue per Pro user

$5.99, tax included. Minus tax (0–20% depending on country, roughly $0.55 on average) and the Dodo Merchant-of-Record fee (roughly 4–5% + $0.40, so about $0.70), that leaves **about $4.70 net per Pro user per month**.
Fixed costs: Vercel Pro $20 + Railway about $5–10 + domain, so **about $30/mo, and ~7 Pro users cover them**.

Rule of thumb: a Pro user who hits **every** cap still costs less than the net revenue, and a free user at the caps costs under ~$0.40/month. Because resume work is bursty (one intense session, then weeks of nothing), limits are **monthly**, with a small daily/minute burst guard against scripts. Daily limits would frustrate someone in the middle of a session.

### Limits


|                                        | Free                                                                       | Pro ($5.99/mo)                      |
| -------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| Resumes / projects                     | **3**                                                                      | Unlimited (soft cap 100)            |
| Compiles                               | 300/month, burst 20/min                                                    | Unlimited (fair use), burst 30/min  |
| Inline AI edits (⌘K)                   | **40/month**                                                               | **1,000/month**                     |
| AI command bar (Phase 5)               | **10/month**                                                               | **120/month**                       |
| ATS parse check + job keyword match    | **Unlimited** (rule-based, costs $0). Anonymous: 10/day per IP + Turnstile | Unlimited                           |
| ATS AI content review                  | **5/month**; needs sign-in (the conversion hook)                           | **60/month**                        |
| Version history (Phase 5)              | Last 3 snapshots                                                           | Unlimited, 90 days                  |
| Tailor to job / cover letter (Phase 7) | 1 free try                                                                 | ✅ (counts toward command-bar quota) |
| Download PDF, all templates            | ✅                                                                          | ✅                                   |


**Worst case per month (2027 prices):**

- Free user at every cap: 40×$0.001 + 10×$0.024 + 5×$0.027 ≈ **$0.42**. A typical free user is expected to cost under $0.10.
- Pro user at every cap: 1,000×$0.001 + 120×$0.024 + 60×$0.027 ≈ **$5.50**, just above the $4.70 net. Real usage is usually 10–20% of the caps, about $0.60–1.10. At 2026 prices the worst case is about half.
- If the eval forces ⌘K onto 3.6-flash, cut Pro inline edits to 500/month.

**Where it lives:** `src/lib/plans.ts` (a single source for server checks and the pricing page), plus monthly counters in `user_usage` (add a `period` column or a monthly roll-up). Log tokens per request (Phase 1.4) and **review the caps after 2–4 weeks of real usage**.

**Before launch:** turn on billing for the Gemini project. The free tier has low rate limits, and its data may be used to improve Google's products.