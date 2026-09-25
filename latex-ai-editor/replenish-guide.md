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
