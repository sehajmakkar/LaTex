# TeXel — Step-by-Step Deployment Guide

This guide walks you through deploying TeXel (LaTeX AI Editor) from your laptop to production. Follow the phases in order. Each step includes exact commands and where to click.

**Reference:** For architecture, cost estimates, and alternative providers, see [deployment-plan.md](./deployment-plan.md).

**Rough cost at launch (free tiers):** Vercel $0, Neon $0, Fly.io $0–5/mo (scale-to-zero), Clerk $0, Gemini $0 → **about $0–5/month** plus domain (~$12/year) if you use a custom domain.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Phase 1: Database (Neon)](#2-phase-1-database-neon)
3. [Phase 2: LaTeX Compilation Service (Fly.io)](#3-phase-2-latex-compilation-service-flyio)
4. [Phase 3: Refactor Compile Route & Env](#4-phase-3-refactor-compile-route--env)
5. [Phase 4: Deploy Next.js to Vercel](#5-phase-4-deploy-nextjs-to-vercel)
6. [Phase 5: Auth (Clerk) & Domain](#6-phase-5-auth-clerk--domain)
7. [Testing After Deployment](#7-testing-after-deployment)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### 1.1 Accounts to Create (all have free tiers)


| Service       | Purpose                     | Sign-up URL                                                |
| ------------- | --------------------------- | ---------------------------------------------------------- |
| **Neon**      | PostgreSQL database         | [https://neon.tech](https://neon.tech)                     |
| **Vercel**    | Next.js hosting             | [https://vercel.com](https://vercel.com)                   |
| **Fly.io**    | LaTeX compiler API          | [https://fly.io](https://fly.io)                           |
| **Clerk**     | Auth (you may already have) | [https://clerk.com](https://clerk.com)                     |
| **Google AI** | Gemini API key              | [https://aistudio.google.com](https://aistudio.google.com) |


### 1.2 Tools to Install on Your Machine

```bash
# Node.js 18+ (you already have this if the app runs locally)
node -v   # should be v18 or v20

# Vercel CLI
npm install -g vercel

# Fly CLI (macOS / Linux)
curl -L https://fly.io/install.sh | sh
# Then restart your terminal or run: export FLYCTL_INSTALL="/Users/YOUR_USERNAME/.fly/bin" and add to PATH

# Optional: Railway CLI if you prefer Railway over Fly for LaTeX
# npm install -g @railway/cli
```

### 1.3 Checklist Before You Start

- App runs locally (`npm run dev`, compile works with MacTeX)
- Git repo is pushed to GitHub (or GitLab) — Vercel/Fly will need it
- You have a production Gemini API key (Google AI Studio)
- Clerk dashboard access for production keys

---

## 2. Phase 1: Database (Neon)

**Goal:** Create a production PostgreSQL database and run migrations.

### Step 1.1: Create Neon Project

1. Go to **[https://neon.tech](https://neon.tech)** and sign in (or sign up with GitHub).
2. Click **New Project**.
3. **Name:** `texel-prod` (or any name).
4. **Region:** Choose closest to your users (e.g. US East).
5. **Postgres version:** 16.
6. Click **Create project**.

### Step 1.2: Copy Connection String

1. On the project dashboard, open **Connection Details** (or **Dashboard**).
2. Select **Connection string** and copy the URI. It looks like:
  ```text
   postgresql://USER:PASSWORD@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
  ```
3. Keep this secret. You will use it as `DATABASE_URL`.

### Step 1.3: Run Migrations From Your Laptop

From your project root:

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-ai-editor

# Use the Neon URL (replace with your actual URL)
export DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Apply schema to production DB
npm run db:push
```

You should see output indicating success. In Neon dashboard → **SQL Editor**, run `SELECT * FROM projects LIMIT 1;` to confirm tables exist (empty is fine).

### Step 1.4: Save the URL

- Save `DATABASE_URL` in a secure note or password manager. You will add it to Vercel in Phase 4.

**Phase 1 done.** Production database is ready.

---

## 3. Phase 2: LaTeX Compilation Service (Fly.io)

**Goal:** Run a small HTTP service that compiles LaTeX to PDF inside a Docker container, so Vercel can call it (Vercel cannot run pdflatex itself).

### Step 2.1: Create the `latex-service` Directory

In your project root:

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-ai-editor
mkdir -p latex-service
cd latex-service
```

### Step 2.2: Create `package.json`

Create `latex-service/package.json` with:

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

### Step 2.3: Create `server.js`

Create `latex-service/server.js` with the content from [deployment-plan.md](./deployment-plan.md) — Section 5, Option A, Step 1 (“latex-service/server.js”). It includes:

- `POST /compile` — accepts `{ content, engine }`, runs pdflatex/xelatex/lualatex, returns PDF binary.
- `GET /health` — returns `{ status: "ok" }`.
- Auth via header `x-api-secret` if `LATEX_API_SECRET` is set.

Copy the full `server.js` from the deployment plan into `latex-service/server.js`.

### Step 2.4: Create `Dockerfile`

Create `latex-service/Dockerfile` with the content from [deployment-plan.md](./deployment-plan.md) — Section 5, Option A (Dockerfile). It uses Alpine, installs TeX Live + Node, and runs `node server.js`.

### Step 2.5: Test Locally (No Docker Yet)

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-service
npm install
node server.js
```

In another terminal:

```bash
curl -X POST http://localhost:8080/compile \
  -H "Content-Type: application/json" \
  -d '{"content": "\\documentclass{article}\\begin{document}Hello\\end{document}"}'
```

You should get a PDF binary (or an error if pdflatex is not installed locally). If you have MacTeX, this can work; if not, skip and test on Fly. Stop the server with `Ctrl+C`.

### Step 2.6: Sign Up / Log In to Fly.io

```bash
fly auth signup
# or
fly auth login
```

Follow the browser flow.

### Step 2.6a: Add a Payment Method (Required by Fly.io)

Fly.io **requires a payment method** (credit/debit card) before you can launch an app. You will see:

```text
! You need to add a payment method in order to proceed.
? Would you like to do this now?
```

- **Answer: Yes** and complete the card form in the browser. Fly.io uses it for verification and for any usage above free allowances.
- With **scale-to-zero** (Step 2.7 and `fly.toml` with `min_machines_running = 0`), when the app is idle you are not charged for compute—only a small amount for stopped-machine storage if applicable. For light use, many apps stay at **$0–5/month**.
- If you prefer not to add a card to Fly.io, use the **Render.com** path instead: see [Alternative: Deploy LaTeX service on Render](#alternative-deploy-latex-service-on-render) at the end of Phase 2.

After adding your card, run **Step 2.7** again (from `latex-service/`):

```bash
fly launch --name texel-latex-compiler --region sjc --no-deploy
```

When asked for Postgres or Redis, choose **No**. You should get a `fly.toml` file created without the "payment method required" error.

### Step 2.7: Launch the App on Fly (from `latex-service/`)

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-ai-editor/latex-service

fly launch --name texel-latex-compiler --region sjc --no-deploy
```

- **App name:** You can accept `texel-latex-compiler` or change it (must be unique on Fly).
- **Region:** e.g. `sjc` (San Jose). Pick one close to your users.
- When asked for a Postgres or Redis add-on, say **No**.

If you see **"payment method required to continue"**, go back to [Step 2.6a](#step-26a-add-a-payment-method-required-by-flyio), add your card, then run `fly launch` again.

This creates `fly.toml`. You can edit it to set `min_machines_running = 0` and `auto_stop_machines = "stop"` for scale-to-zero (see deployment-plan.md).

### Step 2.8: Set Secrets

Generate a long random string for the API secret (e.g. `openssl rand -hex 32`):

```bash
fly secrets set LATEX_API_SECRET="paste-your-secret-here"
fly secrets set COMPILE_TIMEOUT_MS="60000"
```

### Step 2.9: Deploy

```bash
fly deploy
```

Wait until the build finishes and the app is running. Note the URL, e.g. `https://texel-latex-compiler.fly.dev`.

### Step 2.10: Verify Health

```bash
curl https://texel-latex-compiler.fly.dev/health
```

Expected: `{"status":"ok","engine":"texlive"}` (or similar).

Test compile (replace `YOUR_SECRET` with the same value you set):

```bash
curl -X POST https://texel-latex-compiler.fly.dev/compile \
  -H "Content-Type: application/json" \
  -H "x-api-secret: YOUR_SECRET" \
  -d '{"content": "\\documentclass{article}\\begin{document}Hello\\end{document}"}' \
  --output test.pdf
```

Open `test.pdf`; it should show “Hello”.

**Phase 2 done.** LaTeX compilation service is live. Save the service URL and the secret for Phase 3 and 4.

### Alternative: Deploy LaTeX service on Render

If you prefer not to add a payment method to Fly.io, you can host the same `latex-service` on [Render.com](https://render.com):

1. Push your repo (including `latex-service/`) to GitHub.
2. In Render: **New → Web Service**, connect the repo, set **Root Directory** to `latex-service`.
3. **Environment:** Docker. Render will use `latex-service/Dockerfile`.
4. Set **Environment Variables**: `LATEX_API_SECRET`, `COMPILE_TIMEOUT_MS` (optional).
5. Create Web Service. Note the URL (e.g. `https://texel-latex-compiler.onrender.com`).
6. In Phase 3 and 4, use this URL as `LATEX_SERVICE_URL`.

Render’s free tier spins down after inactivity; the first request after idle can take 30–60 seconds. Paid plans (~$7/mo) keep the service always on. Render may also require a payment method for some regions or features—check their current signup flow.

---

## 4. Phase 3: Refactor Compile Route & Env

**Goal:** Make the Next.js app call the Fly.io LaTeX service in production instead of running pdflatex locally.

### Step 3.1: Update Compile Route

Replace the contents of `src/app/api/compile/route.ts` with the version in [deployment-plan.md](./deployment-plan.md) — Section 5, Step 3 (“Refactor the Next.js Compile Route”). That version:

- Reads `LATEX_SERVICE_URL` and `LATEX_API_SECRET` from the environment.
- Sends `POST` to `{LATEX_SERVICE_URL}/compile` with `{ content, engine }` and header `x-api-secret`.
- Converts the binary PDF response to base64 and returns `{ data: { pdfUrl, log, engine } }`.

Important: The plan’s code uses the remote service whenever `LATEX_SERVICE_URL` is set. For local development with MacTeX, either:

- Leave `LATEX_SERVICE_URL` unset in `.env` and add a small branch in the route: “if `LATEX_SERVICE_URL` is set, call remote; else run local pdflatex (current logic),” or  
- Set `LATEX_SERVICE_URL=http://localhost:8080` when running the LaTeX service locally for tests.

### Step 3.2: Add Env Vars to `src/lib/env.ts`

In `src/lib/env.ts`, add to the `server` object:

```ts
LATEX_SERVICE_URL: z.string().url().optional(),
LATEX_API_SECRET: z.string().optional(),
```

And in `runtimeEnv`:

```ts
LATEX_SERVICE_URL: process.env.LATEX_SERVICE_URL,
LATEX_API_SECRET: process.env.LATEX_API_SECRET,
```

### Step 3.3: Local `.env` for Production-Like Test

In project root `.env` (do not commit secrets):

```bash
# LaTeX Compilation Service (use your Fly URL and secret)
LATEX_SERVICE_URL=https://texel-latex-compiler.fly.dev
LATEX_API_SECRET=your-secret-from-step-2.8
```

Keep your existing `DATABASE_URL`, `GEMINI_API_KEY`, and Clerk vars. Run `npm run dev`, open a project, and click **Compile**. The request should go to Fly.io and the PDF should appear.

**Phase 3 done.** App is ready to be deployed to Vercel with the same env vars.

---

## 5. Phase 4: Deploy Next.js to Vercel

**Goal:** Host the Next.js app on Vercel and configure all environment variables.

### Step 4.1: Push Code to GitHub

Ensure your latest code (including `latex-service/` and compile route changes) is pushed:

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-ai-editor
git add .
git commit -m "Add latex-service and compile route for production"
git push origin main
```

(Use your branch name if different.)

### Step 4.2: Create `vercel.json` (Optional but Recommended)

In the **project root** (not inside `latex-service`), create `vercel.json`:

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

This sets longer timeouts for the compile proxy and AI edit route.

### Step 4.3: Link Project to Vercel

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-ai-editor
vercel link
```

- **Set up and deploy?** Yes.
- **Which scope?** Your account.
- **Link to existing project?** No (first time) or Yes if you already created one.
- **Project name:** e.g. `latex-ai-editor`.
- **Directory:** `./` (current directory).

### Step 4.4: Add Environment Variables in Vercel

Either via CLI or Dashboard.

**Using CLI (repeat for each variable):**

```bash
vercel env add DATABASE_URL
# Paste the Neon connection string when prompted; select Production (and Preview if you want).

vercel env add GEMINI_API_KEY
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add LATEX_SERVICE_URL
vercel env add LATEX_API_SECRET
vercel env add NEXT_PUBLIC_APP_URL
```

For `NEXT_PUBLIC_APP_URL`, use your Vercel URL for now, e.g. `https://latex-ai-editor.vercel.app`. You’ll change it when you add a custom domain.

**Using Dashboard:**

1. Go to **[https://vercel.com](https://vercel.com)** → Your project → **Settings** → **Environment Variables**.
2. Add each variable; set **Environment** to Production (and Preview if desired).

Required variables:


| Name                                  | Example / note                                         |
| ------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                        | Neon connection string                                 |
| `GEMINI_API_KEY`                      | From Google AI Studio                                  |
| `CLERK_SECRET_KEY`                    | From Clerk (production key: `sk_live_...`)             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | From Clerk (`pk_live_...`)                             |
| `LATEX_SERVICE_URL`                   | `https://texel-latex-compiler.fly.dev`                 |
| `LATEX_API_SECRET`                    | Same secret you set on Fly                             |
| `NEXT_PUBLIC_APP_URL`                 | `https://your-app.vercel.app` (or custom domain later) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard`                                           |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard`                                           |


### Step 4.5: Deploy

```bash
vercel --prod
```

Wait for the build. When it finishes, open the production URL (e.g. `https://latex-ai-editor.vercel.app`). You should see the app; sign-in and project list may work if Clerk is already configured for this URL.

**Phase 4 done.** Frontend and API are live. Next: point Clerk to production and (optional) add a custom domain.

---

## 6. Phase 5: Auth (Clerk) & Domain

**Goal:** Use Clerk production keys and, if you want, a custom domain.

### Step 6.1: Clerk Production Instance

1. In **Clerk Dashboard**, create or switch to a **Production** instance.
2. Under **API Keys**, copy the **Publishable key** (`pk_live_...`) and **Secret key** (`sk_live_...`).
3. In Vercel → Project → **Settings** → **Environment Variables**, set:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...`
  - `CLERK_SECRET_KEY` = `sk_live_...`
4. Redeploy so the new keys are used: **Deployments** → latest → **Redeploy**.

### Step 6.2: Allowed Origins and Redirect URLs

In Clerk:

- **Paths:** Set Sign-in URL (e.g. `/sign-in`) and Sign-up URL (e.g. `/sign-up`) if needed.
- **Allowed redirect URLs:** Add your Vercel URL and, when you have it, your custom domain (e.g. `https://yourapp.com/dashboard`).

### Step 6.3: Custom Domain (Optional)

1. In Vercel → Project → **Settings** → **Domains**, add your domain (e.g. `texel.app` or `app.yourdomain.com`).
2. Vercel will show DNS records (CNAME or A). Add them in your DNS provider (Cloudflare, Namecheap, etc.).
3. After DNS propagates, Vercel will issue SSL automatically.
4. Set `NEXT_PUBLIC_APP_URL` to `https://yourdomain.com` and redeploy.
5. In Clerk, add `https://yourdomain.com` to allowed origins and redirect URLs.

**Phase 5 done.** Production deployment is complete.

---

## 7. Testing After Deployment

Use this checklist on the **production** URL.

### 7.1 General

- Home/landing page loads.
- **Sign in with Google** works and redirects to dashboard.
- Dashboard shows “Your projects” and project count (e.g. 0/3).

### 7.2 Projects & Editor

- **New project** creates a project and opens the editor.
- Editor shows LaTeX with syntax highlighting.
- Changing content and waiting a few seconds shows “Saved” (auto-save).
- **Compile** button: after a few seconds, PDF appears in the right pane (no “pdflatex not found”).
- **Download** PDF works.
- Creating 3 projects then trying a 4th shows “free limit” (if you have the limit enforced).

### 7.3 AI Edit

- Select some LaTeX, press **Cmd+K** (Mac) or **Ctrl+K** (Windows), enter a short instruction, submit.
- Inline suggestion appears; Accept/Reject works.

### 7.4 Templates

- **Resume templates** page loads; **Use template** opens the dialog; after filling variables and creating project, editor loads the template content.

### 7.5 API Sanity Checks

- Health of LaTeX service:
  ```bash
  curl https://texel-latex-compiler.fly.dev/health
  ```
- Compile via your app (from browser Network tab you should see `POST .../api/compile` returning 200 and JSON with `data.pdfUrl`).

If any step fails, see [Troubleshooting](#8-troubleshooting).

---

## 8. Troubleshooting

### Compile returns “Compilation failed” or 422

- Check Vercel logs (Project → **Deployments** → latest → **Functions** → `api/compile`) for the exact error.
- Call the LaTeX service directly with `curl` (see Phase 2.10). If that fails, the issue is in the Fly.io service (e.g. missing TeX package, timeout). If it succeeds, the issue is in the Next.js route or env (wrong `LATEX_SERVICE_URL` or `LATEX_API_SECRET`).

### “Unauthorized” from LaTeX service

- `LATEX_API_SECRET` in Vercel must match the value set in Fly.io (`fly secrets set LATEX_API_SECRET`). No extra spaces or quotes in the value.

### Database errors (e.g. connection refused, auth failed)

- Confirm `DATABASE_URL` in Vercel is the Neon connection string with `?sslmode=require`.
- In Neon dashboard, check that the project is not suspended and that IP allowlist (if any) allows Vercel’s IPs; Neon’s serverless driver usually doesn’t require allowlisting.

### Clerk: “Invalid redirect” or sign-in doesn’t redirect

- Add the exact production URL (and custom domain if used) to Clerk’s allowed redirect URLs and origins.
- Ensure `NEXT_PUBLIC_APP_URL` matches the URL users see in the browser.
- Ensure `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is `/dashboard` (or your intended path).

### AI (Gemini) not responding or errors

- Confirm `GEMINI_API_KEY` is set in Vercel and is a production key from Google AI Studio.
- Check Vercel function logs for `api/ai/edit` for rate limits or API errors.

### Build fails on Vercel

- Run `npm run build` locally. Fix any TypeScript or lint errors.
- Ensure `SKIP_ENV_VALIDATION` is not required for build (or add the env vars to Vercel so validation passes).

### Fly.io deploy fails (Docker build)

- Ensure `latex-service/Dockerfile` and `latex-service/server.js` exist and are committed.
- If Alpine TeX packages fail, see deployment-plan.md note about `texmf-dist-lang` and `texmf-dist-fontsrecommended-examples`.

---

## Quick Reference: Env Vars


| Variable                            | Where             | Used by                           |
| ----------------------------------- | ----------------- | --------------------------------- |
| `DATABASE_URL`                      | Neon + Vercel     | Next.js (Drizzle)                 |
| `GEMINI_API_KEY`                    | Vercel            | AI edit API                       |
| `CLERK_SECRET_KEY`                  | Vercel            | Clerk server                      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel            | Clerk client                      |
| `LATEX_SERVICE_URL`                 | Vercel            | Compile API route                 |
| `LATEX_API_SECRET`                  | Fly.io + Vercel   | Compile API route ↔ LaTeX service |
| `NEXT_PUBLIC_APP_URL`               | Vercel            | App base URL                      |
| `COMPILE_TIMEOUT_MS`                | Fly.io (optional) | LaTeX service                     |


---

**End of Deployment Guide.** For cost estimates, alternative providers (Railway, Render, Lambda), and CI/CD, see [deployment-plan.md](./deployment-plan.md).