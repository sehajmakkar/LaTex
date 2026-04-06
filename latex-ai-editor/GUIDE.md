# LaTeX AI Editor - Setup & Testing Guide

This guide walks you through setting up and testing the Phase 1 implementation.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Database: NeonDB Setup](#database-neondb-setup)
5. [Phase 4: Auth (Clerk) and project limits](#phase-4-auth-clerk-and-project-limits)
6. [Testing the Application](#testing-the-application)
7. [Troubleshooting](#troubleshooting)
8. [Phase 2: AI Inline Edits](#phase-2-ai-inline-edits)
9. [Phase 3: Resume Templates](#phase-3-resume-templates-developer--tech)
10. [Dodo Payments (Billing) setup and testing](#dodo-payments-billing-setup-and-testing)

---

## Prerequisites

### Required

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Optional (for full functionality)

- **LaTeX** (pdflatex) - Required for PDF compilation
- **Docker** - Required for PostgreSQL database
- **PostgreSQL** - Can use Docker or install locally

---

## Quick Start

If you just want to see the editor UI (without compilation):

```bash
# Navigate to project
cd latex-ai-editor

# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
open http://localhost:3000
```

The editor UI will work, but "Compile" will fail without LaTeX installed.

---

## Detailed Setup

### Step 1: Install Dependencies

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-ai-editor
npm install
```

### Step 2: Install LaTeX (for PDF compilation)

#### macOS

**Option A: Full TeX Live (~4GB)**
```bash
brew install --cask mactex
```

**Option B: Basic TeX (~100MB)** - Recommended for testing
```bash
brew install basictex

# After installation, add to PATH
export PATH="/Library/TeX/texbin:$PATH"

# Install additional packages if needed
sudo tlmgr update --self
sudo tlmgr install collection-fontsrecommended
```

**Option C: Using MacPorts**
```bash
sudo port install texlive-basic
```

#### Verify LaTeX Installation

```bash
pdflatex --version
```

You should see something like:
```
pdfTeX 3.x.x (TeX Live 2024)
...
```

### Step 3: Set Up Database

The app requires a PostgreSQL database for auth, projects, and templates. Use **Neon** (recommended) or local Postgres. See [Database: NeonDB Setup](#database-neondb-setup) for full Neon instructions.

#### Using Docker (local development)

```bash
# Start PostgreSQL
cd docker
docker compose up -d postgres

# Verify it's running
docker compose ps
```

#### Using Local PostgreSQL

1. Install PostgreSQL
2. Create database:
```sql
CREATE DATABASE latex_ai_editor;
CREATE USER latex WITH PASSWORD 'latex';
GRANT ALL PRIVILEGES ON DATABASE latex_ai_editor TO latex;
```

### Step 4: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit if needed (defaults work for local Docker setup)
```

See [Database: NeonDB Setup](#database-neondb-setup) and [Phase 4: Auth](#phase-4-auth-clerk-and-project-limits) for required env vars (Neon `DATABASE_URL`, Clerk keys).

### Step 5: Run Database Migrations

After setting `DATABASE_URL` (Neon or local):

```bash
npm run db:push
```

Or run migrations explicitly:

```bash
npm run db:migrate
```

### Step 6: Start the Application

```bash
npm run dev
```

You should see:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
✓ Ready in Xms
```

---

## Database: NeonDB Setup

Use [Neon](https://neon.tech) as your Postgres database so the app works locally and in production without running Postgres yourself.

### 1. Create a Neon account and project

1. Go to [neon.tech](https://neon.tech) and sign up (or sign in).
2. Click **New Project**.
3. Choose a name (e.g. `latex-ai-editor`), region, and Postgres version (16 recommended).
4. Click **Create project**.

### 2. Get the connection string

1. In the Neon dashboard, open your project.
2. Go to **Connection Details** (or **Dashboard** → connection string).
3. Select **Connection string** and copy the URI. It looks like:
   ```
   postgresql://USER:PASSWORD@ep-XXX-XXX.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Optional: use a **pooled** connection string if Neon shows one (e.g. for serverless). The non-pooled URI works with this app.

### 3. Configure the app

1. In the project root, copy the example env file if you haven’t:
   ```bash
   cp .env.example .env
   ```
2. Set `DATABASE_URL` in `.env` to the Neon connection string:
   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@ep-XXX-XXX.region.aws.neon.tech/neondb?sslmode=require"
   ```
   Use the exact string from Neon (with your user, password, and endpoint). Keep the `?sslmode=require` part.

### 4. Run migrations against Neon

From the project root:

```bash
npm run db:push
```

This applies the schema (users, projects, compilations, user_usage) to your Neon database. Or generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 5. Verify

- Start the app: `npm run dev`.
- Sign in (see Phase 4). Creating a project should create rows in Neon.
- In Neon dashboard, use **SQL Editor** and run `SELECT * FROM users;` and `SELECT * FROM projects;` to confirm data.

### Notes

- **Security:** Never commit `.env`. The Neon connection string contains the database password.
- **Branching:** Neon supports database branching; you can create a branch for staging and point `DATABASE_URL` to it.
- **Local fallback:** For local-only development you can still use Docker Postgres and set `DATABASE_URL=postgresql://latex:latex@localhost:5432/latex_ai_editor`.

---

## Phase 4: Auth (Clerk) and project limits

Auth is handled by **Clerk** with **Google sign-in only**. Free users can create up to **3 projects**; the database is ready for Stripe billing later (Phase 5).

### Clerk setup (Google only)

1. Go to [clerk.com](https://clerk.com) and create an application (or use an existing one).
2. In the Clerk Dashboard, go to **User & Authentication** → **Social connections** and enable **Google**. Disable Email and any other methods if you want only Google.
3. In **Paths**, set Sign-in URL to `/sign-in` and Sign-up URL to `/sign-up` (or leave defaults; the app uses `[[...sign-in]]` and `[[...sign-up]]`).
4. Copy the API keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

### Environment variables

Add to `.env`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

Optional (defaults are fine for local):

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

Restart the dev server after changing env.

### Testing auth and project limit

1. Open http://localhost:3000. You should see the landing page with **Sign in with Google**.
2. Click **Sign in with Google** and complete sign-in. You should be redirected to **Dashboard** (`/dashboard`).
3. On the dashboard you should see **Your projects** and **0 / 3 projects (free)**.
4. Click **New project**. A new project is created and you are taken to the editor. Confirm the project appears on the dashboard after you go back.
5. Create two more projects (3 total). The **New project** button should still work.
6. Try creating a fourth project. You should see an error that free accounts are limited to 3 projects.
7. Delete one project (trash icon), then create another. It should succeed.
8. Click **Sign out**. You should be back on the home page; visiting `/dashboard` or `/templates` should redirect to sign-in.

### Database tables for Phase 4 (and Phase 5 billing)

- **users** – Clerk user id, email, name, `plan` (free/pro/pro_plus), `dodoCustomerId`, `dodoSubscriptionId`, `subscriptionStatus`. Used for project limit and billing (Dodo Payments).
- **user_usage** – Daily usage (compiles, ai_edits) for future rate limits.
- **projects** – `userId` links to `users.id` (Clerk id). Only the owner can view/edit/delete.

Billing is implemented with **Dodo Payments** (see [Dodo Payments setup](#dodo-payments-billing-setup-and-testing)).

---

## Testing the Application

### Test 1: Basic Editor UI

1. Open http://localhost:3000 and sign in (see [Phase 4](#phase-4-auth-clerk-and-project-limits) if needed).
2. From the dashboard, click **New project** to create a project and open the editor.
3. **Verify:**
   - Two-pane layout (editor left, preview right)
   - CodeMirror editor with LaTeX syntax highlighting
   - Default or template content is loaded
   - Header shows project name and Compile / Save

### Test 2: Editor Features

1. **Syntax Highlighting**: LaTeX commands like `\documentclass`, `\begin`, `\section` should be colored
2. **Line Numbers**: Should appear on the left gutter
3. **Bracket Matching**: Click near a `{` or `}` to see its match highlighted
4. **Auto-close**: Type `{` and `}` should auto-insert
5. **Edit Content**: Modify the text and verify changes are reflected
6. **Keyboard Shortcuts**:
   - `Cmd+Z` / `Ctrl+Z` - Undo
   - `Cmd+Shift+Z` / `Ctrl+Y` - Redo
   - `Cmd+/` / `Ctrl+/` - Toggle comment
   - `Tab` - Indent

### Test 3: PDF Compilation

> Requires LaTeX (pdflatex) to be installed

1. Click the **"Compile"** button in the header
2. **Expected behavior:**
   - Button text changes to "Compiling..."
   - Toast notification appears: "Compiling..."
   - After ~2-5 seconds, PDF appears in right pane
   - Toast shows "Compiled successfully!"
3. **Verify PDF:**
   - Title "My Document" is visible
   - Sections (Introduction, Features, etc.) are rendered
   - Math equation `E = mc²` is displayed

### Test 4: Compilation Error Handling

1. Introduce a LaTeX error in the editor:
   ```latex
   \begin{itemize}
   \item Missing end tag
   % Remove the \end{itemize}
   ```
2. Click **Compile**
3. **Expected:** Error toast with message about compilation failure

### Test 5: PDF Download

1. After successful compilation, a **Download** button appears
2. Click it to download `document.pdf`
3. Open the PDF to verify it matches the preview

### Test 6: Resizable Panels

1. Hover over the divider between editor and preview
2. Drag to resize panels
3. Verify both panels respect minimum widths

### Test 7: Dark Mode (Optional)

1. The app respects system theme
2. Toggle your OS dark mode
3. Verify the editor theme changes accordingly

---

## API Testing (Optional)

### Test Compile API Directly

```bash
curl -X POST http://localhost:3000/api/compile \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-123",
    "content": "\\documentclass{article}\\begin{document}Hello World\\end{document}"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "pdfUrl": "data:application/pdf;base64,..."
  }
}
```

### Test Projects API (requires database)

**Create Project:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Resume"}'
```

**List Projects:**
```bash
curl http://localhost:3000/api/projects
```

---

## Troubleshooting

### "pdflatex: command not found"

LaTeX is not installed or not in PATH.

**Fix:**
```bash
# macOS - check if TeX is installed
ls /Library/TeX/texbin/pdflatex

# Add to PATH
export PATH="/Library/TeX/texbin:$PATH"

# Add to ~/.zshrc for persistence
echo 'export PATH="/Library/TeX/texbin:$PATH"' >> ~/.zshrc
```

### "Failed to start pdflatex"

Same as above - LaTeX not found.

### Database Connection Error

If you see errors about database connection:

1. **Option A:** Start Docker PostgreSQL:
   ```bash
   cd docker && docker compose up -d postgres
   ```

2. **Option B:** The app works without database for basic editing. Just ignore the error.

### Port 3000 Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
npm run dev -- -p 3001
```

### Compilation Takes Too Long

First compilation may take longer as LaTeX caches fonts. Subsequent compiles should be faster.

If consistently slow:
- Check if `pdflatex` is running: `ps aux | grep pdflatex`
- Kill stuck processes: `pkill pdflatex`

### Editor Not Loading

If you see a blank editor:
1. Check browser console for errors (F12 → Console)
2. Try hard refresh: `Cmd+Shift+R`
3. Clear Next.js cache: `rm -rf .next && npm run dev`

### "Module not found" Errors

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## File Structure Reference

```
latex-ai-editor/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── project/[id]/
│   │   │       └── page.tsx      # Main editor page
│   │   ├── api/
│   │   │   ├── compile/
│   │   │   │   └── route.ts      # Compilation endpoint
│   │   │   └── projects/
│   │   │       └── route.ts      # Projects CRUD
│   │   ├── layout.tsx            # Root layout with providers
│   │   └── page.tsx              # Redirects to /project/new
│   ├── components/
│   │   ├── editor/
│   │   │   ├── CodeMirrorEditor.tsx  # Main editor
│   │   │   └── EditorPane.tsx        # Editor wrapper
│   │   ├── preview/
│   │   │   └── PdfPreview.tsx        # PDF viewer
│   │   └── shared/
│   │       └── Header.tsx            # App header
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts          # Database client
│   │   │   └── schema.ts         # Drizzle schema
│   │   ├── constants.ts          # Default LaTeX content
│   │   └── errors.ts             # Error classes
│   ├── stores/
│   │   └── editor-store.ts       # Zustand store
│   └── hooks/
│       └── use-compile.ts        # Compilation hook
├── docker/
│   ├── Dockerfile.texlive        # LaTeX Docker image
│   └── docker-compose.yml        # Docker services
└── package.json
```

---

---

## Phase 2: AI Inline Edits

### Setup for AI Features

1. Get an OpenAI API key from https://platform.openai.com/api-keys

2. Add it to your `.env` file:
```bash
OPENAI_API_KEY=sk-your-key-here
```

3. Restart the dev server:
```bash
npm run dev
```

### Testing AI Inline Edits

#### Test 1: Basic AI Edit

1. Open the editor at http://localhost:3000
2. Select some text (e.g., select the word "Introduction" in `\section{Introduction}`)
3. Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux)
4. An input field appears - type: "change to 'Getting Started'"
5. Press **Enter** to submit
6. **Expected:** AI generates the replacement text
7. Press **⌘Y** to accept or **⌘U** to reject

#### Test 2: Code Generation

1. Select an empty line or a comment
2. Press **⌘K**
3. Type: "add a table with 3 columns: Name, Age, City"
4. **Expected:** AI generates a LaTeX table

#### Test 3: Math Formatting

1. Select text like "x squared plus y squared equals z squared"
2. Press **⌘K**
3. Type: "convert to LaTeX equation"
4. **Expected:** AI generates `$x^2 + y^2 = z^2$` or similar

#### Test 4: Style Changes

1. Select a section of the document
2. Press **⌘K**
3. Type: "make this a bulleted list"
4. **Expected:** AI converts to `\begin{itemize}...\end{itemize}`

### Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| ⌘K / Ctrl+K | Open AI edit prompt |
| ⌘Y / Ctrl+Y | Accept AI suggestion |
| ⌘U / Ctrl+U | Reject AI suggestion |
| Escape | Cancel AI edit |

### Troubleshooting AI Features

**"OpenAI API key not configured"**
- Make sure `OPENAI_API_KEY` is set in `.env`
- Restart the dev server after adding the key

**AI request fails/times out**
- Check your OpenAI API key is valid
- Check you have API credits available
- Check network connectivity

**Empty or strange responses**
- Try being more specific in your prompt
- Select more context (more text) before triggering AI

---

## Phase 3: Resume Templates (Developer / Tech)

### Overview

Four developer-focused resume templates are available: **Modern Tech**, **Minimalist Dev**, **Classic Developer**, and **Tech Lead**. Each uses variables (name, email, phone, location, LinkedIn, GitHub, website) that you fill in before creating the project.

### Testing the Template Flow

1. **Open templates**
   - Go to http://localhost:3000
   - Click **"Resume templates"** (or open the header menu → "Resume templates")
   - You should see the templates page with four cards.

2. **Use a template**
   - Click **"Use template"** on any card (e.g. "Modern Tech").
   - A dialog opens with fields: Full Name*, Email*, Phone, Location, LinkedIn, GitHub, Website.
   - Fill at least the required fields (name, email).
   - Click **"Create project"**.

3. **Verify project**
   - You are redirected to the editor with the template content loaded.
   - Your name, email, and other details should appear in the LaTeX (e.g. `{{name}}` replaced).
   - Compile to see the PDF with your info.

4. **Save and reload**
   - Edit the LaTeX, click **Save** in the header.
   - Refresh the page; your content should persist (requires database). 

### Template List

| Template           | Best for                          |
|--------------------|-----------------------------------|
| Modern Tech        | Software engineers, clear sections |
| Minimalist Dev     | Senior engineers, content-first   |
| Classic Developer  | Full-stack, sidebar contact/skills |
| Tech Lead          | Tech lead / senior, leadership    |

### API (optional)

- `GET /api/templates` — list all template manifests.
- `GET /api/templates/[id]` — get template with optional `?variables=` JSON for substitution.
- `POST /api/templates/[id]` — body `{ "variables": { "name": "...", ... } }` returns `{ "data": { "content": "..." } }`.

---

## Dodo Payments (Billing) setup and testing

Billing uses **Dodo Payments** so the app can accept subscriptions in regions where Stripe is not available (e.g. India). This section covers dashboard setup, environment variables, and how to test checkout and webhooks.

### 1. Dodo Payments dashboard setup

1. **Sign up / log in** at [Dodo Payments](https://dodopayments.com) and open the dashboard.
2. **API key**
   - Go to **Settings** (or **Developers**) and create or copy an **API key**.
   - Use **Test mode** for development.
3. **Products (subscription plans)**
   - Create two **subscription products** (e.g. “Pro” and “Pro Plus”) with the billing interval you want (monthly/yearly).
   - Copy each product’s **Product ID** (e.g. `prod_xxx`). You will use these in env as `DODO_PRODUCT_ID_PRO` and `DODO_PRODUCT_ID_PRO_PLUS`.
4. **Webhook**
   - Go to **Settings → Webhooks** and click **Add webhook**.
   - **Endpoint URL:**  
     - Local: use a tunnel (e.g. [ngrok](https://ngrok.com)) and set the URL to `https://YOUR_NGROK_URL/api/webhooks/dodo`.  
     - Production: `https://YOUR_DOMAIN/api/webhooks/dodo`.
   - **Subscribed events:** enable at least:
     - `subscription.active`
     - `subscription.updated`
     - `subscription.renewed`
     - `subscription.on_hold`
     - `subscription.failed`
     - `subscription.cancelled`
     - `subscription.expired`
   - Save and copy the **Webhook secret key** (used as `DODO_PAYMENTS_WEBHOOK_KEY`).  
   - Dodo follows [Standard Webhooks](https://standardwebhooks.com/); the app verifies signatures with this secret.

### 2. Environment variables

Add to `.env` (or your host’s env):

```env
# Dodo Payments (billing)
DODO_PAYMENTS_API_KEY=your_api_key_here
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_WEBHOOK_KEY=your_webhook_secret_here
DODO_PRODUCT_ID_PRO=prod_xxx_pro
DODO_PRODUCT_ID_PRO_PLUS=prod_xxx_pro_plus

# App URL (used for checkout return URL)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- **Production:** set `DODO_PAYMENTS_ENVIRONMENT=live_mode` and use live API key and webhook secret. Create the same products in live mode and set the same env keys to the live product IDs.

### 3. Database

The app already has `dodo_customer_id` and `dodo_subscription_id` on `users`. If you added them manually, run:

```bash
npm run db:push
```

### 4. Testing checkout (test mode)

1. Start the app and sign in (Clerk).
2. Open **Dashboard** and click **Billing** (or go to `/billing`).
3. You should see **Current plan: free** and **Upgrade to Pro** / **Upgrade to Pro Plus**.
4. Click **Upgrade to Pro** (or Pro Plus). You should be redirected to Dodo’s checkout page (test mode).
5. Complete the test payment (use Dodo’s test card/details if documented).
6. You should be redirected back to `/billing/success`. After the webhook is received, your plan on **Billing** and **Dashboard** should update to **pro** or **pro_plus** (and project limit becomes unlimited for paid plans).

If checkout does not open, check:

- `DODO_PAYMENTS_API_KEY` and `DODO_PRODUCT_ID_*` are set.
- Browser console and server logs for errors (e.g. 503 “Billing not configured”).

### 5. Testing webhooks (local)

Webhooks must be sent to a public URL. For local development:

1. **Expose your app** with ngrok (or similar):
   ```bash
   ngrok http 3000
   ```
2. **Set webhook URL in Dodo** to `https://YOUR_NGROK_HOST/api/webhooks/dodo` (see step 1 above).
3. **Optional:** Ensure `NEXT_PUBLIC_APP_URL` matches what you use in the browser (e.g. `http://localhost:3000`); the return URL after payment uses this.
4. **Trigger a subscription event** (e.g. complete a test checkout). Dodo will POST to your webhook.
5. **Verify:** Check your server logs for the webhook request. The handler returns `200` after verifying the signature and updating the user’s `plan` and `subscriptionStatus`. You can also use **Dodo Dashboard → Webhooks** to “Send example” for a subscription event to confirm your endpoint responds with 2xx.

If the webhook returns 401:

- `DODO_PAYMENTS_WEBHOOK_KEY` must match the secret shown in Dodo for this webhook endpoint.
- The handler uses the raw request body for verification; do not modify the body before it reaches the route.

### 6. API reference (billing)

- `GET /api/billing/me` – Returns current user’s `plan` and `subscriptionStatus` (requires auth).
- `POST /api/billing/checkout` – Body `{ "plan": "pro" | "pro_plus" }`. Returns `{ "data": { "checkout_url": "..." } }`; redirect the user to this URL (requires auth).
- `POST /api/webhooks/dodo` – Dodo webhook endpoint (no auth; verified via Standard Webhooks signature).

---

## Next Steps

Phases 1–4 and billing (Dodo Payments) are in place. Next:

- **Phase 5:** Performance optimizations and any product-specific features.

---

## Support

If you encounter issues not covered here, check:
1. Browser console for JavaScript errors
2. Terminal for server-side errors
3. Network tab for API response details
