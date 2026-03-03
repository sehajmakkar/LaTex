# ATS Guide – Phase 1 (Text Extraction & Upload)

This guide explains how to **set up and test Phase 1** of the ATS system: text extraction from LaTeX, PDF, DOCX, and TXT resumes.

---

## 1. Prerequisites

- You have already set up and run the main app as per `GUIDE.md`.
- PostgreSQL is configured and reachable (`DATABASE_URL` is set).

From the project root:

```bash
cd /Users/sehaj/Developer/Local/LaTex/latex-ai-editor
```

---

## 2. Install dependencies

These are already added to `package.json`, but if you ever need to reinstall:

```bash
npm install pdf-parse mammoth
```

- **`pdf-parse`** – extracts text from PDF files.
- **`mammoth`** – extracts text from DOCX files.

---

## 3. Database schema (ats_reports)

Phase 1 adds an `ats_reports` table in `src/lib/db/schema.ts`:

- `id` (uuid, PK)
- `userId` (FK → users.id, cascade on delete)
- `projectId` (FK → projects.id, set null on delete)
- `source` – `"editor" | "upload_pdf" | "upload_docx" | "upload_txt"`
- `resumeText` – extracted plain text
- `score`, `parseScore`, `qualityScore` – placeholders for Phase 2 scoring
- `report` – JSON string of the combined ATS report (Phase 2+)
- `jobDescription` – optional JD text
- `createdAt`

If you change the schema, push it to the DB:

```bash
npm run db:push
```

You only need to do this once per schema change.

---

## 4. LaTeX text extraction (editor projects)

File: `src/services/ats/text-extractor.ts`

Function: `extractPlainTextFromLatex(source: string)`:

- Removes LaTeX comments and most commands.
- Preserves section headings (`\\section{}`, `\\subsection{}`) as plain text.
- Returns:
  - `text`: flattened plain-text resume (for ATS analysis).
  - `sections`: simple breakdown of section names and lines.

You will use this indirectly in Phase 2 when analyzing an existing TeXel project; you don’t need to call it directly for Phase 1 testing.

---

## 5. ATS upload API – `/api/ats/upload`

Phase 1 exposes a **new authenticated API route** for resume uploads:

- **Method:** `POST`
- **Path:** `/api/ats/upload`
- **Auth:** requires Clerk auth (middleware protects it)
- **Content type:** `multipart/form-data` with the field `file`
- **Supported types:**
  - PDF (`application/pdf`, `.pdf`)
  - DOCX (`.docx`, standard Word MIME type)
  - TXT (`text/plain`, `.txt`)
- **Max size:** 5 MB

### 5.1. Request format

Use a tool like `curl` or Postman **after signing in** via the browser.
The easiest way is to test from the browser using a small script, but you can also test via `curl` with your Clerk session cookie.

Example `curl` (if you copy your session cookie from the browser devtools):

```bash
curl -X POST "http://localhost:3000/api/ats/upload" \
  -H "Cookie: __session=YOUR_CLERK_SESSION_COOKIE_HERE" \
  -F "file=@/path/to/your-resume.pdf"
```

> Tip: open devtools → Network → any API request → copy `Cookie` header and paste into the command.

### 5.2. Response format

On success you get:

```json
{
  "data": {
    "fileName": "your-resume.pdf",
    "mimeType": "application/pdf",
    "source": "upload_pdf",
    "text": "Plain text extracted from the resume..."
  }
}
```

The `text` field is what Phase 2 will feed into the ATS engines.

### 5.3. Error cases to test

1. **Not signed in**
   - Call the route without the Clerk session cookie.
   - Expected: `401` with `{ "error": { "code": "UNAUTHORIZED", ... } }`.

2. **Missing file field**
   - Send an empty `form-data` body or wrong field name.
   - Expected: `400` with `"code": "BAD_REQUEST"` and message about missing file.

3. **File too large**
   - Upload a file > 5MB.
   - Expected: `413` with `"code": "FILE_TOO_LARGE"`.

4. **Unsupported type**
   - Upload `.jpg` or any non-PDF/DOCX/TXT.
   - Expected: `415` with `"code": "UNSUPPORTED_TYPE"`.

5. **Empty text**
   - Upload a blank PDF/DOCX/TXT.
   - Expected: `422` with `"code": "EMPTY_TEXT"`.

---

## 6. Quick manual test via browser (recommended)

Until the ATS UI is built in Phase 3, you can quickly test Phase 1 in the browser console:

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000` and sign in with Google (Clerk).

3. Open devtools → Console and run:

   ```js
   async function testAtsUpload(file) {
     const formData = new FormData();
     formData.append("file", file);
     const res = await fetch("/api/ats/upload", {
       method: "POST",
       body: formData,
     });
     const json = await res.json();
     console.log(res.status, json);
   }

   // Then select a file via the browser's file picker:
   const input = document.createElement("input");
   input.type = "file";
   input.onchange = () => {
     if (input.files?.[0]) testAtsUpload(input.files[0]);
   };
   document.body.appendChild(input);
   input.click();
   ```

4. Choose a **PDF or DOCX resume** and inspect the console output.
   - You should see `200` and a JSON body with `data.text` containing your resume text.

---

## 7. Phase 2 – Running ATS analysis via API

In Phase 2, the app adds:

- A **rule-based ATS engine** (real ATS-style parsing of sections, contact info, keywords, formatting).
- An **LLM layer** (quality score, summary, and suggestions).
- A combined report stored in `ats_reports`.
- A new API route: `POST /api/ats/analyze`.

### 7.1. Analyze an uploaded resume (upload + analyze)

1. First, upload and extract text as in Phase 1:

   ```js
   // In browser console, after signing in:
   async function testUploadAndAnalyze(file) {
     const formData = new FormData();
     formData.append("file", file);
     const uploadRes = await fetch("/api/ats/upload", {
       method: "POST",
       body: formData,
     });
     const uploadJson = await uploadRes.json();
     console.log("upload", uploadRes.status, uploadJson);
     if (!uploadRes.ok) return;

     const text = uploadJson.data?.text;
     if (!text) {
       console.error("No text extracted");
       return;
     }

     const analyzeRes = await fetch("/api/ats/analyze", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         source: "upload",
         text,
         // Optional: jobDescription: "Paste a JD here..."
       }),
     });
     const analyzeJson = await analyzeRes.json();
     console.log("analyze", analyzeRes.status, analyzeJson);
   }

   const input = document.createElement("input");
   input.type = "file";
   input.accept = ".pdf,.docx,.txt";
   input.onchange = () => {
     if (input.files?.[0]) testUploadAndAnalyze(input.files[0]);
   };
   document.body.appendChild(input);
   input.click();
   ```

2. On success (`200`), you should see:

   - `data.id`: the ATS report id.
   - `data.report`: the full combined report with `parseScore`, `qualityScore`, `combinedScore`, `sections`, `suggestions`, and optional `keywords`.

3. For free plan users:

   - You can run up to **3 analyses per day**.
   - After that, you receive `429` with `"code": "ATS_LIMIT_REACHED"`.

### 7.2. Analyze a TeXel project by projectId

You can also run ATS directly against a stored project (without uploading a file):

```bash
curl -X POST "http://localhost:3000/api/ats/analyze" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_CLERK_SESSION_COOKIE_HERE" \
  -d '{
    "source": "editor",
    "projectId": "YOUR_PROJECT_UUID",
    "jobDescription": "Optional JD text here"
  }'
```

Response is the same shape as above, and a row is inserted into `ats_reports`.

---

## 8. Phase 3 – ATS UI (dashboard, reports, and gating)

Phase 3 adds:

- An authenticated **ATS dashboard page**: `/ats`.
- A **report detail page**: `/ats/[id]`.
- Several UI components under `src/components/ats/`.
- Dashboard and editor navigation entries for ATS.

### 8.1. ATS dashboard – `/ats`

Route: `src/app/(dashboard)/ats/page.tsx`

Features:

- **Scan from TeXel project**:
  - Dropdown of your projects (loaded from `GET /api/projects`).
  - Optional job description textarea.
  - **Analyze selected project** button → calls `POST /api/ats/analyze` with `{ source: "editor", projectId, jobDescription }`.
  - On success, the page redirects to `/ats/[reportId]`.

- **Upload & analyze**:
  - File input for PDF/DOCX/TXT (max 5MB).
  - Optional job description textarea.
  - **Upload & analyze** button:
    - Calls `POST /api/ats/upload` to extract text.
    - Then calls `POST /api/ats/analyze` with `{ source: "upload", text, jobDescription }`.
    - Redirects to `/ats/[reportId]` when done.

- **Recent reports list**:
  - Uses `GET /api/ats/reports` to show your latest reports.
  - Each entry displays created date/time, source, and scores.
  - Clicking a row navigates to `/ats/[id]`.

Testing checklist:

1. Sign in, then go to `http://localhost:3000/ats`.
2. Confirm you see:
   - \"Scan from a TeXel project\" card with a project dropdown.
   - \"Upload a resume file\" card with a file input.
   - \"Recent ATS reports\" section (empty the first time).
3. Run a scan from a project or upload:
   - You should be redirected to `/ats/<reportId>` if analysis succeeds.
   - If you hit the free plan daily limit, you should see an error toast and `429` from the API.

### 8.2. ATS report page – `/ats/[id]`

Route: `src/app/(dashboard)/ats/[id]/page.tsx`

Data source:

- `GET /api/ats/reports/[id]` – returns:
  - `id`, `createdAt`, `source`, `projectId`, `score`, `parseScore`, `qualityScore`.
  - `resumeText` – the plain-text resume that was analyzed.
  - `jobDescription` (if provided).
  - `report` – the combined `ATSReport` object from Phase 2.
- `GET /api/billing/me` – returns your `plan` and `subscriptionStatus` for gating.

Left panel (report):

- **ScoreSlider** (`src/components/ats/ScoreSlider.tsx`):
  - Shows combined score, parse score, and quality score with color-coded bars.
- **Summary** – the LLM summary of the resume.
- **Sections** (`src/components/ats/ReportSection.tsx`):
  - Uses `report.sections` and `plan` to decide what to show.
  - `tier: "free"` sections are fully visible.
  - `tier: "pro"` sections show a lock + “Upgrade” CTA for free-plan users.
- **Keyword analysis** (`src/components/ats/KeywordAnalysis.tsx`):
  - If job description is provided and keywords are computed:
    - Pro users see found/missing keywords and a JD match score.
    - Free users see a lock card with an upgrade button.
- **Suggestions** (`src/components/ats/SuggestionList.tsx`):
  - Always shows at least the first 3 suggestions (free).
  - Additional suggestions are visible for paid plans; free users see a \"X more suggestions\" lock card.

Right panel (resume preview):

- Shows `resumeText` in a scrollable `pre` block.
- This is the exact plain-text representation used for ATS parsing.

\"Edit in TeXel\" CTA:

- If the report is linked to a project (`projectId` set):
  - Button: **Edit in TeXel editor** → `/project/[projectId]`.
- If it comes from an upload:
  - Button: **Open dashboard** → `/dashboard` (from there, the user can create/import into a project).

Testing checklist:

1. From `/ats`, run a scan (project or upload) and land on `/ats/<id>`.
2. Confirm:
   - Parse, quality, and combined scores show correctly.
   - Summary text is present.
   - Multiple sections are rendered (contact, experience, education, skills, formatting, etc.).
   - Suggestions list shows at least a few actionable items.
3. On a **free** plan:
   - Some sections/suggestions and keyword details show a lock + Upgrade button.
4. On a **paid** plan (once you upgrade via billing):
   - Locked content becomes visible (Pro-only sections, full suggestions, keyword analysis).

### 8.3. Navigation updates

- **Dashboard navbar** (`src/app/(dashboard)/dashboard/page.tsx`):
  - New **ATS score** button in the top-right nav, linking to `/ats`.
- **Project editor header** (`src/components/shared/Header.tsx`):
  - Dropdown menu now includes an **ATS score** item linking to `/ats`, so users can quickly jump from the editor to the ATS dashboard.

You can verify both by:

- Opening `/dashboard` and confirming the **ATS score** nav button.
- Opening any project page (`/project/<id>`) and checking the header dropdown for **ATS score**.


