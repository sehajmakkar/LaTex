# TeXel — Deployment Plan

> End-to-end guide for deploying the LaTeX AI editor to production.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Infrastructure Choices (Recommended)](#2-infrastructure-choices-recommended)
3. [Frontend Deployment (Next.js)](#3-frontend-deployment-nextjs)
4. [Database (PostgreSQL)](#4-database-postgresql)
5. [LaTeX Compilation Service (the big one)](#5-latex-compilation-service)
6. [AI Service (Gemini)](#6-ai-service-gemini)
7. [Authentication (Clerk)](#7-authentication-clerk)
8. [Environment Variables](#8-environment-variables)
9. [CI / CD Pipeline](#9-cicd-pipeline)
10. [Domain, SSL & DNS](#10-domain-ssl--dns)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Cost Estimates](#12-cost-estimates)
13. [Step-by-Step Deployment Walkthrough](#13-step-by-step-deployment-walkthrough)
14. [Scaling Strategy](#14-scaling-strategy)

---

## 1. Architecture Overview

### Current (Local Development)

```
Browser ──► Next.js (localhost:3000) ──► pdflatex / xelatex / lualatex (installed via MacTeX on your machine)
                                    ──► PostgreSQL (Docker, localhost:5432)
                                    ──► Gemini API (remote)
                                    ──► Clerk (remote)
```

**Problem:** The LaTeX TeX Live installation is ~6 GB. You cannot ask every user to install it, and you cannot bundle it inside the Next.js deployment.

### Target (Production)

```
                   ┌────────────────────┐
                   │   Vercel / Cloud    │
  Browser ────────►│   Next.js App       │
                   │   (Frontend + API)  │
                   └───────┬────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌──────────┐    ┌──────────────┐   ┌──────────┐
   │  Neon DB  │    │  LaTeX API   │   │ Gemini   │
   │ Postgres  │    │  (Fly.io /   │   │   API    │
   │ (managed) │    │   Railway)   │   │ (remote) │
   └──────────┘    └──────────────┘   └──────────┘
                          │
                    Docker container
                    with TeX Live
```

**The key insight:** The LaTeX compilation must run on a separate server/container that has TeX Live installed. Your Next.js app calls this service via HTTP.

---

## 2. Infrastructure Choices (Recommended)


| Component                 | Recommended Provider                              | Why                                                                                               |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Frontend + API Routes** | **Vercel** (free tier → Pro $20/mo)               | Native Next.js support, zero-config, global CDN, serverless functions                             |
| **Database**              | **Neon** (free tier → Pro $19/mo)                 | Serverless Postgres, your `.env.example` already has a Neon URL template, branching for dev/stage |
| **LaTeX Compilation**     | **Fly.io** or **Railway**                         | Persistent Docker containers, cheap ($5–15/mo), global regions, easy Docker deploy                |
| **Auth**                  | **Clerk** (already integrated)                    | No changes needed, just switch to production keys                                                 |
| **AI**                    | **Google Gemini** (already integrated)            | No changes needed, just use production API key                                                    |
| **File Storage** (future) | **Cloudinary** (already configured) or **AWS S3** | For storing compiled PDFs if you stop using base64 inline                                         |


### Alternative: All-in-one on Railway / Render

If you prefer managing everything in one place instead of Vercel + Fly.io:


| Component         | Provider                                   |
| ----------------- | ------------------------------------------ |
| Frontend + API    | **Railway** ($5/mo)                        |
| Database          | **Railway Postgres** addon                 |
| LaTeX Compilation | **Railway** (second service, same project) |


---

## 3. Frontend Deployment (Next.js)

### Option A: Vercel (Recommended)

#### Setup Steps

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link your project
cd latex-ai-editor
vercel link

# 3. Set environment variables in Vercel dashboard or CLI
vercel env add DATABASE_URL
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add GEMINI_API_KEY
vercel env add NEXT_PUBLIC_APP_URL
# ... (all vars from .env.example)

# 4. Deploy
vercel --prod
```

#### Important Vercel Configuration

In your `vercel.json` (create this file in the project root):

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "functions": {
    "src/app/api/compile/route.ts": {
      "maxDuration": 65
    },
    "src/app/api/ai/edit/route.ts": {
      "maxDuration": 30
    }
  }
}
```

> [!IMPORTANT]
> The compile route currently calls `pdflatex` directly via `child_process.spawn`. **This will NOT work on Vercel** because Vercel serverless functions don't have TeX Live installed. You need to refactor this route to call an external LaTeX compilation service (see Section 5).

### Option B: Railway / Render (Self-hosted)

```bash
# Railway
npm i -g @railway/cli
railway login
railway init
railway up

# Render
# Use render.yaml blueprint or connect GitHub repo via dashboard
```

---

## 4. Database (PostgreSQL)

### Neon (Recommended — Serverless Postgres)

1. **Sign up** at [neon.tech](https://neon.tech)
2. **Create a project** named `texel-prod`
3. **Copy the connection string** — it looks like:
  ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
  ```
4. **Set it as `DATABASE_URL`** in your deployment environment
5. **Run migrations:**
  ```bash
   # From your local machine (or CI)
   DATABASE_URL="postgresql://..." npm run db:push
  ```

### Migration Strategy

Your current Drizzle setup uses `drizzle-kit push` which directly syncs schema → DB. For production, switch to proper migrations:

```bash
# Generate migration files
npm run db:generate

# Apply migrations to production (run in CI/CD)
DATABASE_URL="postgresql://prod-url..." npm run db:migrate
```

> [!TIP]
> Neon supports **branching** — create a `dev` branch of your DB so you can test migrations safely before applying to production.

---

## 5. LaTeX Compilation Service

This is the most critical and complex part of your deployment. Here are the options, from simplest to most scalable.

---

### Option A: Dedicated Fly.io Service (⭐ Recommended for v1)

**How it works:** Deploy a small HTTP server inside a Docker container that has TeX Live installed. Your Next.js API route calls this server instead of `child_process.spawn`.

#### Step 1: Create the LaTeX Compilation Microservice

Create a new directory `latex-service/` at the project root:

```
latex-ai-editor/
├── latex-service/         ← NEW
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
├── src/
├── docker/
└── ...
```

`**latex-service/package.json`:**

```json
{
  "name": "texel-latex-compiler",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "uuid": "^11.1.0"
  }
}
```

`**latex-service/server.js`:**

```javascript
const express = require("express");
const { spawn } = require("child_process");
const { writeFile, readFile, mkdir, rm } = require("fs/promises");
const { join } = require("path");
const { v4: uuidv4 } = require("uuid");
const os = require("os");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 8080;
const COMPILE_TIMEOUT_MS = parseInt(process.env.COMPILE_TIMEOUT_MS || "60000");
const API_SECRET = process.env.LATEX_API_SECRET; // Simple auth token

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", engine: "texlive" });
});

// Auth middleware
app.use("/compile", (req, res, next) => {
  const token = req.headers["x-api-secret"];
  if (API_SECRET && token !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// Compile endpoint
app.post("/compile", async (req, res) => {
  const { content, engine = "pdflatex" } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Missing content" });
  }

  const validEngines = ["pdflatex", "xelatex", "lualatex"];
  if (!validEngines.includes(engine)) {
    return res.status(400).json({ error: "Invalid engine" });
  }

  const jobId = uuidv4();
  const workDir = join(os.tmpdir(), "latex-compile", jobId);

  try {
    await mkdir(workDir, { recursive: true });
    const texFile = join(workDir, "main.tex");
    await writeFile(texFile, content, "utf-8");

    const result = await compileLatex(workDir, "main.tex", engine);

    if (!result.success) {
      await cleanup(workDir);
      return res.status(422).json({
        error: "Compilation failed",
        log: result.log,
        engine,
      });
    }

    const pdfPath = join(workDir, "main.pdf");
    const pdfBuffer = await readFile(pdfPath);

    // Send binary PDF directly (more efficient than base64)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Compile-Engine", engine);
    res.setHeader("X-Compile-Log", Buffer.from(result.log).toString("base64"));
    res.send(pdfBuffer);

    await cleanup(workDir);
  } catch (error) {
    await cleanup(workDir);
    console.error("Compile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function compileLatex(workDir, filename, engine) {
  return new Promise((resolve) => {
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      `-output-directory=${workDir}`,
      filename,
    ];

    const proc = spawn(engine, args, {
      cwd: workDir,
      timeout: COMPILE_TIMEOUT_MS,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      resolve({ success: code === 0, log: stdout + "\n" + stderr });
    });

    proc.on("error", (error) => {
      resolve({
        success: false,
        log: `Failed to start ${engine}: ${error.message}`,
      });
    });
  });
}

async function cleanup(dir) {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {}
}

app.listen(PORT, () => {
  console.log(`LaTeX compiler service running on port ${PORT}`);
});
```

`**latex-service/Dockerfile`:**

```dockerfile
# Stage 1: TeX Live base (cached, rarely changes)
# Alpine 3.19+; texmf-dist-lang required for pdflatex format generation
FROM alpine:3.19 AS texlive-base

RUN apk add --no-cache \
    texlive \
    texlive-xetex \
    texlive-luatex \
    texmf-dist-most \
    texmf-dist-lang \
    fontconfig \
    freetype \
    nodejs \
    npm \
    && rm -rf /var/cache/apk/*

# Stage 2: App layer
FROM texlive-base

WORKDIR /app

# Install Node dependencies first (cached if package.json unchanged)
COPY package.json package-lock.json* ./
RUN npm ci --production 2>/dev/null || npm install --production

COPY server.js .

# Security: run as non-root
RUN adduser -D -u 1000 latex
USER latex

EXPOSE 8080

CMD ["node", "server.js"]
```

#### Step 2: Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Sign up / Login
fly auth signup  # or: fly auth login

# Navigate to the latex-service directory
cd latex-service

# Create the app
fly launch --name texel-latex-compiler --region sjc --no-deploy

# Set secrets
fly secrets set LATEX_API_SECRET="your-secret-token-here"
fly secrets set COMPILE_TIMEOUT_MS="60000"

# Deploy
fly deploy

# Verify
curl https://texel-latex-compiler.fly.dev/health
```

`**latex-service/fly.toml**` (generated by `fly launch`, then edit):

```toml
app = "texel-latex-compiler"
primary_region = "sjc"   # San Jose (or pick closest to your users)

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"    # Scale to zero when idle
  auto_start_machines = true     # Wake up on request
  min_machines_running = 0       # Scale to zero for cost savings

[[vm]]
  size = "shared-cpu-2x"        # 2 shared vCPUs, 512MB RAM
  memory = "1gb"                 # 1 GB RAM (enough for TeX compilation)
```

> [!TIP]
> With `auto_stop_machines = "stop"` and `min_machines_running = 0`, Fly.io will scale to zero when idle, meaning **zero cost when no one is compiling**. Cold starts take ~2-3 seconds but that's acceptable for a compile request.

#### Step 3: Refactor the Next.js Compile Route

Update `src/app/api/compile/route.ts` to call the external service:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MAX_CONTENT_SIZE } from "@/lib/constants";

type Engine = "pdflatex" | "xelatex" | "lualatex";

const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
});

function detectEngine(content: string): Engine {
  if (content.includes("% !TEX program = xelatex")) return "xelatex";
  if (content.includes("% !TEX program = lualatex")) return "lualatex";
  if (content.includes("% !TEX program = pdflatex")) return "pdflatex";
  if (content.includes("\\usepackage{fontspec}")) return "xelatex";
  if (
    content.includes("\\usepackage{luacode}") ||
    content.includes("\\usepackage{luatexbase}")
  )
    return "lualatex";
  if (content.includes("\\usepackage{unicode-math}")) return "xelatex";
  return "pdflatex";
}

// In development, compile locally; in production, call the remote service
const LATEX_SERVICE_URL =
  process.env.LATEX_SERVICE_URL || "http://localhost:8080";
const LATEX_API_SECRET = process.env.LATEX_API_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CompileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { content, engine: requestedEngine } = parsed.data;
    const engine: Engine = requestedEngine ?? detectEngine(content);

    // Call external LaTeX compilation service
    const response = await fetch(`${LATEX_SERVICE_URL}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": LATEX_API_SECRET,
      },
      body: JSON.stringify({ content, engine }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: {
            code: "COMPILE_ERROR",
            message: errorData.error || "Compilation failed",
            details: { log: errorData.log || "", engine },
          },
        },
        { status: 422 }
      );
    }

    // Read binary PDF response
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    const pdfBase64 = pdfBuffer.toString("base64");
    const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;
    const log = Buffer.from(
      response.headers.get("X-Compile-Log") || "",
      "base64"
    ).toString("utf-8");

    return NextResponse.json({
      data: { pdfUrl, log, engine },
    });
  } catch (error) {
    console.error("Compile error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
```

> [!NOTE]
> **Alpine TeX Live:** `texmf-dist-lang` is required for pdflatex format generation on Alpine. If xelatex fails with font errors, add `texmf-dist-fontsrecommended-examples` to the `apk add` list.

#### New Environment Variables Required

Add to your `.env` and production config. Also add `LATEX_SERVICE_URL` and `LATEX_API_SECRET` to `src/lib/env.ts` (server schema and runtimeEnv) so the app validates them. When `LATEX_SERVICE_URL` is set, the compile route uses the remote service; when unset (local dev with MacTeX), the route can keep using local `pdflatex` if you add a branch in the route.

```bash
# LaTeX Compilation Service
LATEX_SERVICE_URL=https://texel-latex-compiler.fly.dev
LATEX_API_SECRET=your-secret-token-here
```

---

### Option B: Railway Docker Service

Same Docker image, but deployed on Railway instead of Fly.io:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
cd latex-service
railway init

# Deploy
railway up

# Set env vars
railway variables set LATEX_API_SECRET="your-secret-token-here"
```

Railway is simpler but slightly more expensive ($5/mo base + usage).

---

### Option C: Render.com (Docker Web Service)

You can run the same Docker image on Render:

1. Create a [Render](https://render.com) account and connect your repo.
2. **New → Web Service**, select the repo, set **Root Directory** to `latex-service`.
3. **Environment**: Docker. Render will use the `Dockerfile` in `latex-service/`.
4. Set env vars: `LATEX_API_SECRET`, `COMPILE_TIMEOUT_MS` (optional).
5. **Plan**: Free tier has spin-down; paid starts around $7/mo for always-on.

Render gives a URL like `https://texel-latex-compiler.onrender.com`. Use this as `LATEX_SERVICE_URL`. Cold starts on free tier can be 30–60 seconds.

---

### Option D: AWS Lambda + Docker (Most Scalable, More Complex)

For >1000 concurrent compilations. Uses AWS Lambda with container images:

1. Push the Docker image to **AWS ECR**
2. Create a Lambda function using the container image
3. Expose via **API Gateway**
4. Pay only per compile (~$0.0002 per request)

> [!WARNING]
> Lambda has a 10 GB image size limit (fine) and a 15-minute timeout (fine for LaTeX), but a **6 MB response body limit**. Large PDFs may need to be uploaded to S3 and returned as a URL.

---

### Compilation Option Comparison


|                      | **Fly.io**            | **Railway**    | **Render**        | **AWS Lambda**      |
| -------------------- | --------------------- | -------------- | ----------------- | ------------------- |
| Setup complexity     | Low                   | Very Low       | Low               | High                |
| Cold start           | ~2-3s                 | ~5s            | ~30-60s           | ~10-15s             |
| Cost at low traffic  | $0-5/mo               | $5-10/mo       | $7/mo (free tier) | ~$0/mo              |
| Cost at high traffic | $10-30/mo             | $15-40/mo      | $25-50/mo         | Pay per request     |
| Scaling              | Manual (add machines) | Auto-scale     | Auto-scale        | Infinite auto-scale |
| Best for             | **v1 launch**         | Quick and easy | All-in-one stack  | Scale-up later      |


---

## 6. AI Service (Gemini)

No deployment changes needed. Your `ai-service.ts` already calls the Gemini API remotely. Just ensure:

1. **Production API key**: Get a production Gemini API key from [Google AI Studio](https://aistudio.google.com)
2. **Rate limiting**: Add rate limiting to `src/app/api/ai/edit/route.ts` to prevent abuse
3. **Set the env var**: `GEMINI_API_KEY=your-production-key`

---

## 7. Authentication (Clerk)

1. **Go to Clerk dashboard** → Switch to **Production** instance
2. **Create production instance** with your custom domain
3. **Configure Google OAuth** with production redirect URIs
4. **Update env vars**:
  ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
  ```
5. **Update allowed origins** in Clerk dashboard to include your production domain
6. **Webhook endpoint**: Update the webhook URL in Clerk to `https://yourdomain.com/api/webhooks`

---

## 8. Environment Variables

### Complete Production `.env`

```bash
# ── Database ──
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# ── Auth (Clerk) ──
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ── AI ──
GEMINI_API_KEY=your-production-gemini-key

# ── LaTeX Compilation Service ──
LATEX_SERVICE_URL=https://texel-latex-compiler.fly.dev
LATEX_API_SECRET=your-secret-token-here

# ── App ──
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

> [!CAUTION]
> Never commit production secrets to Git. Use the provider's dashboard or CLI to set them:
>
> - **Vercel**: `vercel env add VARIABLE_NAME`
> - **Fly.io**: `fly secrets set VARIABLE_NAME=value`
> - **Railway**: `railway variables set VARIABLE_NAME=value`

---

## 9. CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  # ── Deploy Next.js to Vercel ──
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          SKIP_ENV_VALIDATION: true

      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"

  # ── Deploy LaTeX Service to Fly.io ──
  deploy-latex:
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'push' }}
    paths:
      - 'latex-service/**'
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - run: flyctl deploy --remote-only
        working-directory: latex-service
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  # ── Run Database Migrations ──
  migrate-db:
    runs-on: ubuntu-latest
    needs: deploy-frontend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 10. Domain, SSL & DNS

### Custom Domain Setup

1. **Buy a domain** (e.g., `texel.app`) from Namecheap, Cloudflare, or Google Domains
2. **Add to Vercel**: Dashboard → Project → Settings → Domains → Add `texel.app`
3. **Configure DNS**: Add the CNAME/A records Vercel provides
4. **SSL**: Vercel handles SSL automatically via Let's Encrypt
5. **For the LaTeX service**: Fly.io provides a free `*.fly.dev` subdomain with SSL. No custom domain needed since it's internal.

### DNS Records Example

```
Type    Name    Value                   TTL
A       @       76.76.21.21             300
CNAME   www     cname.vercel-dns.com    300
```

---

## 11. Monitoring & Observability

### Recommended Tools (All Free Tier)


| Tool                       | Purpose                             | Setup                        |
| -------------------------- | ----------------------------------- | ---------------------------- |
| **Vercel Analytics**       | Frontend performance, Web Vitals    | Built into Vercel            |
| **Sentry**                 | Error tracking (frontend + backend) | `npm install @sentry/nextjs` |
| **Better Stack (Logtail)** | Log aggregation                     | `npm install @logtail/node`  |
| **UptimeRobot**            | Uptime monitoring + alerts          | Free plan: 50 monitors       |


### Key Metrics to Monitor

- 📊 **Compile latency** (p50, p95) — target: <10s
- 📊 **Compile success rate** — target: >95%
- 📊 **API error rate** — target: <1%
- 📊 **Cold start frequency** (Fly.io) — if too high, set `min_machines_running = 1`

---

## 12. Cost Estimates

### At Launch (~0-100 users)


| Service                    | Monthly Cost |
| -------------------------- | ------------ |
| Vercel (Hobby)             | **$0**       |
| Neon (Free tier)           | **$0**       |
| Fly.io (scale-to-zero)     | **$0-5**     |
| Clerk (Free tier, 10K MAU) | **$0**       |
| Gemini API (free tier)     | **$0**       |
| Domain                     | ~$12/year    |
| **Total**                  | **~$0-5/mo** |


### Growing (~100-1000 users)


| Service            | Monthly Cost    |
| ------------------ | --------------- |
| Vercel (Pro)       | **$20**         |
| Neon (Launch)      | **$19**         |
| Fly.io (always-on) | **$10-15**      |
| Clerk (Pro)        | **$25**         |
| Gemini API         | **$5-20**       |
| **Total**          | **~$80-100/mo** |


### Scaling (~1000+ users)


| Service             | Monthly Cost     |
| ------------------- | ---------------- |
| Vercel (Pro)        | **$20**          |
| Neon (Scale)        | **$69**          |
| Fly.io / AWS Lambda | **$30-100**      |
| Clerk (Pro)         | **$25+**         |
| Gemini API          | **$50-200**      |
| **Total**           | **~$200-400/mo** |


---

## 13. Step-by-Step Deployment Walkthrough

Here's the exact order of operations to go from local → production:

### Phase 1: Database (30 min)

- Create Neon account at [neon.tech](https://neon.tech)
- Create project `texel-prod`
- Copy production connection string
- Run migrations: `DATABASE_URL="neon-url" npm run db:push`
- Verify tables exist in Neon dashboard

### Phase 2: LaTeX Compilation Service (1-2 hours)

- Create `latex-service/` directory with `server.js`, `Dockerfile`, `package.json` (code above)
- Test locally:
  ```bash
  cd latex-service
  npm install
  node server.js
  # In another terminal:
  curl -X POST http://localhost:8080/compile \
    -H "Content-Type: application/json" \
    -d '{"content": "\\documentclass{article}\\begin{document}Hello\\end{document}"}'
  ```
- Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
- Create Fly account: `fly auth signup`
- Deploy: `cd latex-service && fly launch && fly deploy`
- Set secrets: `fly secrets set LATEX_API_SECRET="your-token"`
- Test remote: `curl https://texel-latex-compiler.fly.dev/health`

### Phase 3: Refactor Compile Route (30 min)

- Update `src/app/api/compile/route.ts` with the new code (see Section 5, Step 3)
- Add `LATEX_SERVICE_URL` and `LATEX_API_SECRET` to `.env`
- Add the same to `src/lib/env.ts` schema
- Test locally against remote LaTeX service
- Verify PDF compilation works end-to-end

### Phase 4: Frontend Deployment (30 min)

- Create Vercel account and install CLI: `npm i -g vercel`
- Link project: `vercel link`
- Set all environment variables (see Section 8)
- Deploy: `vercel --prod`
- Verify all pages load correctly

### Phase 5: Auth & Domain (30 min)

- Switch Clerk to production instance
- Update Clerk environment variables in Vercel
- Add custom domain in Vercel dashboard
- Configure DNS records
- Update `NEXT_PUBLIC_APP_URL` to production domain
- Update Clerk webhook URL

### Phase 6: Monitoring (30 min)

- Enable Vercel Analytics
- Set up UptimeRobot for both frontend and LaTeX service health check
- (Optional) Add Sentry for error tracking

---

## 14. Scaling Strategy

### When to Scale


| Signal                             | Action                                            |
| ---------------------------------- | ------------------------------------------------- |
| Compile latency > 15s consistently | Increase Fly.io machine size or add more machines |
| Cold starts annoying users         | Set `min_machines_running = 1` on Fly.io          |
| >500 concurrent compiles           | Move to AWS Lambda + container images             |
| DB connection limits hit           | Upgrade Neon plan or add connection pooling       |
| Base64 PDFs too large              | Switch to S3/Cloudinary storage + signed URLs     |


### Future Optimization: PDF Storage

Currently, PDFs are returned as base64 inline. At scale, this is inefficient. The upgrade path:

1. Compile → Upload PDF to **S3 / Cloudinary**
2. Return a **signed URL** (expires in 1 hour) instead of base64
3. Cache compiled PDFs by content hash (avoid re-compiling same content)

### Future Optimization: Compile Caching

```
Hash(content + engine) → Check cache → Hit? Return cached PDF : Compile → Store → Return
```

Use **Redis** (Upstash free tier) or **Neon** for the cache index.

---

> [!NOTE]
> This plan is designed for a **lean startup launch**. Start with the free/cheap tiers, validate with real users, then scale up as needed. You can go from $0/mo to $400/mo as you grow without re-architecting.

