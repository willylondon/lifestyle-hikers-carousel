# Lifestyle Hikers Carousel Creator

**Turn excursion photos into stories worth saving.**

Lifestyle Hikers Carousel Creator is a Next.js application for building branded Instagram carousel stories from Lifestyle Hikers hikes, outings, trips, cultural experiences, breakfasts, community gatherings and other excursions.

## What it does

- Create projects from **5–20 photos**
- Add location and grounded excursion context
- Analyze photographs with a server-side AI service
- Build one connected story using **Hook → Orient → Build → Payoff → CTA**
- Enforce the Lifestyle Hikers **Three E's: Entertaining, Engaging, Educational**
- Edit slide copy, placement, crop, overlays and CTA
- Persist work locally with IndexedDB
- Export Instagram-ready 1080×1350 JPG slides plus caption, alt text and metadata

## Stack

- Next.js 16 / React 19
- TypeScript strict
- Tailwind CSS v4
- Zod 4
- IndexedDB (`idb`)
- JSZip
- Vitest
- OpenAI Responses API in production AI mode

## Local development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Environment variables

Copy `.env.example` and set only the variables needed for the environment.

| Variable | Purpose |
|---|---|
| `APP_PASSWORD` | Enables password protection for the app and AI endpoints |
| `APP_SESSION_SECRET` | HMAC signing secret for session cookies; recommended in production |
| `OPENAI_API_KEY` | Enables live OpenAI mode |
| `OPENAI_MODEL` | OpenAI model; defaults to `gpt-4.1-mini` |
| `N8N_WEBHOOK_URL` | Optional best-effort telemetry/integration webhook |

### Fail-closed rule

If `OPENAI_API_KEY` is configured but `APP_PASSWORD` is not configured, `/api/ai/*` intentionally returns **503**. A live paid key must never become an unauthenticated public proxy.

Mock mode remains available without `OPENAI_API_KEY` and without authentication for local development.

## Security model

Production AI access uses:

- password login
- signed, expiring HttpOnly session cookie
- `SameSite=Lax` and `Secure` cookies in production
- server-side OpenAI key only
- fail-closed AI routing
- strict Zod request validation
- HTTPS-only remote URL validation where URLs are accepted
- no fallback from image data to arbitrary remote URLs for AI vision
- prompt-injection boundaries around user title/location/notes
- sanitized client error responses
- explicit upstream timeouts
- independent login and AI throttling

The built-in rate limiter is **per application instance**, stored in memory, resets on cold starts and is not shared across Vercel instances. It is defense in depth only. It does **not** replace authentication or provider-side financial controls.

Set an OpenAI project budget/spend limit before enabling a production key.

## AI pipeline

The browser creates reduced analysis images instead of sending original phone-resolution photos to OpenAI.

Analysis requests are batched with:

- maximum batch size of 5
- automatic splitting when serialized request payload approaches ~3.5 MB
- one retry for a failed analysis batch
- ID-keyed analysis mapping
- partial persistence so successful paid analyses are reused after a later failure
- cancellation on component unmount

The final carousel-writing request contains compact photo metadata and completed analyses rather than the original image payloads.

## Instagram constraints

The app currently enforces Instagram's native carousel maximum of **20 items**.

Lifestyle Hikers projects require at least **5 photos** for the story workflow. Fewer than 20 should be used when they create a stronger narrative; the app should not pad a story solely to use every photograph.

## Visual system

The deterministic renderer owns the final look:

- 1080×1350, 4:5
- full-bleed photography
- editorial white typography
- small tracked `LIFESTYLE HIKERS` branding
- thin divider rule
- localized contrast gradient
- restrained warm-gold accents
- subtle page numbering such as `03 / 14`

AI proposes text and placement; application code renders the final pixels.

## Export package

Exports are named like:

```text
lifestyle-hikers-[project-name]-carousel.zip
```

A package contains:

- `slide-01.jpg` through the final slide
- `caption.txt`
- `alt-text.txt`
- `metadata.json`
- `README.txt`

The export layer verifies that every slide references a real photo and does not silently omit broken slides.

## Persistence

Projects currently use IndexedDB with localStorage fallback. This is a single-device workflow. Supabase-backed multi-user persistence is a later migration path and should be introduced together with real per-user authentication/RLS.

## Deployment

Recommended production flow:

1. Push a feature branch and verify the Vercel preview.
2. Set `APP_PASSWORD` and preferably `APP_SESSION_SECRET` in Vercel.
3. Set an OpenAI project spend/budget cap.
4. Add `OPENAI_API_KEY` and `OPENAI_MODEL`.
5. Verify unauthenticated `/api/ai/*` requests return 401.
6. Verify the app shell redirects to `/login` without a valid session.
7. Verify login, generation and export on the preview.
8. Merge to `main` only after required checks pass.

CI runs install, lint, typecheck, tests, build and production-dependency high-severity audit checks on pull requests and pushes to `main`.

## Known limitations

- Projects are device-local rather than multi-user/cloud synchronized.
- The in-memory rate limiter is not globally distributed.
- Mock mode does not perform true visual analysis.
- Browser-canvas export depends on browser canvas/font support.
- V1 exports packages; it does not auto-publish to Instagram.
