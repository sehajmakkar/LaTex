# LaTeX AI Editor - Architecture Documentation

> **Document Version:** 1.0  
> **Last Updated:** February 22, 2026  
> **Purpose:** Complete technical architecture reference for contributors and maintainers

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Core Workflows](#4-core-workflows)
5. [LaTeX Compilation & PDF Generation](#5-latex-compilation--pdf-generation)
6. [AI Integration](#6-ai-integration)
7. [Database Architecture](#7-database-architecture)
8. [Component Architecture](#8-component-architecture)
9. [API Design](#9-api-design)
10. [State Management](#10-state-management)
11. [Security Considerations](#11-security-considerations)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Performance Optimizations](#13-performance-optimizations)
14. [Development Workflows](#14-development-workflows)
15. [Future Roadmap](#15-future-roadmap)

---

## 1. System Overview

### 1.1 Product Vision

LaTeX AI Editor is an **AI-native LaTeX editor** designed for creating professional resumes and documents. It combines:
- Real-time LaTeX editing with intelligent syntax highlighting
- Instant PDF preview with server-side compilation
- AI-powered inline code suggestions and edits (like Cursor, but for LaTeX)
- Beautiful, production-ready resume templates

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ CodeMirror   │  │  PDF Preview │  │  UI Components  │  │
│  │   Editor     │  │   (iframe)   │  │   (shadcn/ui)   │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         │                  │                    │           │
│         └──────────────────┴────────────────────┘           │
│                            │                                │
│                     React Query                             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTPS/JSON
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Server (App Router)                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Compile    │  │  AI Service  │  │ Project Service │  │
│  │  API Route   │  │ (Gemini API) │  │   (CRUD)        │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         │                  │                    │           │
│         ▼                  │                    ▼           │
│  ┌──────────────┐          │           ┌─────────────────┐ │
│  │  pdflatex    │          │           │ Drizzle ORM     │ │
│  │ (LaTeX Engine)│         │           └─────────────────┘ │
│  └──────────────┘          │                    │           │
└────────────────────────────┼────────────────────┼───────────┘
                             │                    │
                             ▼                    ▼
                    ┌───────────────┐    ┌───────────────┐
                    │  Gemini API   │    │  PostgreSQL   │
                    │ (Google AI)   │    │   Database    │
                    └───────────────┘    └───────────────┘
```

### 1.3 Key Design Principles

1. **Server-Side Compilation**: All LaTeX compilation happens on the server for security and consistency
2. **Real-Time Feedback**: Instant visual feedback for code changes and AI suggestions
3. **Stateless API**: RESTful APIs with no server-side sessions
4. **Type Safety**: End-to-end TypeScript with Zod validation
5. **Component Isolation**: Clear separation of concerns with repository pattern

---

## 2. Technology Stack

### 2.1 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React framework with App Router |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **CodeMirror** | 6.0.2 | Code editor foundation |
| **codemirror-lang-latex** | 0.2.0 | LaTeX syntax highlighting |
| **@marimo-team/codemirror-ai** | 0.3.5 | AI inline suggestions |
| **TanStack Query** | 5.90.21 | Server state management |
| **Zustand** | 5.0.11 | Client state management |
| **shadcn/ui** | Latest | UI component library |
| **Zod** | 4.3.6 | Schema validation |

### 2.2 Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | JavaScript runtime |
| **PostgreSQL** | 16-alpine | Relational database |
| **Drizzle ORM** | 0.45.1 | Type-safe database queries |
| **pdflatex** | System | LaTeX to PDF compilation |
| **Google Gemini AI** | 2.5-flash | AI code generation |

### 2.3 Development Tools

- **ESLint** - Code linting
- **Drizzle Kit** - Database migrations
- **Docker** - PostgreSQL containerization
- **Vitest** - Unit testing
- **Testing Library** - Component testing

---

## 3. Architecture Patterns

### 3.1 Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│            Presentation Layer (Components)          │
│  - React Components                                 │
│  - UI Logic & Event Handlers                        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│               Application Layer                     │
│  - Custom Hooks (use-compile, use-debounce)        │
│  - State Management (Zustand stores)                │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Service Layer                          │
│  - ProjectService                                   │
│  - AIService                                        │
│  - TemplateService                                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│            Repository Layer                         │
│  - ProjectRepository (Data Access)                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Data Layer                             │
│  - Drizzle ORM                                      │
│  - PostgreSQL Database                              │
└─────────────────────────────────────────────────────┘
```

### 3.2 Repository Pattern

**Separation of Concerns:**
- **Repository**: Raw database operations (CRUD)
- **Service**: Business logic, validation, error handling
- **API Route**: HTTP handling, request/response formatting
- **Component**: UI rendering and user interaction

**Example Flow:**
```typescript
Component → Hook → Service → Repository → Database
         ← Hook ← Service ← Repository ← Database
```

### 3.3 Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes (login, signup)
│   ├── (dashboard)/         # Main app routes
│   │   ├── layout.tsx       # Shared dashboard layout
│   │   ├── project/[id]/    # Dynamic project editor
│   │   └── templates/       # Template gallery
│   └── api/                 # API Routes (Backend)
│       ├── compile/         # LaTeX compilation endpoint
│       ├── ai/edit/         # AI editing endpoint
│       ├── projects/        # Project CRUD endpoints
│       └── templates/       # Template CRUD endpoints
│
├── components/              # React Components
│   ├── editor/             # Editor-specific components
│   ├── preview/            # PDF preview component
│   ├── shared/             # Shared UI components
│   ├── templates/          # Template-related components
│   └── ui/                 # shadcn/ui components
│
├── hooks/                  # Custom React Hooks
│   ├── use-compile.ts      # LaTeX compilation hook
│   └── use-debounce.ts     # Debounce utility hook
│
├── lib/                    # Shared Utilities
│   ├── db/                 # Database configuration
│   │   ├── index.ts        # Drizzle client setup
│   │   └── schema.ts       # Database schema definitions
│   ├── constants.ts        # App-wide constants
│   ├── env.ts              # Environment variable validation
│   ├── errors.ts           # Custom error classes
│   └── utils.ts            # Utility functions
│
├── repositories/           # Data Access Layer
│   └── project-repository.ts
│
├── services/               # Business Logic Layer
│   ├── ai-service.ts       # AI integration logic
│   ├── project-service.ts  # Project business logic
│   └── template-service.ts # Template management
│
├── stores/                 # State Management (Zustand)
│   └── editor-store.ts     # Editor UI state
│
├── templates/              # Resume Templates
│   ├── index.ts            # Template exports
│   ├── manifests.ts        # Template metadata
│   └── [template-name].ts  # Individual templates
│
└── types/                  # TypeScript Type Definitions
    └── index.ts
```

---

## 4. Core Workflows

### 4.1 Project Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant API
    participant DB

    User->>Browser: Click "New Project"
    Browser->>Browser: Navigate to /project/new
    Browser->>Browser: Load default LaTeX template
    User->>Browser: Edit LaTeX content
    User->>Browser: Click "Save"
    Browser->>API: POST /api/projects
    API->>DB: INSERT project
    DB-->>API: Return project with ID
    API-->>Browser: Return { data: project }
    Browser->>Browser: Navigate to /project/{id}
```

### 4.2 Project Loading Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant API
    participant DB

    User->>Browser: Visit /project/{id}
    Browser->>API: GET /api/projects/{id}
    API->>DB: SELECT project WHERE id=?
    DB-->>API: Return project data
    API-->>Browser: Return { data: { id, name, content } }
    Browser->>Browser: Render editor with content
```

### 4.3 Auto-Save Flow

```mermaid
sequenceDiagram
    participant User
    participant Editor
    participant Hook
    participant API
    participant DB

    User->>Editor: Type LaTeX code
    Editor->>Hook: onChange(newContent)
    Hook->>Hook: Debounce 500ms
    Note over Hook: Wait for typing to stop
    Hook->>API: PATCH /api/projects/{id}
    API->>DB: UPDATE projects SET content=?, updatedAt=NOW()
    DB-->>API: Success
    API-->>Hook: { data: updatedProject }
    Hook->>Browser: Show "Saved" indicator
```

---

## 5. LaTeX Compilation & PDF Generation

### 5.1 Compilation Architecture

**This is the CORE functionality of the application.**

#### Process Overview

```
User Clicks "Compile"
        │
        ▼
┌───────────────────────────┐
│ 1. Client Request         │
│  - Validate content size  │
│  - Send to /api/compile   │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ 2. Server Validation      │
│  - Zod schema check       │
│  - Content < 500KB        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ 3. File System Setup      │
│  - Create temp directory  │
│  - Write main.tex file    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ 4. LaTeX Compilation      │
│  - Spawn pdflatex process │
│  - Set 60s timeout        │
│  - Capture stdout/stderr  │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ 5. Result Processing      │
│  - Read main.pdf          │
│  - Convert to Base64      │
│  - Create data URL        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ 6. Cleanup                │
│  - Delete temp directory  │
│  - Return PDF to client   │
└───────────────────────────┘
```

### 5.2 Compilation API Implementation

**File: `/src/app/api/compile/route.ts`**

#### Request Schema
```typescript
{
  projectId: string,      // UUID of the project
  content: string         // LaTeX source code (max 500KB)
}
```

#### Response Schema (Success)
```typescript
{
  data: {
    pdfUrl: string,       // Base64-encoded PDF data URL
    log: string           // Compilation output logs
  }
}
```

#### Response Schema (Error)
```typescript
{
  error: {
    code: "VALIDATION_ERROR" | "COMPILE_ERROR" | "INTERNAL_ERROR",
    message: string,
    details?: object      // Additional error context
  }
}
```

### 5.3 Detailed Compilation Process

#### Step 1: Request Validation
```typescript
const CompileRequestSchema = z.object({
  projectId: z.string(),
  content: z.string().max(MAX_CONTENT_SIZE), // 500KB limit
});

const parsed = CompileRequestSchema.safeParse(body);
```

**Purpose:**
- Prevent DoS attacks with large payloads
- Ensure valid project ID format
- Validate request structure

#### Step 2: Temporary Workspace Creation
```typescript
const jobId = randomUUID();
const workDir = join(tmpdir(), "latex-compile", jobId);
await mkdir(workDir, { recursive: true });
```

**Directory Structure:**
```
/tmp/latex-compile/{jobId}/
├── main.tex          # User's LaTeX source
├── main.aux          # Auxiliary file (generated)
├── main.log          # Compilation log (generated)
└── main.pdf          # Output PDF (generated)
```

**Key Points:**
- Each compilation gets isolated directory
- Uses OS temp directory (`/tmp` on Unix, `%TEMP%` on Windows)
- Prevents file conflicts between concurrent compilations
- UUID ensures uniqueness

#### Step 3: LaTeX Source File Creation
```typescript
const texFile = join(workDir, "main.tex");
await writeFile(texFile, content, "utf-8");
```

**Encoding:**
- UTF-8 encoding for international character support
- Handles special LaTeX characters (é, ñ, ü, etc.)

#### Step 4: pdflatex Execution
```typescript
const args = [
  "-interaction=nonstopmode",      // Don't pause on errors
  "-halt-on-error",                 // Stop at first error
  "-output-directory=" + workDir,   // Output to temp directory
  filename,                         // Input file (main.tex)
];

const proc = spawn("pdflatex", args, {
  cwd: workDir,                     // Working directory
  timeout: COMPILE_TIMEOUT_MS,      // 60-second timeout
});
```

**pdflatex Arguments Explained:**

| Argument | Purpose |
|----------|---------|
| `-interaction=nonstopmode` | Non-interactive mode - doesn't wait for user input on errors |
| `-halt-on-error` | Stops compilation at first error instead of continuing |
| `-output-directory=` | Specifies where to write output files |
| `filename` | The `.tex` file to compile |

**Process Management:**
- Spawns child process with `child_process.spawn()`
- Captures stdout and stderr streams
- Enforces 60-second timeout to prevent hanging
- Runs in isolated working directory

#### Step 5: Output Stream Handling
```typescript
let stdout = "";
let stderr = "";

proc.stdout.on("data", (data) => {
  stdout += data.toString();
});

proc.stderr.on("data", (data) => {
  stderr += data.toString();
});

proc.on("close", (code) => {
  const log = stdout + "\n" + stderr;
  resolve({
    success: code === 0,    // Exit code 0 = success
    log,                    // Combined output
  });
});
```

**Exit Codes:**
- `0` - Compilation successful
- `1` - LaTeX errors found
- `124` - Timeout (killed by system)

**Error Handling:**
```typescript
proc.on("error", (error) => {
  resolve({
    success: false,
    log: `Failed to start pdflatex: ${error.message}. Make sure LaTeX is installed.`,
  });
});
```

Common errors:
- `ENOENT` - pdflatex not found (not installed)
- `EACCES` - Permission denied
- `ENOMEM` - Out of memory

#### Step 6: PDF Processing
```typescript
const pdfPath = join(workDir, "main.pdf");
const pdfBuffer = await readFile(pdfPath);
const pdfBase64 = pdfBuffer.toString("base64");
const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;
```

**Data URL Format:**
```
data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iaiA8PAovVH...
```

**Why Base64?**
- No separate file storage needed
- Embedded in JSON response
- Works directly in `<iframe>` src attribute
- No CORS issues

**Size Considerations:**
- Base64 encoding increases size by ~33%
- 500KB LaTeX → ~2MB PDF → ~2.7MB Base64
- Acceptable for typical resumes (1-5 pages)

#### Step 7: Cleanup
```typescript
await rm(workDir, { recursive: true, force: true }).catch(() => {});
```

**Cleanup Strategy:**
- Deletes entire temporary directory
- Removes all generated files (.aux, .log, .pdf)
- `.catch(() => {})` - Graceful failure (doesn't break response)
- Prevents disk space exhaustion

### 5.4 Compilation Error Handling

#### Types of Errors

1. **Syntax Errors** (Most Common)
```latex
\begin{document}
\section{Test     % Missing closing brace
\end{document}
```
Exit code: 1, returns compilation log with error details

2. **Missing Packages**
```latex
\usepackage{nonexistent}
```
Error: `File 'nonexistent.sty' not found`

3. **Timeout**
```latex
\def\loop{\loop}  % Infinite loop
\loop
```
Killed after 60 seconds

4. **System Errors**
- pdflatex not installed
- Out of memory
- Permission issues

### 5.5 PDF Preview Architecture

**Client-Side Rendering:**

```typescript
// components/preview/PdfPreview.tsx
<iframe
  src={pdfUrl}  // data:application/pdf;base64,...
  className="w-full h-full"
/>
```

**Browser PDF Rendering:**
- Chrome/Edge: Built-in PDF viewer
- Firefox: Built-in PDF viewer
- Safari: Built-in PDF viewer
- Fallback: Download link if browser doesn't support

**Advantages:**
- Zero dependencies (no pdf.js needed)
- Native browser rendering
- Zoom, search, print built-in
- Consistent cross-browser experience

### 5.6 Performance Optimizations

#### 1. Debounced Compilation
```typescript
// User stops typing → Wait 500ms → Compile
const debouncedCompile = useDebouncedCallback(
  () => compile(content),
  500  // milliseconds
);
```

#### 2. Parallel Processing
- Multiple users can compile simultaneously
- Each gets isolated temp directory
- Server can handle concurrent requests

#### 3. Memory Management
```typescript
// Constraints in docker-compose.yml
mem_limit: 512m    // Max 512MB RAM per compilation
cpus: 1            // Single CPU core
```

#### 4. Output Caching (Future)
```typescript
// Potential optimization:
const cacheKey = crypto.createHash('sha256').update(content).digest('hex');
// Check cache before compiling
```

---

## 6. AI Integration

### 6.1 AI Architecture Overview

```
User Selects Code → Presses Cmd+K → Types Prompt
                           │
                           ▼
                  ┌────────────────────┐
                  │  CodeMirror AI     │
                  │   Extension        │
                  └─────────┬──────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Gather Context        │
              │ - Selected text         │
              │ - Code before (500 ch)  │
              │ - Code after (500 ch)   │
              └─────────┬───────────────┘
                        │
                        ▼
              ┌─────────────────────────┐
              │  POST /api/ai/edit      │
              │  {                      │
              │    selection,           │
              │    codeBefore,          │
              │    codeAfter,           │
              │    prompt               │
              │  }                      │
              └─────────┬───────────────┘
                        │
                        ▼
              ┌─────────────────────────┐
              │   AI Service            │
              │  (Gemini 2.5 Flash)     │
              └─────────┬───────────────┘
                        │
                        ▼
              ┌─────────────────────────┐
              │   Stream Response       │
              │   (Server-Sent Events)  │
              └─────────┬───────────────┘
                        │
                        ▼
              ┌─────────────────────────┐
              │   Inline Preview        │
              │   with Accept/Reject    │
              └─────────────────────────┘
```

### 6.2 AI Service Implementation

**File: `/src/services/ai-service.ts`**

#### System Prompt
```typescript
const LATEX_SYSTEM_PROMPT = `You are an expert LaTeX editor assistant. Your task is to modify LaTeX code based on user instructions.

CRITICAL RULES:
1. Return ONLY the replacement code - no explanations, no markdown code blocks, no extra text
2. Preserve the document structure and formatting style
3. Use valid LaTeX commands and syntax
4. Maintain consistent indentation with the surrounding code
5. If adding new packages, only include the \\usepackage command if absolutely necessary
6. Keep the same document class and style unless explicitly asked to change it`;
```

**Design Rationale:**
- **"ONLY replacement code"** - Prevents wrapping in markdown blocks
- **Preserve structure** - Maintains document consistency
- **Valid LaTeX** - Ensures compilable output
- **Minimal packages** - Avoids dependency bloat

#### Request Building
```typescript
private buildUserMessage(request: AIEditRequest): string {
  return `SELECTED CODE TO MODIFY:
\`\`\`latex
${request.selection}
\`\`\`

CODE BEFORE SELECTION:
\`\`\`latex
${request.codeBefore.slice(-500)}  // Last 500 characters
\`\`\`

CODE AFTER SELECTION:
\`\`\`latex
${request.codeAfter.slice(0, 500)}  // First 500 characters
\`\`\`

USER INSTRUCTION: ${request.prompt}

Remember: Return ONLY the replacement code, nothing else.`;
}
```

**Context Window:**
- Selection: Full text (unlimited)
- Before: Last 500 characters
- After: First 500 characters
- Total: ~1000 chars context + selection

**Why 500 characters?**
- Enough context for most edits
- Keeps token usage low
- Fits in Gemini's context window
- Typical LaTeX commands are 50-200 chars

#### Streaming Implementation
```typescript
async *streamEdit(request: AIEditRequest): AsyncGenerator<string> {
  const userMessage = this.buildUserMessage(request);
  const model = this.getModel();

  const result = await model.generateContentStream(userMessage);

  for await (const chunk of result.stream) {
    const content = chunk.text();
    if (content) {
      yield content;  // Stream to client
    }
  }
}
```

**Streaming Benefits:**
- Real-time feedback (user sees text appear)
- Lower perceived latency
- Can cancel mid-generation
- Better UX for long responses

### 6.3 AI API Endpoint

**File: `/src/app/api/ai/edit/route.ts`**

#### Server-Sent Events (SSE) Format
```typescript
const stream = aiService.streamEdit({ selection, codeBefore, codeAfter, prompt });

const encoder = new TextEncoder();
const readable = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      );
    }
    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
    controller.close();
  },
});

return new Response(readable, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

**SSE Message Format:**
```
data: {"content":"\\section"}\n\n
data: {"content":"{"}\n\n
data: {"content":"Heading"}\n\n
data: {"content":"}"}\n\n
data: [DONE]\n\n
```

### 6.4 Client-Side AI Integration

**File: `/src/components/editor/CodeMirrorEditor.tsx`**

```typescript
import { aiExtension } from "@marimo-team/codemirror-ai";

async function handleAIPrompt({ prompt, selection, codeBefore, codeAfter }) {
  const response = await fetch("/api/ai/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, selection, codeBefore, codeAfter }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") break;
        
        const parsed = JSON.parse(data);
        if (parsed.content) {
          result += parsed.content;  // Accumulate response
        }
      }
    }
  }

  return result;  // Return complete replacement text
}
```

**User Experience:**
1. User selects LaTeX code
2. Presses `Cmd/Ctrl + K`
3. AI prompt input appears
4. User types instruction (e.g., "make this a bullet list")
5. AI streams response inline
6. Preview shows diff (red = removed, green = added)
7. User clicks "Accept" or "Reject"

### 6.5 AI Configuration

**Model Selection:**
```typescript
getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",  // Fast, cost-effective
    systemInstruction: LATEX_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.3,          // Low creativity (precise edits)
      maxOutputTokens: 2000,     // ~1500 words max
    },
  });
}
```

**Why Gemini 2.5 Flash?**
- Fast response times (< 2 seconds)
- Good LaTeX understanding
- Free tier: 15 requests/minute
- Cheaper than GPT-4

**Temperature = 0.3:**
- Lower temperature = more deterministic
- Less creativity, more consistency
- Better for code editing (vs. creative writing)

---

## 7. Database Architecture

### 7.1 Schema Design

**File: `/src/lib/db/schema.ts`**

```typescript
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Untitled Project"),
  content: text("content").notNull().default(""),
  userId: text("user_id"),              // Future: auth integration
  templateId: text("template_id"),       // Template reference
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const compilations = pgTable("compilations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  pdfUrl: text("pdf_url"),
  log: text("log"),
  duration: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 7.2 Entity Relationship Diagram

```
┌─────────────────────────┐
│       projects          │
├─────────────────────────┤
│ id (PK)        UUID     │
│ name           TEXT     │
│ content        TEXT     │ ← LaTeX source code
│ userId         TEXT     │ ← Future: link to users
│ templateId     TEXT     │ ← Template reference
│ createdAt      TIMESTAMP│
│ updatedAt      TIMESTAMP│
└───────────┬─────────────┘
            │
            │ 1:N
            │
┌───────────▼─────────────┐
│     compilations        │
├─────────────────────────┤
│ id (PK)        UUID     │
│ projectId (FK) UUID     │ ← ON DELETE CASCADE
│ status         TEXT     │ ← 'pending', 'success', 'error'
│ pdfUrl         TEXT     │ ← Base64 data URL
│ log            TEXT     │ ← Compilation logs
│ duration       INTEGER  │ ← Milliseconds
│ createdAt      TIMESTAMP│
└─────────────────────────┘
```

### 7.3 Database Operations

#### Drizzle ORM Configuration
**File: `/drizzle.config.ts`**
```typescript
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || 
         "postgresql://latex:latex@127.0.0.1:5432/latex_ai_editor",
  },
});
```

#### Repository Pattern Example
**File: `/src/repositories/project-repository.ts`**
```typescript
class ProjectRepository {
  async findById(id: string) {
    return db.query.projects.findFirst({
      where: eq(projects.id, id),
    });
  }

  async create(data: NewProject) {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async update(id: string, data: Partial<NewProject>) {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }
}
```

**Type Safety:**
```typescript
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

### 7.4 Migration Strategy

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations to database
npm run db:push

# Open Drizzle Studio (DB GUI)
npm run db:studio
```

**Migration Files:**
```
drizzle/
├── meta/
│   └── _journal.json
└── 0000_initial.sql
```

---

## 8. Component Architecture

### 8.1 Component Hierarchy

```
App Layout (layout.tsx)
│
├─ (auth) Layout
│  ├─ Login Page
│  └─ Signup Page
│
└─ (dashboard) Layout
   ├─ Header (shared)
   │
   ├─ Templates Page
   │  └─ TemplateCard[]
   │
   └─ Project Page [id]
      ├─ Header
      │  ├─ Project Name
      │  ├─ Compile Button
      │  └─ Save Button
      │
      └─ ResizablePanelGroup
         ├─ EditorPane
         │  └─ CodeMirrorEditor
         │     ├─ Syntax Highlighting
         │     ├─ AI Extension
         │     └─ Autocomplete
         │
         └─ PdfPreview
            └─ iframe (PDF viewer)
```

### 8.2 Key Components

#### CodeMirrorEditor Component
**File: `/src/components/editor/CodeMirrorEditor.tsx`**

**Extensions Used:**
```typescript
extensions: [
  lineNumbers(),                      // Line numbers in gutter
  highlightActiveLineGutter(),        // Highlight active line number
  highlightActiveLine(),              // Highlight active line background
  history(),                          // Undo/redo
  foldGutter(),                       // Code folding
  indentOnInput(),                    // Auto-indent
  bracketMatching(),                  // Matching brackets
  closeBrackets(),                    // Auto-close brackets
  autocompletion(),                   // Autocomplete
  syntaxHighlighting(defaultHighlightStyle),
  latex(),                            // LaTeX language support
  aiExtension(handleAIPrompt),        // AI inline editing
  highlightSelectionMatches(),        // Highlight matching text
  searchKeymap,                       // Cmd+F search
  EditorView.updateListener.of(handleChange),
  theme,                              // Custom theme
]
```

**Keyboard Shortcuts:**
- `Cmd/Ctrl + K` - AI prompt
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo
- `Cmd/Ctrl + F` - Search
- `Cmd/Ctrl + /` - Toggle comment
- `Tab` - Indent

#### PdfPreview Component
**File: `/src/components/preview/PdfPreview.tsx`**

```typescript
export function PdfPreview({ url, isLoading }: PdfPreviewProps) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!url) {
    return <EmptyState message="Click 'Compile' to generate PDF" />;
  }

  return (
    <iframe
      src={url}
      className="w-full h-full border-0"
      title="PDF Preview"
    />
  );
}
```

**States:**
1. **Loading** - Spinner while compiling
2. **Empty** - Placeholder before first compile
3. **Success** - iframe with PDF
4. **Error** - Error message with retry button

---

## 9. API Design

### 9.1 REST API Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| `GET` | `/api/projects` | List all projects | - | `{ data: Project[] }` |
| `POST` | `/api/projects` | Create project | `{ name?, content?, templateId? }` | `{ data: Project }` |
| `GET` | `/api/projects/:id` | Get project | - | `{ data: Project }` |
| `PATCH` | `/api/projects/:id` | Update project | `{ name?, content? }` | `{ data: Project }` |
| `DELETE` | `/api/projects/:id` | Delete project | - | `{ success: true }` |
| `POST` | `/api/compile` | Compile LaTeX | `{ projectId, content }` | `{ data: { pdfUrl, log } }` |
| `POST` | `/api/ai/edit` | AI code edit | `{ selection, codeBefore, codeAfter, prompt }` | SSE stream |
| `GET` | `/api/templates` | List templates | - | `{ data: Template[] }` |

### 9.2 Error Response Format

```typescript
{
  error: {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "COMPILE_ERROR" | "INTERNAL_ERROR",
    message: string,
    details?: any
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `422` - Unprocessable Entity (compilation error)
- `500` - Internal Server Error

---

## 10. State Management

### 10.1 Client State (Zustand)

**File: `/src/stores/editor-store.ts`**

```typescript
type EditorStore = {
  compileState: CompileState;
  setCompileState: (state: CompileState) => void;
  pdfUrl: string | null;
  setPdfUrl: (url: string | null) => void;
  isPreviewVisible: boolean;
  togglePreview: () => void;
  activeTab: "source" | "output";
  setActiveTab: (tab: "source" | "output") => void;
};
```

**Usage:**
```typescript
const { compileState, setPdfUrl } = useEditorStore();
```

### 10.2 Server State (TanStack Query)

**File: `/src/components/providers.tsx`**

```typescript
<QueryClientProvider client={queryClient}>
  {children}
</QueryClientProvider>
```

**Potential Queries (Future):**
```typescript
const { data: project } = useQuery({
  queryKey: ['project', id],
  queryFn: () => fetchProject(id),
});

const { mutate: saveProject } = useMutation({
  mutationFn: updateProject,
  onSuccess: () => queryClient.invalidateQueries(['project', id]),
});
```

---

## 11. Security Considerations

### 11.1 LaTeX Compilation Security

**Threats:**
1. **File System Access** - Read arbitrary files
   ```latex
   \input{/etc/passwd}
   ```
   
2. **Command Execution** - Run shell commands
   ```latex
   \immediate\write18{rm -rf /}
   ```
   
3. **Resource Exhaustion** - Infinite loops, large memory usage

**Mitigations:**

1. **Disable shell escape:**
   ```typescript
   // pdflatex runs without -shell-escape flag
   // Prevents \write18 command execution
   ```

2. **Timeout enforcement:**
   ```typescript
   spawn("pdflatex", args, {
     timeout: 60_000,  // Kill after 60 seconds
   });
   ```

3. **Isolated temp directories:**
   ```typescript
   // Each compilation in separate directory
   // No access to other users' files
   const workDir = join(tmpdir(), "latex-compile", randomUUID());
   ```

4. **Content size limits:**
   ```typescript
   content: z.string().max(500_000),  // 500KB max
   ```

5. **Docker isolation (future):**
   ```yaml
   # docker-compose.yml
   latex-compiler:
     network_mode: none    # No network access
     mem_limit: 512m       # RAM limit
     read_only: true       # Read-only filesystem
   ```

### 11.2 Input Validation

**All API inputs validated with Zod:**
```typescript
const CompileRequestSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().max(MAX_CONTENT_SIZE),
});
```

**SQL Injection Prevention:**
- Drizzle ORM with parameterized queries
- No raw SQL queries

**XSS Prevention:**
- React auto-escapes output
- PDF served as Base64 data URL (sandboxed iframe)

---

## 12. Deployment Architecture

### 12.1 Production Architecture (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                      Cloudflare / Vercel                │
│                         (CDN + SSL)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Next.js App (Vercel)                    │
│  - API Routes                                           │
│  - Server Components                                    │
│  - Static Assets                                        │
└────────────┬──────────────────────┬─────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────┐   ┌──────────────────────┐
│  PostgreSQL        │   │  LaTeX Compiler      │
│  (Supabase/Neon)   │   │  (Separate Server)   │
│                    │   │  - pdflatex          │
│  - Projects        │   │  - Docker container  │
│  - Compilations    │   │  - Isolated sandbox  │
└────────────────────┘   └──────────────────────┘
```

### 12.2 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# AI
GEMINI_API_KEY=your_gemini_api_key

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### 12.3 Deployment Options

#### Option 1: Vercel (Recommended for App)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod
```

**Limitations:**
- No pdflatex on Vercel (need separate service)
- 10-second function timeout (Edge: 30s)

**Solution:**
- Deploy Next.js to Vercel
- Deploy LaTeX compiler to separate service (Render, Railway, DigitalOcean)

#### Option 2: Docker Compose (Full Stack)
```bash
docker compose up -d
```

**Services:**
- `postgres` - Database
- `latex-compiler` - Isolated LaTeX environment
- `app` - Next.js application

#### Option 3: Kubernetes (Enterprise)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: latex-compiler
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: compiler
        image: latex-compiler:latest
        resources:
          limits:
            memory: "512Mi"
            cpu: "1000m"
```

---

## 13. Performance Optimizations

### 13.1 Frontend Optimizations

1. **Code Splitting**
   - Next.js automatic code splitting
   - Lazy load PDF preview component

2. **Debounced Auto-Save**
   ```typescript
   const debouncedSave = useDebouncedCallback(save, 2000);
   ```

3. **Optimistic Updates**
   ```typescript
   // Update UI immediately, sync to server later
   setContent(newContent);
   debouncedSave(newContent);
   ```

4. **Virtual Scrolling (Future)**
   - For large template galleries
   - Render only visible items

### 13.2 Backend Optimizations

1. **Compilation Caching (Future)**
   ```typescript
   const hash = crypto.createHash('sha256').update(content).digest('hex');
   const cached = await redis.get(`compile:${hash}`);
   if (cached) return cached;
   ```

2. **Database Indexing**
   ```sql
   CREATE INDEX idx_projects_user_id ON projects(user_id);
   CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
   ```

3. **Connection Pooling**
   ```typescript
   // Drizzle with Postgres.js (built-in pooling)
   const client = postgres(DATABASE_URL, { max: 10 });
   ```

4. **Concurrent Compilation**
   - Uses Node.js event loop
   - Non-blocking I/O
   - Multiple users compile simultaneously

---

## 14. Development Workflows

### 14.1 Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd latex-ai-editor

# 2. Install dependencies
npm install

# 3. Start PostgreSQL
docker compose -f docker/docker-compose.yml up -d postgres

# 4. Setup database
npm run db:push

# 5. Create .env file
echo "DATABASE_URL=postgresql://latex:latex@127.0.0.1:5432/latex_ai_editor" > .env
echo "GEMINI_API_KEY=your_key_here" >> .env

# 6. Install LaTeX (macOS)
brew install --cask basictex

# 7. Start dev server
npm run dev
```

### 14.2 Testing Strategy

**Unit Tests (Future):**
```typescript
// tests/services/project-service.test.ts
describe('ProjectService', () => {
  it('should create project', async () => {
    const project = await projectService.create({ name: 'Test' });
    expect(project.id).toBeDefined();
  });
});
```

**Integration Tests:**
```typescript
// tests/api/compile.test.ts
it('should compile valid LaTeX', async () => {
  const response = await fetch('/api/compile', {
    method: 'POST',
    body: JSON.stringify({ content: '\\documentclass{article}...' }),
  });
  expect(response.ok).toBe(true);
});
```

**E2E Tests (Playwright):**
```typescript
test('user can create and compile project', async ({ page }) => {
  await page.goto('/project/new');
  await page.fill('.editor', '\\section{Test}');
  await page.click('button:has-text("Compile")');
  await expect(page.locator('iframe')).toBeVisible();
});
```

### 14.3 Git Workflow

```bash
# Feature branch
git checkout -b feature/ai-autocomplete

# Commit with conventional commits
git commit -m "feat(ai): add autocomplete suggestions"

# Push and create PR
git push origin feature/ai-autocomplete
```

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation

---

## 15. Future Roadmap

### 15.1 Phase 1: Core Features ✅ (Current)

- [x] Real-time LaTeX editor
- [x] Instant PDF preview
- [x] Server-side compilation
- [x] Basic project management (CRUD)
- [x] AI inline editing (Gemini integration)

### 15.2 Phase 2: AI Enhancements (Q2 2026)

- [ ] **AI Autocomplete**
  - Tab-triggered completions
  - Context-aware suggestions
  - Package and command suggestions

- [ ] **Multi-line AI Edits**
  - Refactor entire sections
  - AI-powered formatting

- [ ] **AI Chat Panel**
  - Ask questions about LaTeX
  - Debugging assistance

### 15.3 Phase 3: Templates & Collaboration (Q3 2026)

- [ ] **Resume Templates**
  - 10+ professional templates
  - One-click customization
  - Export to PDF/Docx

- [ ] **Real-time Collaboration**
  - WebSocket-based sync
  - Cursor positions
  - Comments and suggestions

- [ ] **Version Control**
  - Git-like versioning
  - Diff viewer
  - Restore previous versions

### 15.4 Phase 4: Enterprise Features (Q4 2026)

- [ ] **Authentication & Authorization**
  - OAuth (Google, GitHub)
  - Team workspaces
  - Role-based access control

- [ ] **Advanced Editor**
  - Vim/Emacs keybindings
  - Custom snippets
  - Macro recording

- [ ] **Cloud Storage**
  - S3/R2 for PDFs
  - Asset management (images, fonts)

- [ ] **Analytics Dashboard**
  - Compilation statistics
  - User activity tracking
  - Performance monitoring

### 15.5 Technical Debt & Improvements

- [ ] **Compilation Caching**
  - Redis cache for PDFs
  - Content hashing

- [ ] **WebAssembly LaTeX**
  - Client-side compilation option
  - Faster preview updates
  - Reduced server load

- [ ] **Progressive Web App (PWA)**
  - Offline editing
  - Service worker caching
  - Install as desktop app

- [ ] **Accessibility (a11y)**
  - Screen reader support
  - Keyboard navigation
  - High contrast themes

- [ ] **Internationalization (i18n)**
  - Multi-language UI
  - RTL support

---

## Appendix A: LaTeX Compilation Deep Dive

### Common LaTeX Errors

1. **Missing \end{document}**
   ```
   ! LaTeX Error: \begin{document} ended by \end{enumerate}.
   ```

2. **Undefined Control Sequence**
   ```
   ! Undefined control sequence.
   l.10 \secton{Introduction}
   ```

3. **Missing $ inserted**
   ```
   ! Missing $ inserted.
   l.15 E = mc^2
   ```

### pdflatex Compilation Passes

LaTeX typically requires **2-3 passes** for complete rendering:

1. **First Pass**: Generate `.aux` file with references
2. **Second Pass**: Resolve cross-references
3. **Third Pass** (if needed): Finalize bibliography, table of contents

**Current Implementation:** Single pass (sufficient for resumes)

**Future Enhancement:**
```typescript
// Multi-pass compilation for complex documents
for (let i = 0; i < 3; i++) {
  await compileLaTeX(workDir, "main.tex");
}
```

---

## Appendix B: Gemini API Details

### Rate Limits (Free Tier)
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per minute

### Pricing (Paid Tier)
- $0.00025 per 1K input tokens
- $0.0005 per 1K output tokens
- Typical edit: ~500 tokens = $0.000375

### Model Comparison

| Model | Speed | Quality | Cost | Use Case |
|-------|-------|---------|------|----------|
| Gemini 2.5 Flash | ⚡⚡⚡ | ⭐⭐⭐ | $ | **Current (inline edits)** |
| Gemini 2.5 Pro | ⚡⚡ | ⭐⭐⭐⭐⭐ | $$$ | Complex refactoring |
| Gemini 1.5 Flash | ⚡⚡⚡ | ⭐⭐ | $ | Legacy fallback |

---

## Appendix C: Useful Commands

### Database Commands
```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Reset database
docker compose down -v
docker compose up -d postgres
npm run db:push
```

### LaTeX Commands
```bash
# Check pdflatex version
pdflatex --version

# Compile manually
pdflatex -interaction=nonstopmode main.tex

# Install missing packages (TeX Live)
tlmgr install <package-name>
```

### Docker Commands
```bash
# Start services
docker compose -f docker/docker-compose.yml up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild
docker compose build --no-cache
```

---

## Appendix D: Troubleshooting

### "pdflatex not found"

**macOS:**
```bash
brew install --cask basictex
sudo tlmgr update --self
```

**Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install texlive-latex-base
```

**Windows:**
- Download MiKTeX from https://miktex.org/download
- Add to PATH: `C:\Program Files\MiKTeX\miktex\bin\x64`

### "Database connection failed"

1. Check PostgreSQL is running:
   ```bash
   docker compose ps
   ```

2. Verify DATABASE_URL in `.env`:
   ```bash
   cat .env | grep DATABASE_URL
   ```

3. Test connection:
   ```bash
   psql postgresql://latex:latex@127.0.0.1:5432/latex_ai_editor
   ```

### "Compilation timeout"

- Reduce LaTeX content complexity
- Check for infinite loops in LaTeX code
- Increase timeout (not recommended):
  ```typescript
  const COMPILE_TIMEOUT_MS = 120_000; // 2 minutes
  ```

---

## Contributing

This architecture document should be updated whenever:
1. New features are added
2. Technology stack changes
3. API endpoints are modified
4. Deployment process changes

**Document Maintainers:** Engineering team  
**Review Cycle:** Quarterly or on major releases

---

## Glossary

- **SSE**: Server-Sent Events (one-way HTTP streaming)
- **ORM**: Object-Relational Mapping (database abstraction)
- **UUID**: Universally Unique Identifier
- **Base64**: Binary-to-text encoding
- **pdflatex**: LaTeX to PDF compiler
- **CodeMirror**: Extensible code editor library
- **Drizzle**: TypeScript ORM for SQL databases
- **Gemini**: Google's generative AI model

---

**End of Architecture Documentation**
