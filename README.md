# Lifestyle Hikers Carousel Creator

**Turn hike photos into stories worth saving.**

Lifestyle Hikers Carousel Creator is a production-oriented Next.js application for building branded Instagram carousel posts from hike photos and grounded field notes. It is designed as a dedicated editorial workflow tool rather than a generic AI chat UI.

## What it does

- Create carousel projects from **5–15 hike photos**
- Add hike notes, location context, and project metadata
- Analyze images through an **AI service abstraction**
- Generate a coherent editorial slide sequence using the storytelling model:
  - **Image → Observation → Meaning → Lesson**
- Edit headlines, body copy, placement, alignment, overlay, crop, and CTA
- Regenerate an entire carousel, a single slide, a headline only, a body only, or the overall caption
- Persist projects locally with **IndexedDB** and a **localStorage fallback**
- Export a ZIP package containing:
  - `slide-01.jpg`, `slide-02.jpg`, ...
  - `caption.txt`
  - `alt-text.txt`
  - `metadata.json`
  - `README.txt`

## Product principles

- **AI suggests narrative structure and text**
- **Application code controls typography and layout deterministically**
- **Manual edits always win** and are never silently overwritten
- **Mock mode works immediately** without any API key
- **OpenAI mode is server-side only** when enabled

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Zod
- IndexedDB (`idb`)
- JSZip
- Vitest
- dnd-kit

## Architecture

```text
src/
  app/
    api/ai/
  components/
  config/
  lib/
    ai/
    demo/
    export/
    integrations/
    rendering/
    repositories/
  test/
  types/
```

### Key modules

#### UI
- `DashboardView` — branding, recent projects, demo state, empty state
- `NewProjectDialog` — upload + notes + validation
- `CarouselEditor` — slide editing, regenerate actions, export
- `SlidePreview` — branded 4:5 deterministic preview

#### AI layer
- `AIService` — shared interface
- `MockAIService` — immediate local/demo mode
- `OpenAIService` — server-side multimodal implementation
- `service-factory.ts` — switches between Mock and OpenAI based on env vars

#### Persistence
- `ProjectRepository` — abstraction
- `LocalProjectRepository` — IndexedDB primary, localStorage fallback

#### Export
- `export-service.ts` — canvas-based deterministic slide rendering and ZIP generation

#### Future integrations
- `N8nService` — webhook-ready integration layer, disabled by default
- architecture prepared for future `SupabaseProjectRepository`

## Local development

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

> Use `localhost`, not `127.0.0.1`, during local browser QA with Next 16 dev mode to avoid blocked cross-origin dev asset requests.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Environment variables

See `.env.example`.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
N8N_WEBHOOK_URL=
NEXT_PUBLIC_APP_NAME=Lifestyle Hikers Carousel Creator
NEXT_PUBLIC_APP_SUBTITLE=Turn hike photos into stories worth saving.
```

## Mock mode

Mock mode is the default when `OPENAI_API_KEY` is missing.

In Mock mode the app:
- still creates projects
- still generates slide structures
- still generates demo analyses and captions
- still exports full carousel packages

This allows V1 to run cleanly on Vercel without requiring AI credentials.

## OpenAI mode

When `OPENAI_API_KEY` is present, the app switches to `OpenAIService`.

All OpenAI calls run **server-side** via Next.js route handlers:

- `POST /api/ai/analyze`
- `POST /api/ai/generate-carousel`
- `POST /api/ai/regenerate-slide`
- `POST /api/ai/generate-caption`

### OpenAI implementation notes

- AI responses are validated with **Zod**
- The app is structured to support multimodal image analysis per uploaded image
- Secrets are never exposed client-side
- If OpenAI fails, the route returns a clean user-facing error

## Demo project

The app ships with a seeded **Hellshire coastal story** demo project using local Lifestyle Hikers imagery already available on this machine and copied into `public/demo/` for reliable exploration of the editor.

## Export behavior

Export creates a ZIP package named like:

```text
lifestyle-hikers-[project-name]-carousel.zip
```

Inside:
- high-resolution JPG slides rendered to **1080 × 1350**
- caption text
- alt text
- metadata
- lightweight export readme

## Accessibility

The app includes:
- labeled form fields
- visible focus states
- keyboard-focusable controls
- alt text generation fields
- readable dark contrast system
- deterministic text rendering instead of AI-generated text in imagery

## Testing

Current automated coverage includes:
- photo count validation
- mock AI generation
- project repository persistence
- slide editing helper behavior
- slide reordering helper behavior

## Deployment

Recommended flow:
1. push to GitHub
2. import repo into Vercel
3. deploy in **Mock mode** first
4. add OpenAI env vars later if desired

## Future n8n integration

A clean webhook layer is prepared through `N8nService`.

Intended future events:
- `project.created`
- `carousel.generated`
- `carousel.approved`
- `carousel.exported`
- `instagram.publish.requested`

If `N8N_WEBHOOK_URL` is absent, the app continues normally.

## Future Supabase integration

Planned future replacement path:
- `LocalProjectRepository` → `SupabaseProjectRepository`

This keeps the UI stable while swapping persistence and asset storage later.

## Future Instagram publishing

V1 does **not** auto-publish.

Planned later architecture:
- approved carousel
- upload rendered assets to public storage
- create Instagram media containers
- publish carousel

For V1, **export package** is the supported publishable deliverable.

## Known limitations

- No auth in V1
- Local persistence only in V1
- Mock mode does not perform true visual analysis
- Editor uses drag-and-drop for slide order, but advanced crop focal-point editing is not yet implemented beyond preset crop positions
- OpenAI structured output is validated after response parsing; model prompt/schema tuning may still be needed once a live key is configured
- Export is browser-canvas based, so final typography/rendering is deterministic but still dependent on browser canvas support

## Next recommended step

Add a real `OPENAI_API_KEY`, then tune multimodal prompts and output schemas against actual user-uploaded hike sets. After that, replace local persistence with Supabase storage and add approval-driven n8n publishing hooks.
