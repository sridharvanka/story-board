# Storyboard

An AI-powered idea canvas that finds connections between your fragments of thought and generates a narrative outline. Built with Next.js, Supabase, and Claude.

![Next.js](https://img.shields.io/badge/Next.js_14-black?logo=next.js) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## What it does

1. **Capture** — drop fragments of text (facts, quotes, ideas) onto a canvas
2. **Connect** — AI discovers relationships between fragments and suggests labeled connections (e.g. "evidence for", "causes", "contradicts")
3. **Outline** — AI arranges your accepted connections into a narrative arc ready to write from

No account required. Each visitor gets an isolated session — zero PII collected.

## Privacy design

Authentication was deliberately omitted. The app uses ephemeral anonymous sessions: a random UUID is stored in `localStorage` and used to scope all database rows. Data isolation is enforced at the database layer via session-filtered queries, not auth middleware. Visitors get immediate access with no sign-up friction and no identity exposure.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router |
| Database | Supabase (PostgreSQL) |
| AI | Claude (claude-sonnet-4-6) via Anthropic SDK |
| Graph canvas | XyFlow v12 |
| Styling | Tailwind CSS |
| Language | TypeScript (strict) |
| Deploy | Vercel |

## Running locally

**1. Clone and install**
```bash
git clone https://github.com/sridharvanka/story-board
cd story-board
npm install
```

**2. Set up Supabase**

Create a project at [supabase.com](https://supabase.com), then run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.

**3. Add environment variables**

Copy `.env.local.example` to `.env.local` and fill in your keys:
```
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**4. Run**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Try a demo project** to see a pre-built example.

## Project structure

```
app/
  page.tsx              # Project list + demo seed
  project/[id]/         # Canvas route
  api/discover/         # AI connection discovery endpoint
  api/outline/generate/ # AI outline generation endpoint
components/
  Canvas.tsx            # Main XyFlow canvas
  FragmentNode.tsx      # Idea node
  ConnectionEdge.tsx    # Labeled edge with accept/reject UI
lib/
  store.ts              # Supabase CRUD layer
  api.ts                # Business logic (preference saving, dedup)
  session.ts            # Anonymous session management
  seed.ts               # Demo project seeder
supabase/
  schema.sql            # Table definitions and indexes
```
