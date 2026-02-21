# LaTeX AI Editor

An AI-native LaTeX editor for resumes and documents. Like Cursor, but for LaTeX.

## Features

- **Real-time LaTeX editing** with CodeMirror 6 and syntax highlighting
- **Instant PDF preview** with server-side compilation
- **AI-powered inline suggestions** (Phase 2)
- **Resume templates** (Phase 3)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Editor**: CodeMirror 6 with `codemirror-lang-latex`
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use Docker)
- LaTeX (pdflatex) installed locally for compilation

### Installation

1. Clone the repository:

```bash
cd latex-ai-editor
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Start the database (optional, using Docker):

```bash
docker compose -f docker/docker-compose.yml up -d postgres
```

5. Run database migrations:

```bash
npm run db:push
```

6. Start the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

### Installing LaTeX (for compilation)

**macOS:**
```bash
brew install --cask mactex-no-gui
# or for a smaller installation:
brew install basictex
```

**Ubuntu/Debian:**
```bash
sudo apt-get install texlive-latex-base texlive-fonts-recommended
```

**Windows:**
Download and install [MiKTeX](https://miktex.org/download)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Editor routes
│   │   └── project/[id]/   # Project editor page
│   └── api/                # API routes
│       ├── compile/        # LaTeX compilation
│       └── projects/       # Project CRUD
├── components/
│   ├── editor/             # CodeMirror editor
│   ├── preview/            # PDF preview
│   ├── shared/             # Shared components
│   └── ui/                 # shadcn components
├── hooks/                  # React hooks
├── lib/                    # Utilities
│   └── db/                 # Database (Drizzle)
├── repositories/           # Data access layer
├── services/               # Business logic
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

### Database

The project uses Drizzle ORM with PostgreSQL. Schema is defined in `src/lib/db/schema.ts`.

## Roadmap

- [x] **Phase 1**: Foundation (Editor + Compile + Preview)
- [ ] **Phase 2**: AI Inline Edits (codemirror-ai integration)
- [ ] **Phase 3**: Resume Templates
- [ ] **Phase 4**: Auth & Billing
- [ ] **Phase 5**: Polish & Scale

## License

MIT
