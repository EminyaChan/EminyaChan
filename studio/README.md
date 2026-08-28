# AI Marketing Studio

A working AI marketing content generator: enter business info, pick an
industry/platform/content type, generate on-brand copy (with a
specialized Xiaohongshu mode), generate images and video plans, and
manage everything in a versioned content library. Built with Next.js 16
(App Router), TypeScript, Tailwind CSS, Prisma + PostgreSQL, and
Auth.js (NextAuth v5).

This app lives at the repo root's `studio/` directory alongside the
existing `marketing-content-agent` app (root `server.js`), which is a
separate, unrelated tool and is left untouched.

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — any PostgreSQL connection string. For local dev, point
  it at a local Postgres instance (`createdb ai_marketing_studio` then
  the default `postgresql://user@localhost:5432/ai_marketing_studio`
  usually works).
- `AUTH_SECRET` — any random string (`openssl rand -base64 32`).
- AI provider keys — **optional**. Set one of `OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY` to enable real
  AI text generation. **Without any key, the app still works
  end-to-end** — text generation automatically falls back to a
  deterministic built-in template, clearly labeled in the UI and logged
  in Generation History. Image generation requires `OPENAI_API_KEY`
  (uses `gpt-image-1`); without it, the Image Generator clearly reports
  "not configured" instead of faking an image. Video rendering has no
  connected provider yet by design — see below.

Then set up the database:

```bash
npx prisma migrate dev   # creates tables
npx prisma db seed       # seeds 18 industry presets + their default templates
```

Run it:

```bash
npm run dev
```

Open http://localhost:3000, click **Create account** — registering
automatically seeds your account with 5 realistic demo brands (a
restaurant, a beauty salon, a real estate agency, a marketing agency, and
an e-commerce brand) and their content, so the app isn't empty on first
login.

## 1b. Deploying with no computer / no terminal (e.g. from a tablet)

`npm run build` (what every deploy platform runs automatically) is:
`prisma migrate deploy && tsx prisma/seed.ts && next build` — it creates
the tables and seeds the industry presets itself, against whatever
`DATABASE_URL` is set in the platform's environment variables. Nothing
needs to be run by hand.

So the whole deploy, entirely from a browser, is:

1. Create a free Postgres database (e.g. [Neon](https://neon.tech) or
   [Supabase](https://supabase.com)) and copy its connection string.
2. On [vercel.com](https://vercel.com), sign in with GitHub, import this
   repo, and set the project's **Root Directory** to `studio`.
3. In the project's Environment Variables, add: `DATABASE_URL` (from step
   1), `AUTH_SECRET` (any random string), `AUTH_TRUST_HOST=true`.
4. Click **Deploy**. Vercel runs `npm install` then `npm run build`,
   which migrates and seeds the database as part of the build — open the
   `https://….vercel.app` URL it gives you when done.

No `npx prisma` command, no CLI, no computer required — just a browser.

## 2. The golden path

Business info → pick industry/platform/content type → **Generate
Content** → pick a variation → it's saved to the Content Library →
regenerate the whole thing or just one section (title, hook, CTA,
hashtags, …) → generate an image and/or a video plan → find it again
later in Content Library, with full version history.

## 3. Architecture

```
prisma/schema.prisma        User, Brand, Content, ContentVersion, GeneratedImage,
                             GeneratedVideo, Template, Industry, GenerationHistory, Settings
prisma/seed.ts               seeds the 17 system industries + their default templates

src/lib/ai/types.ts          provider-agnostic contracts (AITextProvider, AIImageProvider, AIVideoProvider)
src/lib/ai/providers/        openai.ts, anthropic.ts, gemini.ts, template.ts (no-key fallback), video.ts (unconfigured)
src/lib/ai/index.ts          picks a provider from env vars, auto-falls back to the template provider on
                              missing config or a failed call — callers never see a raw provider error

src/lib/prompt/builder.ts    modular prompt builder: system prompt + business info + brand + platform +
                              content type + tone + language + special instructions, composed per-request
                              (not one hard-coded prompt) — includes a dedicated Xiaohongshu-native format
src/lib/generation/          orchestration: builds GenerationContext, calls the AI layer, parses/repairs
                              JSON output, records GenerationHistory (provider/model/tokens/est. cost)

src/app/api/                 REST API routes (generate, content CRUD + regenerate + versions/restore,
                              brand CRUD, images, videos + render, templates, industries, history, settings)
src/app/(app)/                the authenticated app shell: dashboard, generator, library, brand, templates,
                              images, videos, history, settings — each a page under the shared sidebar layout
src/components/generator/    ContentEditor (shared by the generator's post-save view and the library detail
                              page), GeneratorForm, VariantPicker
```

### Switching AI providers

Nothing in the app talks to an SDK directly outside `src/lib/ai/providers/*`.
To add a new provider, implement `AITextProvider` (or `AIImageProvider` /
`AIVideoProvider`) and register it in `src/lib/ai/index.ts`.

### Video rendering

Per the product requirement to never fake a successful generation: the
video **plan** (hook, scenes with visual/dialogue/on-screen text, CTA,
caption, hashtags, thumbnail prompt) always generates through the text
layer above (real AI or the template fallback). Actually rendering the
video file has no connected provider — `POST /api/videos/[id]/render`
honestly reports "not configured" with the exact env var
(`AI_VIDEO_PROVIDER`) and file to implement
(`src/lib/ai/providers/video.ts`) rather than pretending to succeed.

### Versioning

Every save creates `ContentVersion` #1. Every regeneration (full or a
single section) creates a new version and updates the content's "current"
pointer — old versions are kept and restorable from the content detail
view, never overwritten.

## 4. Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4
· Prisma 6 + PostgreSQL · Auth.js v5 (credentials + JWT sessions) · Zod ·
OpenAI / Anthropic / Google Generative AI SDKs.
