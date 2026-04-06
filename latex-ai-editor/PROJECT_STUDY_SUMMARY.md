# TeXel Project Study Summary

_Last reviewed: 5 April 2026_

## 1) What this project is

TeXel is a full-stack Next.js app for creating and editing LaTeX resumes/documents with:
- a CodeMirror-based editor,
- server-side compile to PDF,
- AI inline rewrite suggestions,
- ATS scoring workflows,
- auth + billing + usage limits.

The app is primarily a monolith (`src/app` API routes + UI), with an **optional external LaTeX microservice** in `latex-service/` for production deployment.

---

## 2) High-level runtime architecture

## Browser/UI layer
- Pages in `src/app/**/page.tsx`
- Client editor/preview in `src/components/editor/*` and `src/components/preview/PdfPreview.tsx`
- Global providers in `src/components/providers.tsx` (React Query + theme + toasts)

## App/API layer (Next.js route handlers)
- `/api/compile` -> compile LaTeX and return `pdfUrl` data URL
- `/api/ai/edit` -> stream AI rewrite chunks (SSE)
- `/api/projects*` -> CRUD for user projects
- `/api/templates*` -> template list/content generation
- `/api/ats/*` -> upload + analyze + report retrieval
- `/api/billing/*` + `/api/webhooks/dodo` -> billing and webhook sync

## Domain/data layer
- Services in `src/services/*`
- Repositories in `src/repositories/*`
- Drizzle schema + DB client in `src/lib/db/*`

## Integrations
- Clerk auth (`@clerk/nextjs`)
- Gemini (`@google/generative-ai`) for AI edit + ATS quality scoring
- Dodo Payments for checkout/webhook billing state
- Optional Cloudflare R2 via S3 API for ATS original resume storage

---

## 3) Request/feature flows (how it works end-to-end)

## A) Project dashboard and editor
1. User signs in (Clerk middleware protects dashboard routes).
2. `GET /api/projects` loads user projects and plan.
3. Opening `/project/[id]` fetches project content via `GET /api/projects/[id]`.
4. Editor updates local state; autosave sends `PATCH /api/projects/[id]` (debounced).
5. Compile button sends `POST /api/compile`; returned base64 PDF is shown in iframe preview.

Key files:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/project/[id]/page.tsx`
- `src/components/editor/CodeMirrorEditor.tsx`
- `src/components/shared/Header.tsx`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/compile/route.ts`

## B) AI inline edit in CodeMirror
1. User selects text in editor and triggers `Mod-k`.
2. Client sends prompt + selection/context to `POST /api/ai/edit`.
3. Route calls `aiService.streamEdit()` and returns SSE stream.
4. Editor extension applies streamed suggestion; `Mod-y` accepts, `Mod-u` rejects.

Key files:
- `src/components/editor/CodeMirrorEditor.tsx`
- `src/app/api/ai/edit/route.ts`
- `src/services/ai-service.ts`

## C) ATS flow (project scan or uploaded file)
1. User opens ATS page and either:
   - selects existing project, or
   - uploads PDF/DOCX/TXT resume.
2. Upload route extracts text (`pdf-parse`, `mammoth`, plain text) and can store original file in R2.
3. Analyze route enforces free-plan daily scan limit, computes:
   - rule-based parse score,
   - LLM quality score,
   - combined score and suggestions,
   then saves report to DB.
4. ATS report page fetches report detail and billing plan for gated display.

Key files:
- `src/app/(dashboard)/ats/page.tsx`
- `src/app/(dashboard)/ats/[id]/page.tsx`
- `src/app/ats/free/page.tsx`
- `src/app/api/ats/upload/route.ts`
- `src/app/api/ats/analyze/route.ts`
- `src/app/api/ats/reports/route.ts`
- `src/app/api/ats/reports/[id]/route.ts`
- `src/services/ats/*`
- `src/services/storage/r2.ts`

## D) Billing flow
1. Billing page reads current plan from `GET /api/billing/me`.
2. Upgrade initiates `POST /api/billing/checkout` (Dodo checkout session).
3. User completes payment on hosted checkout.
4. Dodo webhook (`/api/webhooks/dodo`) verifies signature, maps subscription/product to internal plan, updates user row.

Key files:
- `src/app/(dashboard)/billing/page.tsx`
- `src/app/api/billing/me/route.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/webhooks/dodo/route.ts`
- `src/lib/dodo.ts`
- `src/lib/billing-config.ts`

---

## 4) Source tree responsibilities (folder-by-folder)

## Root configuration/docs
- `package.json` -> scripts/dependencies (Next 16, React 19, Drizzle, Clerk, Gemini, etc.)
- `tsconfig.json` -> strict TS, `@/*` alias
- `next.config.ts` -> external server packages (`pdf-parse`, `pdfjs-dist`), cloudinary image host
- `drizzle.config.ts` -> DB schema path + migration output
- `README.md`, `GUIDE.md`, `ARCHITECTURE.md` -> setup/architecture docs
- `deployment-plan.md`, `deployment-guide.md` -> production topology guidance

## `src/app/`
- App Router pages + API endpoints.
- Route groups:
  - `(dashboard)` for authenticated product pages
  - auth pages (`sign-in`, `sign-up`)
  - public pages (`/`, `/templates`, `/ats/free`)

## `src/components/`
- `editor/` -> CodeMirror integration and UX
- `preview/` -> PDF iframe preview
- `ats/` -> report visual components (score slider, suggestion list, etc.)
- `templates/` -> template cards and “use template” dialog
- `shared/` -> nav/header/theme/auth helpers
- `ui/` -> shadcn primitives

## `src/services/`
- `project-service.ts` -> project business logic + ownership checks
- `user-service.ts` -> user ensure/get + free project limit checks
- `template-service.ts` -> template retrieval + variable substitution
- `ai-service.ts` -> Gemini edit generation/streaming
- `ats/*` -> ATS extraction + scoring orchestration
- `storage/r2.ts` -> optional object storage operations

## `src/repositories/`
- DB access only (Drizzle queries/inserts/updates).
- Includes project, user, usage, ATS report persistence.

## `src/lib/`
- `db/` -> schema + client
- `env.ts` -> runtime env validation
- `constants.ts` -> default LaTeX, compile and quota constants
- `errors.ts` -> typed app error classes
- billing + integration helper modules

## `src/templates/`
- Resume template registry and tagged manifests.
- `index.ts` is the source of truth for exposed templates.

## `latex-service/` (separate microservice)
- Express service to compile TeX to PDF in Dockerized TeX Live environment.
- Useful for production platforms where `pdflatex` is unavailable in serverless runtime.

## `docker/`
- Local Docker setup for PostgreSQL and TeX Live test container.

---

## 5) Data model (Drizzle / Postgres)

Defined in `src/lib/db/schema.ts`:
- `users`
  - Clerk user ID, plan, payment/customer/subscription fields
- `projects`
  - LaTeX source content per user
- `compilations`
  - compile result metadata (status/log/pdfUrl, duration)
  - currently schema exists though compile route does not persist compile rows
- `user_usage`
  - daily counters (`compiles`, `ai_edits`, `ats_scans`)
- `ats_reports`
  - full ATS report JSON + source metadata and optional stored file key

---

## 6) Auth and access control

- Middleware in `src/middleware.ts` protects all non-public routes using Clerk.
- Public paths include `/`, `/templates`, `/ats/free`, sign-in/up, and webhook path.
- API handlers that require identity still validate `auth()` and enforce ownership checks.

---

## 7) Environment variables and integration points

Validated in `src/lib/env.ts`.

Important groups:
- Core: `DATABASE_URL`, `NODE_ENV`, `NEXT_PUBLIC_APP_URL`
- AI: `GEMINI_API_KEY` (plus optional `OPENAI_API_KEY` placeholder)
- Auth: Clerk keys
- Billing: Dodo API key/env/webhook key + product IDs
- Storage: R2 endpoint/bucket/credentials

---

## 8) Notable implementation details

1. Compile engine auto-detection in `/api/compile`:
   - TeX directive takes priority (`% !TEX program = ...`)
   - falls back to `lualatex`/`xelatex` based on package usage
   - default `pdflatex`

2. AI streaming:
   - Uses SSE framing and chunked content consumption in editor client.

3. ATS scoring model:
   - Rule-based parsing quality + LLM quality combined as
     `combined = round(parse*0.6 + quality*0.4)`.

4. Freemium controls:
   - project count limit (free) and ATS daily scan limit (free) enforced server-side.

---

## 9) Current status vs docs

- Documentation includes a recommended production split where compile moves to external `latex-service`.
- Current active app route `src/app/api/compile/route.ts` still compiles **locally** using `child_process.spawn`.
- This is fine for local/dev where TeX is installed, but for serverless deployment the route likely needs to proxy to `latex-service` as described in deployment docs.

---

## 10) Quick map of important files

- App shell & providers:
  - `src/app/layout.tsx`
  - `src/components/providers.tsx`
- Home/auth/navigation:
  - `src/app/page.tsx`
  - `src/app/sign-in/[[...sign-in]]/page.tsx`
  - `src/app/sign-up/[[...sign-up]]/page.tsx`
  - `src/components/shared/DashboardNav.tsx`
- Editor core:
  - `src/app/(dashboard)/project/[id]/page.tsx`
  - `src/components/editor/CodeMirrorEditor.tsx`
  - `src/components/preview/PdfPreview.tsx`
  - `src/stores/editor-store.ts`
- API core:
  - `src/app/api/compile/route.ts`
  - `src/app/api/ai/edit/route.ts`
  - `src/app/api/projects/route.ts`
  - `src/app/api/projects/[id]/route.ts`
- ATS:
  - `src/app/api/ats/upload/route.ts`
  - `src/app/api/ats/analyze/route.ts`
  - `src/services/ats/ats-service.ts`
  - `src/services/ats/rule-based-ats.ts`
  - `src/services/ats/llm-ats-service.ts`
- Billing:
  - `src/app/api/billing/checkout/route.ts`
  - `src/app/api/billing/me/route.ts`
  - `src/app/api/webhooks/dodo/route.ts`
- Data:
  - `src/lib/db/schema.ts`
  - `src/lib/db/index.ts`
  - `src/repositories/*`

---

## 11) Practical mental model

If you treat this codebase as modules, it works like:

`UI pages/components` -> `API routes` -> `services` -> `repositories` -> `Drizzle/Postgres`

With side integrations:
- AI (Gemini) for edits + ATS quality
- Clerk for auth/session
- Dodo for payments
- R2 for file object storage
- local/remote TeX engine for PDF compilation

This separation is fairly clean and makes future refactors (like extracting compile as a dedicated service) straightforward.
