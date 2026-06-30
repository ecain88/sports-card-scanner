# Sports Card Scanner — Web PWA

A browser PWA that measures **PSA-style centering** for a sports card and shows
**eBay sale comps**. Centering computer-vision runs **client-side** (OpenCV.js / WASM);
the Convex backend stores cards and proxies card-ID + active-listing lookups.

## Architecture

| Concern | Where it runs |
|---|---|
| Centering CV (perspective correct, border detect, ratios) | Client (OpenCV.js WASM) — `src/lib/cv.ts`, pure math in `src/lib/centering.ts` |
| PSA grade mapping | Client — `src/lib/psa.ts` |
| Card identification (player/year/set…) | Convex action `convex/vision.ts` (GPT-4o Vision) |
| eBay active "asking" listings | Convex action `convex/ebay.ts` (Browse API) |
| eBay sold comps | Deep link to eBay's sold filter — `src/lib/ebay.ts` |
| Data / auth / storage | Convex (`convex/`) |

## Local dev

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run typecheck  # tsc, strict
npm run build      # production build + PWA service worker
```

## Required environment

Web build (`web/.env` or Vercel project env):

| Var | Purpose |
|---|---|
| `VITE_CONVEX_URL` | Convex deployment URL the PWA connects to |

Convex deployment env (set via `npx convex env set` or the dashboard):

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` | GPT-4o Vision card identification |
| `EBAY_CLIENT_ID` | eBay Browse API (OAuth client credentials) |
| `EBAY_CLIENT_SECRET` | eBay Browse API secret |

GitHub Actions secrets (for `.github/workflows/deploy-web.yml`):

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Vercel deploy |
| `VITE_CONVEX_URL` | Build-time Convex URL |

## Deploy

Push to `main` → GitHub Actions type-checks, tests, builds, and deploys `web/` to
Vercel. The existing `deploy-convex.yml` workflow deploys the Convex backend
separately on `convex/**` changes.
