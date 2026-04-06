# LaTeX AI Editor - Design & Coding Standards

This document defines the design rules, coding styles, and architectural patterns for the LaTeX AI Editor project. All code contributions should follow these standards for consistency and maintainability.

---

## Table of Contents

1. [UI/Design System](#uidesign-system)
2. [TypeScript Conventions](#typescript-conventions)
3. [React Patterns](#react-patterns)
4. [Backend Architecture](#backend-architecture)
5. [API Design](#api-design)
6. [Database Patterns](#database-patterns)
7. [Error Handling](#error-handling)
8. [File & Folder Structure](#file--folder-structure)
9. [Testing Standards](#testing-standards)
10. [Performance Guidelines](#performance-guidelines)

---

## UI/Design System

### Component Library: shadcn/ui

Use **shadcn/ui** as the primary component library. It provides unstyled, accessible components built on Radix UI.

```bash
# Adding components
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

**Rules:**
- Always use shadcn components over custom implementations when available
- Extend shadcn components via the `cn()` utility, never override base styles inline
- Keep component variants in `components/ui/` unchanged; create wrapper components for custom behavior

### Tailwind CSS Conventions

**Class Ordering** (follow this order):
1. Layout (display, position, flex/grid)
2. Sizing (width, height, padding, margin)
3. Typography (font, text)
4. Visual (background, border, shadow)
5. Interactive (hover, focus, transition)

```tsx
// Good
<div className="flex items-center gap-4 p-4 text-sm text-gray-700 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow" />

// Bad - random ordering
<div className="hover:shadow-md p-4 flex bg-white text-sm gap-4 items-center rounded-lg" />
```

**Spacing Scale:**
- Use Tailwind's default spacing scale (4px base): `p-1` (4px), `p-2` (8px), `p-4` (16px), etc.
- Consistent gaps: `gap-2` for tight, `gap-4` for normal, `gap-6` for loose

**Color Palette:**
```tsx
// Use semantic colors defined in tailwind.config.ts
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: { DEFAULT: "hsl(var(--primary))", foreground: "..." },
  secondary: { ... },
  muted: { ... },
  accent: { ... },
  destructive: { ... },
}

// Usage
<Button variant="primary" />      // Primary actions (Compile, Save)
<Button variant="secondary" />    // Secondary actions
<Button variant="destructive" />  // Delete, dangerous actions
<Button variant="ghost" />        // Tertiary, icon buttons
```

**Dark Mode:**
- All colors must support dark mode via CSS variables
- Use `dark:` prefix sparingly; prefer semantic color tokens
- Test all UI in both light and dark modes

### Layout Patterns

**Page Layout:**
```tsx
// Standard page with sidebar
<div className="flex h-screen">
  <aside className="w-64 border-r bg-muted/50">...</aside>
  <main className="flex-1 overflow-auto">...</main>
</div>

// Editor layout (two-pane)
<div className="flex h-screen">
  <div className="flex-1 min-w-0">  {/* Editor */}
    <EditorPane />
  </div>
  <ResizeHandle />
  <div className="w-[45%] min-w-[300px]">  {/* Preview */}
    <PreviewPane />
  </div>
</div>
```

**Responsive Breakpoints:**
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

Mobile-first: write base styles for mobile, add breakpoint modifiers for larger screens.

### Icons

Use **Lucide React** (already included with shadcn):
```tsx
import { FileText, Download, Sparkles, Check, X } from "lucide-react";

<Button>
  <Sparkles className="mr-2 h-4 w-4" />
  AI Edit
</Button>
```

---

## TypeScript Conventions

### Strict Mode

Enable strict TypeScript:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Type Definitions

**Prefer `type` over `interface` for object shapes** (consistency):
```tsx
// Good
type Project = {
  id: string;
  name: string;
  createdAt: Date;
};

// Use interface only for extension/declaration merging
interface Window {
  __INITIAL_DATA__: AppData;
}
```

**Discriminated Unions for State:**
```tsx
type CompileState =
  | { status: "idle" }
  | { status: "compiling"; startedAt: Date }
  | { status: "success"; pdfUrl: string; compiledAt: Date }
  | { status: "error"; message: string; log?: string };

// Usage with exhaustive checking
function renderStatus(state: CompileState) {
  switch (state.status) {
    case "idle": return null;
    case "compiling": return <Spinner />;
    case "success": return <PdfViewer url={state.pdfUrl} />;
    case "error": return <ErrorMessage message={state.message} />;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
```

**Zod for Runtime Validation:**
```tsx
import { z } from "zod";

const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  content: z.string(),
});

type Project = z.infer<typeof ProjectSchema>;

// Validate API responses
const project = ProjectSchema.parse(apiResponse);
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EditorPane`, `TemplateCard` |
| Hooks | camelCase with `use` prefix | `useCompile`, `useProject` |
| Utilities | camelCase | `formatDate`, `cn` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE`, `API_BASE_URL` |
| Types | PascalCase | `Project`, `CompileResult` |
| Files (components) | PascalCase | `EditorPane.tsx` |
| Files (utilities) | kebab-case | `compile-service.ts` |
| Folders | kebab-case | `compile-service/`, `ai-proxy/` |

---

## React Patterns

### Component Structure

```tsx
// ComponentName.tsx

// 1. Imports (external, then internal, then types)
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

// 2. Types (component-specific)
type EditorPaneProps = {
  project: Project;
  onSave: (content: string) => void;
  className?: string;
};

// 3. Component
export function EditorPane({ project, onSave, className }: EditorPaneProps) {
  // 3a. Hooks (state, refs, context, custom hooks)
  const [content, setContent] = useState(project.content);
  const { compile, isCompiling } = useCompile();

  // 3b. Derived state / memoization
  const isDirty = content !== project.content;

  // 3c. Callbacks
  const handleSave = useCallback(() => {
    onSave(content);
  }, [content, onSave]);

  // 3d. Effects (use sparingly)

  // 3e. Render
  return (
    <div className={cn("flex flex-col", className)}>
      ...
    </div>
  );
}
```

### State Management

**Local State First:**
- Use `useState` for component-local state
- Use `useReducer` for complex state with multiple sub-values

**Server State with TanStack Query:**
```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Queries
const { data: project, isLoading } = useQuery({
  queryKey: ["project", projectId],
  queryFn: () => projectService.getById(projectId),
});

// Mutations
const queryClient = useQueryClient();
const saveMutation = useMutation({
  mutationFn: projectService.save,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  },
});
```

**Global UI State with Zustand:**
```tsx
// stores/editor-store.ts
import { create } from "zustand";

type EditorStore = {
  isPreviewVisible: boolean;
  togglePreview: () => void;
  activeTab: "source" | "output";
  setActiveTab: (tab: "source" | "output") => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  isPreviewVisible: true,
  togglePreview: () => set((s) => ({ isPreviewVisible: !s.isPreviewVisible })),
  activeTab: "source",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
```

### Custom Hooks Pattern

Extract reusable logic into custom hooks:

```tsx
// hooks/use-compile.ts
export function useCompile(projectId: string) {
  const [state, setState] = useState<CompileState>({ status: "idle" });

  const compile = useCallback(async (content: string) => {
    setState({ status: "compiling", startedAt: new Date() });
    try {
      const result = await compileService.compile(projectId, content);
      setState({ status: "success", pdfUrl: result.pdfUrl, compiledAt: new Date() });
    } catch (error) {
      setState({ status: "error", message: getErrorMessage(error) });
    }
  }, [projectId]);

  return { ...state, compile };
}
```

### Render Props / Composition over Configuration

Prefer composition:
```tsx
// Good - composable
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {children}
  </DialogContent>
</Dialog>

// Avoid - configuration object
<Dialog
  trigger={<Button>Open</Button>}
  title="Title"
  content={children}
/>
```

---

## Backend Architecture

### Service Layer Pattern

Encapsulate business logic in services, not in API routes:

```
src/
├── services/           # Business logic
│   ├── project-service.ts
│   ├── compile-service.ts
│   └── ai-service.ts
├── repositories/       # Data access
│   ├── project-repository.ts
│   └── template-repository.ts
├── app/api/           # Thin API routes (validation + call service)
```

**Service Example:**
```tsx
// services/compile-service.ts
import { compileQueue } from "@/lib/queue";
import { fileStorage } from "@/lib/storage";
import type { CompileResult } from "@/types";

class CompileService {
  async compile(projectId: string, content: string): Promise<CompileResult> {
    // 1. Save source to storage
    const sourceKey = `projects/${projectId}/main.tex`;
    await fileStorage.put(sourceKey, content);

    // 2. Queue compile job
    const job = await compileQueue.add("compile", {
      projectId,
      sourceKey,
    });

    // 3. Wait for result (or return job ID for polling)
    const result = await job.waitUntilFinished();
    return result;
  }
}

export const compileService = new CompileService();
```

**API Route (thin layer):**
```tsx
// app/api/compile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compileService } from "@/services/compile-service";

const CompileRequestSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().max(500_000), // 500KB limit
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CompileRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await compileService.compile(parsed.data.projectId, parsed.data.content);
  return NextResponse.json(result);
}
```

### Repository Pattern

Abstract database access:

```tsx
// repositories/project-repository.ts
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

class ProjectRepository {
  async findById(id: string) {
    return db.query.projects.findFirst({
      where: eq(projects.id, id),
    });
  }

  async findByUserId(userId: string) {
    return db.query.projects.findMany({
      where: eq(projects.userId, userId),
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
    });
  }

  async create(data: NewProject) {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async update(id: string, data: Partial<Project>) {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }
}

export const projectRepository = new ProjectRepository();
```

### Dependency Injection (Lightweight)

Use module-level singletons with factory functions for testability:

```tsx
// lib/services.ts
import { CompileService } from "@/services/compile-service";
import { AIService } from "@/services/ai-service";
import { fileStorage } from "@/lib/storage";
import { openai } from "@/lib/openai";

// Production instances
export const compileService = new CompileService({ storage: fileStorage });
export const aiService = new AIService({ client: openai });

// For testing, create with mocks:
// new CompileService({ storage: mockStorage })
```

---

## API Design

### REST Conventions

| Action | Method | Path | Body |
|--------|--------|------|------|
| List | GET | `/api/projects` | - |
| Get | GET | `/api/projects/:id` | - |
| Create | POST | `/api/projects` | `{ name, templateId? }` |
| Update | PATCH | `/api/projects/:id` | `{ name?, content? }` |
| Delete | DELETE | `/api/projects/:id` | - |
| Action | POST | `/api/projects/:id/compile` | `{ content }` |

### Response Format

```tsx
// Success
{
  "data": { ... },
  "meta": { "timestamp": "..." }  // optional
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { ... }  // optional, e.g., field errors
  }
}

// List with pagination
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 100
  }
}
```

### Streaming Responses (AI)

For AI completions, use Server-Sent Events (SSE):

```tsx
// app/api/ai/edit/route.ts
export async function POST(req: NextRequest) {
  const { prompt, selection, codeBefore, codeAfter } = await req.json();
  
  const stream = await aiService.streamEdit({ prompt, selection, codeBefore, codeAfter });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

---

## Database Patterns

### Schema Definition (Drizzle)

```tsx
// lib/db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  templateId: text("template_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Migrations

Always use migrations, never push schema changes directly:

```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit migrate
```

---

## Error Handling

### Custom Error Classes

```tsx
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class CompileError extends AppError {
  constructor(message: string, public log?: string) {
    super("COMPILE_ERROR", message, 422, { log });
  }
}
```

### Error Boundary (React)

```tsx
// components/error-boundary.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### Toast Notifications

Use shadcn's toast for user feedback:

```tsx
import { toast } from "sonner";

// Success
toast.success("Project saved");

// Error
toast.error("Failed to compile", {
  description: "Check your LaTeX syntax",
  action: {
    label: "View Log",
    onClick: () => openLog(),
  },
});

// Loading
toast.promise(compileService.compile(content), {
  loading: "Compiling...",
  success: "Compiled successfully",
  error: "Compilation failed",
});
```

---

## File & Folder Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/            # Authenticated routes
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Projects list
│   │   ├── project/[id]/
│   │   │   ├── page.tsx        # Editor
│   │   │   └── loading.tsx
│   │   └── templates/
│   ├── api/
│   │   ├── projects/
│   │   ├── compile/
│   │   └── ai/
│   ├── layout.tsx              # Root layout
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn components (don't modify)
│   ├── editor/                 # Editor-specific components
│   │   ├── EditorPane.tsx
│   │   ├── CodeMirrorEditor.tsx
│   │   └── AIEditOverlay.tsx
│   ├── preview/
│   │   └── PdfPreview.tsx
│   ├── templates/
│   │   ├── TemplateCard.tsx
│   │   └── TemplatePicker.tsx
│   └── shared/                 # Shared components
│       ├── Header.tsx
│       └── Sidebar.tsx
├── hooks/                      # Custom React hooks
│   ├── use-compile.ts
│   ├── use-project.ts
│   └── use-debounce.ts
├── services/                   # Business logic
│   ├── project-service.ts
│   ├── compile-service.ts
│   └── ai-service.ts
├── repositories/               # Data access layer
│   └── project-repository.ts
├── lib/                        # Utilities and configs
│   ├── db/
│   │   ├── index.ts            # Drizzle client
│   │   └── schema.ts
│   ├── storage/                # File storage abstraction
│   ├── queue/                  # Job queue
│   ├── utils.ts                # cn(), formatDate(), etc.
│   └── constants.ts
├── types/                      # Shared TypeScript types
│   └── index.ts
└── templates/                  # Built-in LaTeX templates
    ├── modern-cv/
    │   ├── main.tex
    │   ├── style.sty
    │   └── manifest.json
    └── academic/
```

---

## Testing Standards

### Unit Tests (Vitest)

```tsx
// services/__tests__/compile-service.test.ts
import { describe, it, expect, vi } from "vitest";
import { CompileService } from "../compile-service";

describe("CompileService", () => {
  it("should queue a compile job", async () => {
    const mockStorage = { put: vi.fn() };
    const mockQueue = { add: vi.fn().mockResolvedValue({ waitUntilFinished: () => ({ pdfUrl: "..." }) }) };
    
    const service = new CompileService({ storage: mockStorage, queue: mockQueue });
    const result = await service.compile("project-1", "\\documentclass{article}...");
    
    expect(mockStorage.put).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalledWith("compile", expect.any(Object));
    expect(result.pdfUrl).toBeDefined();
  });
});
```

### Component Tests (Testing Library)

```tsx
// components/__tests__/TemplateCard.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateCard } from "../TemplateCard";

describe("TemplateCard", () => {
  it("should call onSelect when clicked", async () => {
    const onSelect = vi.fn();
    render(<TemplateCard template={mockTemplate} onSelect={onSelect} />);
    
    await userEvent.click(screen.getByRole("button", { name: /use template/i }));
    
    expect(onSelect).toHaveBeenCalledWith(mockTemplate.id);
  });
});
```

### E2E Tests (Playwright)

```tsx
// e2e/compile.spec.ts
import { test, expect } from "@playwright/test";

test("should compile LaTeX and show PDF", async ({ page }) => {
  await page.goto("/project/new");
  
  // Type LaTeX
  await page.locator(".cm-content").fill("\\documentclass{article}\\begin{document}Hello\\end{document}");
  
  // Click compile
  await page.getByRole("button", { name: "Compile" }).click();
  
  // Wait for PDF
  await expect(page.locator("iframe[title='PDF Preview']")).toBeVisible();
});
```

---

## Performance Guidelines

### Code Splitting

- Use dynamic imports for heavy components (CodeMirror, PDF viewer)
- Split by route (automatic with App Router)

```tsx
import dynamic from "next/dynamic";

const CodeMirrorEditor = dynamic(
  () => import("@/components/editor/CodeMirrorEditor"),
  { 
    loading: () => <EditorSkeleton />,
    ssr: false  // CodeMirror doesn't support SSR
  }
);
```

### Memoization

- Use `useMemo` for expensive computations
- Use `useCallback` for callbacks passed to memoized children
- Use `React.memo` sparingly (profile first)

```tsx
const sortedTemplates = useMemo(
  () => templates.sort((a, b) => a.name.localeCompare(b.name)),
  [templates]
);
```

### Debouncing

Debounce expensive operations (compile, AI requests):

```tsx
import { useDebouncedCallback } from "use-debounce";

const debouncedCompile = useDebouncedCallback(
  (content: string) => compile(content),
  1000  // 1 second debounce
);
```

### Image Optimization

- Use Next.js `<Image>` for all images
- Use WebP/AVIF formats
- Lazy load below-the-fold images

---

## Git Conventions

### Commit Messages

Follow Conventional Commits:

```
feat: add template picker component
fix: resolve PDF preview scaling issue
refactor: extract compile logic to service
docs: update API documentation
chore: update dependencies
```

### Branch Naming

```
feature/template-picker
fix/compile-timeout
refactor/service-layer
```

---

## Authentication (Clerk)

### Setup

```tsx
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Protected Routes

```tsx
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});
```

### Getting User in API Routes

```tsx
// app/api/projects/route.ts
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const projects = await projectRepository.findByUserId(userId);
  return NextResponse.json({ data: projects });
}
```

### Getting User in Components

```tsx
import { useUser } from "@clerk/nextjs";

function Dashboard() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) return <Skeleton />;
  
  return <h1>Welcome, {user?.firstName}</h1>;
}
```

---

## Billing (Stripe)

### Checkout Session

```tsx
// app/api/billing/checkout/route.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { userId } = auth();
  
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID, // Pro plan price ID
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId },
  });
  
  return NextResponse.json({ url: session.url });
}
```

### Webhook Handler

```tsx
// app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("stripe-signature")!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await userRepository.updateSubscription(session.metadata!.userId, {
        stripeCustomerId: session.customer as string,
        plan: "pro",
        status: "active",
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await userRepository.updateSubscriptionByCustomerId(
        subscription.customer as string,
        { plan: "free", status: "canceled" }
      );
      break;
    }
  }
  
  return NextResponse.json({ received: true });
}
```

### Usage Tracking

```tsx
// lib/usage.ts
import { db } from "@/lib/db";
import { userUsage } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

const FREE_LIMITS = {
  compiles: 50,
  aiEdits: 20,
};

const PRO_LIMITS = {
  compiles: Infinity,
  aiEdits: 500,
};

export async function checkUsageLimit(userId: string, type: "compiles" | "aiEdits") {
  const user = await userRepository.findById(userId);
  const limits = user.plan === "pro" ? PRO_LIMITS : FREE_LIMITS;
  
  const today = new Date().toISOString().split("T")[0];
  const usage = await db.query.userUsage.findFirst({
    where: and(eq(userUsage.userId, userId), eq(userUsage.date, today)),
  });
  
  const currentCount = usage?.[type] ?? 0;
  return currentCount < limits[type];
}

export async function incrementUsage(userId: string, type: "compiles" | "aiEdits") {
  const today = new Date().toISOString().split("T")[0];
  
  await db
    .insert(userUsage)
    .values({ userId, date: today, [type]: 1 })
    .onConflictDoUpdate({
      target: [userUsage.userId, userUsage.date],
      set: { [type]: sql`${userUsage[type]} + 1` },
    });
}
```

### Usage Check Middleware Pattern

```tsx
// In API route
export async function POST(req: NextRequest) {
  const { userId } = auth();
  
  const canCompile = await checkUsageLimit(userId, "compiles");
  if (!canCompile) {
    return NextResponse.json(
      { error: { code: "LIMIT_EXCEEDED", message: "Daily compile limit reached. Upgrade to Pro for more." } },
      { status: 429 }
    );
  }
  
  // ... do compile ...
  
  await incrementUsage(userId, "compiles");
  return NextResponse.json({ data: result });
}
```

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://...

# AI
OPENAI_API_KEY=sk-...

# Storage (S3-compatible)
S3_BUCKET=latex-ai-editor
S3_REGION=auto
S3_ENDPOINT=https://...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Billing (Stripe)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Rules:**
- Never commit `.env` files
- Use `.env.example` as template
- Validate env vars at startup with `@t3-oss/env-nextjs`
