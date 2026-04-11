# LaTeX / TeXel — Monorepo Overview

This repository hosts **TeXel** (branded in-app copy and docs as “TeXel”; the npm package folder is `latex-ai-editor`), a full-stack web application for editing LaTeX—especially resumes—with live PDF preview, optional AI-assisted edits, ATS tooling, and production-oriented deployment patterns.

The **application code** lives under `[latex-ai-editor/](./latex-ai-editor/)`. This root `README.md` summarizes the product, stack, deployment topology, and **LaTeX compilation architecture** so newcomers can orient quickly before diving into the subfolder docs.

---

## What You Get (Product Summary)

TeXel is an AI-aware LaTeX workspace: a browser editor backed by a Next.js API, PostgreSQL persistence, and a compile pipeline that turns `.tex` source into a previewable PDF. It is designed so the main app can run on typical serverless hosts while **heavy TeX compilation** can run in a separate container or VM where TeX Live is installed.

---

## Features


| Area                 | Description                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LaTeX editor**     | CodeMirror 6 with LaTeX language support, editing UX tuned for documents and resumes.                                                                   |
| **PDF preview**      | Server-side compile produces a PDF; the client displays it (data URL / iframe preview pattern).                                                         |
| **Autosave**         | Project content is persisted; debounced saves reduce chatter while typing.                                                                              |
| **Compile engines**  | Supports `pdflatex`, `xelatex`, and `lualatex` with **automatic engine detection** from source (magic comments and package heuristics).                 |
| **AI inline edit**   | Select text, trigger inline AI (e.g. ⌘K / Ctrl+K), stream suggestions into the editor, accept/reject flows. Powered by **Google Gemini** on the server. |
| **Resume templates** | Template catalog with variable substitution to bootstrap new projects.                                                                                  |
| **ATS workflows**    | Upload or analyze project content: extraction, rule-based scoring, LLM-assisted quality scoring, stored reports; free-tier limits where configured.     |
| **Authentication**   | **Clerk** integration for sign-in and protected dashboard routes.                                                                                       |
| **Billing**          | **Dodo Payments** checkout and webhooks to sync subscription/plan state.                                                                                |
| **Object storage**   | **Cloudflare R2** (S3-compatible) for storing originals or related assets where the ATS upload path uses it.                                            |
| **Analytics**        | Vercel Analytics / Speed Insights hooks where enabled in the app.                                                                                       |


Roadmap-style items and deeper UX notes also appear in `[latex-ai-editor/README.md](./latex-ai-editor/README.md)` and `[latex-ai-editor/PROJECT_STUDY_SUMMARY.md](./latex-ai-editor/PROJECT_STUDY_SUMMARY.md)`.

---

## Technology Stack

Values reflect the current `latex-ai-editor` dependency set (check `[latex-ai-editor/package.json](./latex-ai-editor/package.json)` for exact versions).

### Application (`latex-ai-editor/`)

- **Framework**: [Next.js](https://nextjs.org/) (App Router), **React**, **TypeScript**
- **Styling / UI**: **Tailwind CSS**, **shadcn/ui**-style primitives, **Radix**, **lucide-react**
- **Editor**: **CodeMirror 6**, `codemirror-lang-latex`, `@marimo-team/codemirror-ai` for AI-assisted editing
- **Data**: **PostgreSQL** via **Drizzle ORM** (`postgres` driver)
- **Validation / config**: **Zod**, `**@t3-oss/env-nextjs`** for typed environment variables
- **Client state / server state**: **Zustand**, **TanStack React Query**
- **Auth**: **Clerk** (`@clerk/nextjs`)
- **AI**: **Google Generative AI** (`@google/generative-ai`)
- **Payments**: **dodopayments** + **standardwebhooks**
- **Document parsing** (ATS / uploads): **pdf-parse**, **mammoth**, **docx-preview** (where used in UI)
- **Testing**: **Vitest**, **Testing Library**

### LaTeX microservice (`latex-ai-editor/latex-service/`)

- **Runtime**: **Node.js** + **Express**
- **TeX distribution**: **TeX Live** on **Alpine Linux** (multi-stage **Dockerfile** installs `texlive`, XeTeX, LuaTeX, and broad `texmf-dist` packages for real-world documents)

### Local infrastructure (`latex-ai-editor/docker/`)

- **Docker Compose** provides **PostgreSQL** for local development and an optional **TeX Live** image (`Dockerfile.texlive`) for experimentation; see `[latex-ai-editor/docker/docker-compose.yml](./latex-ai-editor/docker/docker-compose.yml)`.

---

## Repository Layout

```
LaTex/                          ← repository root (this README)
└── latex-ai-editor/            ← Next.js app + APIs + UI
    ├── src/                    ← App Router, components, services, repositories
    ├── latex-service/          ← Standalone HTTP compiler (Express + TeX Live Docker)
    ├── docker/                 ← docker-compose (Postgres, optional TeX container)
    ├── drizzle/                ← SQL migrations / Drizzle metadata
    ├── README.md               ← quick start for the app
    ├── ARCHITECTURE.md         ← deep dive (sequences, compile flow)
    ├── deployment-guide.md     ← step-by-step production deploy
    ├── deployment-plan.md      ← alternatives, costs, CI notes
    └── PROJECT_STUDY_SUMMARY.md ← feature map and file index
```

---

## Getting Started (Local Development)

All commands below assume you are in the application directory:

```bash
cd latex-ai-editor
npm install
```

### Database

1. Start Postgres (example using the bundled compose file):
  ```bash
   docker compose -f docker/docker-compose.yml up -d postgres
  ```
2. Set `DATABASE_URL` in your environment (see `[latex-ai-editor/src/lib/env.ts](./latex-ai-editor/src/lib/env.ts)` for validated variables).
3. Push schema:
  ```bash
   npm run db:push
  ```

### Run the dev server

```bash
npm run dev
```

Open the URL printed by Next.js (typically `http://localhost:3000`).

### LaTeX on your machine (local compile path)

If `**LATEX_SERVICE_URL` is not set**, the Next.js route `[src/app/api/compile/route.ts](./latex-ai-editor/src/app/api/compile/route.ts)` runs `pdflatex` / `xelatex` / `lualatex` **on the same machine as the Next.js server** using `child_process.spawn`. You must have a TeX distribution installed (MacTeX, TeX Live, MiKTeX, etc.). The subfolder README lists common install commands.

---

## LaTeX Compilation Service (Architecture)

Compilation is central to TeXel: the browser sends document source to `**POST /api/compile`**, and the API responds with a **base64-backed PDF data URL** plus **engine** and **log** metadata for debugging failed builds.

### Two execution modes

1. **Local (developer / self-hosted)**
  - **Condition**: `LATEX_SERVICE_URL` **unset** in the Next.js environment.  
  - **Behavior**: Next.js creates a unique temp directory, writes `main.tex`, runs the selected LaTeX engine with non-interactive flags, reads `main.pdf`, deletes the workspace, returns JSON.
2. **Remote microservice (production-friendly)**
  - **Condition**: `LATEX_SERVICE_URL` **set** to the base URL of the compiler service (no trailing slash required; the app normalizes it).  
  - **Behavior**: Next.js `**POST {LATEX_SERVICE_URL}/compile`** with JSON `{ content, engine }`. If `LATEX_API_SECRET` is set, it is sent as the `**x-api-secret**` header. The service returns JSON; the app maps that into the same `{ data: { pdfUrl, log, engine } }` shape as local compilation.

This split exists because **serverless platforms (e.g. Vercel) do not ship a full TeX Live tree** in the function runtime. A small **always-on or scale-to-zero container** running TeX Live is the standard production pattern.

### `latex-service` HTTP API

Implemented in `[latex-ai-editor/latex-service/server.js](./latex-ai-editor/latex-service/server.js)`:


| Method / path   | Purpose                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /health`   | Liveness: JSON such as `{ "status": "ok", "texlive": true }`.                                                                                                                                                                                                                                                                                                                  |
| `POST /compile` | Body: `{ "content": "<tex source>", "engine"?: "pdflatex" | "xelatex" | "lualatex" }` (JSON, ~1mb limit on the service). Optional auth: if `LATEX_API_SECRET` is set **on the service**, requests must include header `**x-api-secret`** matching that value. Success: `{ ok: true, engine, log, pdf: "<base64>" }`. Failure: `422` with `log` and `engine` on compile errors. |


The service uses the same **isolated temp directory per job**, `**nonstopmode`**, `**-halt-on-error**`, and **timeout** semantics as the Next.js local compiler (configurable via `COMPILE_TIMEOUT_MS`, default 60s).

### Docker image for the compiler

`[latex-ai-editor/latex-service/Dockerfile](./latex-ai-editor/latex-service/Dockerfile)` builds on **Alpine 3.19**, installs **TeX Live** (including XeTeX and LuaTeX and broad `texmf-dist` packages), adds **Node**, copies `server.js` and `engine-detect.js`, and runs as a **non-root** user. This image is suitable for **Fly.io**, **Railway**, **Render**, or any container host.

`[latex-ai-editor/latex-service/railway.toml](./latex-ai-editor/latex-service/railway.toml)` pins **Dockerfile** deployment and `**/health`** checks for Railway-style hosting.

### Engine detection

Both the Next.js app and the microservice share the idea of **picking an engine** when the client does not force one: magic comments (`% !TEX program = ...`) and heuristics over package usage (see `[latex-ai-editor/src/lib/latex-engine](./latex-ai-editor/src/lib/latex-engine)` and `latex-service/engine-detect.js`).

### Limits (compile API)

Defined in `[latex-ai-editor/src/lib/constants.ts](./latex-ai-editor/src/lib/constants.ts)`:

- **Maximum source size**: **500 KB** (`MAX_CONTENT_SIZE`)
- **Compile timeout**: **60 seconds** (`COMPILE_TIMEOUT_MS`) for the local spawn path; the remote proxy adds a bounded fetch buffer on top for network completion.

### Vercel function timeout

`[latex-ai-editor/vercel.json](./latex-ai-editor/vercel.json)` extends `**maxDuration`** for `src/app/api/compile/route.ts` (and the AI edit route) so proxied compiles have time to round-trip to the microservice within platform limits.

---

## Deployment (Production Topology)

A typical production layout:


| Layer          | Suggested host                                 | Role                                     |
| -------------- | ---------------------------------------------- | ---------------------------------------- |
| Next.js app    | **Vercel** (or any Node host)                  | UI, API routes, auth, AI, DB access      |
| PostgreSQL     | **Neon**, RDS, or managed Postgres             | Drizzle / application data               |
| LaTeX compiler | **Fly.io**, **Railway**, **Render**, ECS, etc. | Dockerized `latex-service` with TeX Live |
| Auth           | **Clerk**                                      | Sessions and social login                |
| AI             | **Google AI Studio** / Gemini                  | API key in server env                    |
| Billing        | **Dodo**                                       | Keys + webhook secret in server env      |
| Storage        | **Cloudflare R2**                              | S3-compatible credentials                |


**Authoritative walkthrough**: `[latex-ai-editor/deployment-guide.md](./latex-ai-editor/deployment-guide.md)` (Neon → compiler service → Vercel env → Clerk → verification). **Broader options and cost notes**: `[latex-ai-editor/deployment-plan.md](./latex-ai-editor/deployment-plan.md)`.

### Environment variables (quick reference)

Server-side variables are validated in `[latex-ai-editor/src/lib/env.ts](./latex-ai-editor/src/lib/env.ts)`. Commonly required for a full production experience:


| Variable                                                 | Used for                                             |
| -------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`                                           | PostgreSQL connection                                |
| `NEXT_PUBLIC_APP_URL`                                    | Public site URL                                      |
| `GEMINI_API_KEY`                                         | AI edit / ATS LLM features                           |
| `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Authentication                                       |
| `LATEX_SERVICE_URL`                                      | When set, `/api/compile` proxies to the microservice |
| `LATEX_API_SECRET`                                       | Shared secret with `latex-service` (`x-api-secret`)  |
| Dodo / R2 variables                                      | Optional billing and object storage                  |


For builds in CI or Vercel when secrets are not injected yet, the app supports `**SKIP_ENV_VALIDATION`** (see `env.ts`) so installs and builds do not fail on missing optional keys—set real values before running in production.

---

## Scripts (inside `latex-ai-editor/`)


| Command                                                        | Purpose                    |
| -------------------------------------------------------------- | -------------------------- |
| `npm run dev`                                                  | Next.js development server |
| `npm run build` / `npm run start`                              | Production build and start |
| `npm run lint`                                                 | ESLint                     |
| `npm run db:push` / `db:generate` / `db:migrate` / `db:studio` | Drizzle schema workflows   |


The microservice: `cd latex-service && npm install && npm start` (port **8080** by default, overridable with `**PORT`**).

---

## Further Reading

- `[latex-ai-editor/README.md](./latex-ai-editor/README.md)` — concise setup and folder map  
- `[latex-ai-editor/ARCHITECTURE.md](./latex-ai-editor/ARCHITECTURE.md)` — diagrams and compile pipeline detail  
- `[latex-ai-editor/GUIDE.md](./latex-ai-editor/GUIDE.md)` — user-oriented guide where present  
- `[latex-ai-editor/PROJECT_STUDY_SUMMARY.md](./latex-ai-editor/PROJECT_STUDY_SUMMARY.md)` — module map and integration list

---

## License

The TeXel application in `latex-ai-editor/` is released under the **MIT** license unless otherwise noted in that subtree.