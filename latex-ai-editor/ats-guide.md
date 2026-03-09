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

---

## 9. Phase 4 – Public ATS landing (`/ats/free`)

Phase 4 adds a **public** ATS entry point for new users:

- `/ats/free` is public (no auth) via `middleware.ts`.
- It lets visitors upload a resume and see a **teaser** ATS result:
  - Combined score
  - Summary
  - Top 3 suggestions
- Full report, sections, keywords, and history still require sign-in and use the authenticated ATS flows.

### 9.1. Public endpoint: `/ats/free`

Route: `src/app/ats/free/page.tsx`

Key behavior:

- Top navbar:
  - TeXel logo and \"Free ATS score check\" label.
  - Links to **Templates**, **Sign in**, and a theme toggle.
- Main content:
  1. **Upload + JD form (left):**
     - File input for `.pdf`, `.docx`, `.txt` (5MB max).
     - Optional job description textarea.
     - **Get free ATS score** button:
       - Calls `POST /api/ats/upload`.
       - Then `POST /api/ats/analyze` with `{ source: "upload", text, jobDescription? }`.
       - If either call returns `401`, it redirects to `/sign-in?redirect_url=/ats/free`.
  2. **Teaser report (right):**
     - Uses the `report` from `/api/ats/analyze`, but only shows:
       - Combined score
       - Parse score
       - Quality score
       - Summary
       - Top 3 suggestions
     - A lock strip clearly explains that **full report** is available only after sign-in.
  3. **CTA strip:**
     - \"Sign in to see full report\" → `/sign-in`.
     - \"View Pro plans\" → `/billing`.

Testing steps:

1. Open `http://localhost:3000/ats/free` in a private/incognito window.
2. Verify that the page loads **without** redirecting (public route).
3. Upload a small sample resume:
   - If you are not signed in, the first call to `/api/ats/upload` or `/api/ats/analyze` will likely return `401` → you should be redirected to the sign-in page with `redirect_url=/ats/free`.
   - After signing in and returning to `/ats/free`, re-run the upload; now you should see a teaser score + summary + a few suggestions.
4. Confirm that:
   - Only a partial report is visible.
   - There is a clear CTA to sign in for the full report and to view plans.

### 9.2. Landing page integration (home → `/ats/free`)

Landing route: `src/app/page.tsx`

Changes:

- Below the main TeXel hero (logo, description, **Sign in**, **Resume templates**) there is now a **Free ATS resume score** card:
  - Icon + text: \"Free ATS resume score\" with a short explanation.
  - Button **\"Try a free ATS scan\"** linking to `/ats/free`.

How to check:

1. Open `http://localhost:3000` while **logged out**.
2. You should see:
   - The same TeXel hero.
   - A new card at the bottom of the hero with a **Free ATS scan** CTA.
3. Click **\"Try a free ATS scan\"** and confirm you land on `/ats/free`.

---

## 10. Phase 5 – Original resume storage & viewer

Phase 5 adds:

- Optional storage of the **original uploaded resume file** (PDF/DOCX/TXT) in **Cloudflare R2**.
- A secure API route to stream the file.
- A visual resume viewer on the right side of `/ats/[id]`.

If R2 is **not** configured, ATS still works; the report page falls back to showing the plain-text resume only.

### 10.1. Cloudflare R2 setup

1. Create an R2 bucket in your Cloudflare dashboard (e.g. `texel-ats-resumes`).
2. Create an **API token / access key pair** with read/write access to that bucket.
3. Note the **account ID** and R2 endpoint URL, typically:

   - `https://<account-id>.r2.cloudflarestorage.com`

4. In the app `.env` file, add:

   ```bash
   R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_r2_access_key_id
   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
   R2_BUCKET_NAME=your-r2-bucket-name
   ```

5. The example values and comments are also in `.env.example` so teammates know how to configure it.

The env variables are typed via `src/lib/env.ts`:

- `R2_ENDPOINT` (optional URL)
- `R2_ACCESS_KEY_ID` (optional string)
- `R2_SECRET_ACCESS_KEY` (optional string)
- `R2_BUCKET_NAME` (optional string)

If any of these are missing, R2 integrations will **no-op** and ATS falls back to text-only resumes.

### 10.2. R2 client and schema changes

R2 is accessed via a thin wrapper around the S3 SDK:

- File: `src/services/storage/r2.ts`
- Uses `@aws-sdk/client-s3` to:
  - `uploadResumeObject` – `PutObject` into the configured bucket.
  - `getResumeObject` – `GetObject` to stream the file back.
- `isR2Enabled()` returns `true` only when all required env vars are present.

The `ats_reports` table has three new, nullable columns in `src/lib/db/schema.ts`:

- `resumeFileKey` – storage key in R2 (e.g. `ats-resumes/<userId>/<timestamp>-resume.pdf`).
- `resumeFileName` – original filename.
- `resumeFileMimeType` – MIME type (`application/pdf`, Word, or text).

After pulling the latest schema, run:

```bash
npm run db:push
```

so Drizzle updates your database with the new columns.

### 10.3. Upload flow: storing the original file

Route: `src/app/api/ats/upload/route.ts`

Behavior changes:

- After basic validation (auth, size, type), the route now:
  - If R2 is enabled:
    - Generates a safe key: `ats-resumes/<userId>/<timestamp>-<sanitized-filename>`.
    - Calls `uploadResumeObject({ key, body: buffer, contentType: mime })`.
    - Swallows upload errors with a server log; ATS text extraction still proceeds.
- It still:
  - Extracts plain text from PDF/DOCX/TXT.
  - Returns the same `data.text` used by `/api/ats/analyze`.

New response shape (success):

```json
{
  "data": {
    "fileName": "your-resume.pdf",
    "mimeType": "application/pdf",
    "source": "upload_pdf",
    "text": "Plain text extracted from the resume...",
    "storageKey": "ats-resumes/<userId>/...-your-resume.pdf"
  }
}
```

If R2 is not configured or upload fails, `storageKey` will be `null`/omitted.

### 10.4. Analyze flow: persisting file metadata on the report

Route: `src/app/api/ats/analyze/route.ts`

- `AnalyzeSchema` now accepts an optional `upload` object:

  ```ts
  upload: {
    storageKey: string;
    fileName: string;
    mimeType: string;
    source?: "upload_pdf" | "upload_docx" | "upload_txt";
  }
  ```

- For `source: "upload"`:
  - `resumeText` still comes from `text` (as before).
  - `sourceLabel` prefers the more specific `upload.source` (e.g. `"upload_pdf"`), falling back to `"upload_txt"`.
  - The report row is created with:
    - `resumeFileKey`
    - `resumeFileName`
    - `resumeFileMimeType`

The details route `GET /api/ats/reports/[id]` now also returns these fields:

- `resumeFileKey`
- `resumeFileName`
- `resumeFileMimeType`

Existing reports (created before Phase 5) will have these as `null`, and the UI will fall back to the plain-text view.

### 10.5. Secure file streaming route

Route: `src/app/api/ats/reports/[id]/file/route.ts`

Behavior:

1. Authenticates the user via Clerk (`auth()`).
2. Loads the ATS report via `atsRepository.findById(id, userId)`.
3. Ensures `resumeFileKey` is present.
4. Fetches the object from R2 using `getResumeObject({ key })`.
5. Streams the body back with:
   - `Content-Type`: `resumeFileMimeType` or the object’s `ContentType`, defaulting to `application/octet-stream`.
   - `Content-Disposition`: `inline; filename="<original-name>"`.

If anything fails (no auth, not found, R2 error), it returns a JSON error with an appropriate status code.

### 10.6. ATS report UI – showing the actual resume

Route: `src/app/(dashboard)/ats/[id]/page.tsx`

Right-hand panel changes:

- The `AtsReportResponse` type now includes:
  - `resumeFileKey`
  - `resumeFileName`
  - `resumeFileMimeType`
- The component computes:

  ```ts
  const hasOriginalFile = !!data.resumeFileKey;
  const isPdf =
    !!data.resumeFileMimeType &&
    (data.resumeFileMimeType === "application/pdf" ||
      data.resumeFileMimeType.toLowerCase().includes("pdf"));
  ```

- Header text:
  - If `hasOriginalFile && isPdf`: “This is the original PDF used for ATS parsing.”
  - If `hasOriginalFile && !isPdf`: “This is the original file used for ATS parsing.”
  - Otherwise: “This is the plain-text view used for ATS parsing.”

- Body:
  - If `hasOriginalFile`:
    - Shows the original file name.
    - Renders an inline viewer:

      ```tsx
      <iframe
        src={`/api/ats/reports/${data.id}/file`}
        title="Original resume file"
        className="h-full w-full border-0"
      />
      ```

    - Browsers will typically render PDFs inline; for DOCX/TXT, the behavior may be a download or a basic preview depending on the environment.
  - If there is **no** original file (older reports or project-based scans):
    - Falls back to the previous behavior: a scrollable `<pre>` with `resumeText`.

### 10.7. UI wiring – forwarding upload metadata

Two UI entry points forward the upload metadata so it can be stored with the ATS report.

1. **Authenticated ATS dashboard** – `src/app/(dashboard)/ats/page.tsx`

   - After `/api/ats/upload`:

     - If `uploadJson.data.storageKey` exists, the code passes:

       ```ts
       upload: {
         storageKey,
         fileName,
         mimeType,
         source, // "upload_pdf" | "upload_docx" | "upload_txt"
       }
       ```

     - to `POST /api/ats/analyze` along with `source: "upload"` and `text`.

2. **Public/free ATS page** – `src/app/ats/free/page.tsx`

   - Behaves similarly: when signed-in users run a free scan, the upload metadata is forwarded so any resulting saved report can link back to the original file.

### 10.8. Testing checklist (Phase 5)

1. **Configure R2** as described in 10.1 and restart the dev server:

   ```bash
   npm run dev
   ```

2. **Run database migration** (once per environment after pulling Phase 5):

   ```bash
   npm run db:push
   ```

3. **Authenticated flow (`/ats`)**
   - Sign in and open `http://localhost:3000/ats`.
   - Upload a PDF resume and click **Upload & analyze**.
   - After redirect to `/ats/<id>`:
     - Left panel: scores, summary, sections, suggestions should behave as before.
     - Right panel:
       - Should display the PDF inline via an `<iframe>`.
       - Header text should mention the original PDF.
   - Inspect network tab:
     - You should see a `GET /api/ats/reports/<id>/file` call returning `200` with `Content-Type: application/pdf`.

4. **Non-PDF upload (DOCX/TXT)**
   - Repeat the flow with a DOCX or TXT resume.
   - Right panel should show:
     - Filename.
     - A note that preview may be limited for non-PDF files.
     - The iframe pointing at `/api/ats/reports/<id>/file` (browser may render or download).

5. **No-R2 fallback**
   - Temporarily remove or comment out the `R2_*` variables in `.env`.
   - Restart `npm run dev`.
   - Upload and analyze a resume.
   - On `/ats/<id>`:
     - Right panel should show the **plain-text** resume exactly as before.
     - There should be no calls to `/api/ats/reports/<id>/file`.

6. **Older reports**
   - Visit an existing `/ats/<id>` report created before Phase 5.
   - Confirm:
     - Left panel still works.
     - Right panel shows plain text (since there is no stored original file).

