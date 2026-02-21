# LaTeX AI Editor - Setup & Testing Guide

This guide walks you through setting up and testing the Phase 1 implementation.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Testing the Application](#testing-the-application)
5. [Troubleshooting](#troubleshooting)
6. [Phase 2: AI Inline Edits](#phase-2-ai-inline-edits)
7. [Phase 3: Resume Templates](#phase-3-resume-templates-developer--tech)

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

### Step 3: Set Up Database (Optional)

The app works without a database for basic editing, but persistence requires PostgreSQL.

#### Using Docker (Recommended)

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

Default `.env` contents:
```
DATABASE_URL=postgresql://latex:latex@localhost:5432/latex_ai_editor
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Run Database Migrations (if using DB)

```bash
npm run db:push
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

## Testing the Application

### Test 1: Basic Editor UI

1. Open http://localhost:3000
2. You should be redirected to `/project/new`
3. **Verify:**
   - Two-pane layout (editor left, preview right)
   - CodeMirror editor with LaTeX syntax highlighting
   - Default LaTeX content is loaded
   - Header shows "LaTeX AI Editor / Untitled Project"

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

## Next Steps

Phases 1–3 are complete. Next:

- **Phase 4:** User auth and billing
- **Phase 5:** Performance optimizations

---

## Support

If you encounter issues not covered here, check:
1. Browser console for JavaScript errors
2. Terminal for server-side errors
3. Network tab for API response details
