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

## Deploy (Vercel Git integration)

The PWA deploys via Vercel's native Git integration:

1. In the Vercel dashboard: **Add New → Project** and import the GitHub repo.
2. Set **Root Directory** to `web` (the app is in this subdirectory).
3. Add the environment variable **`VITE_CONVEX_URL`** = your Convex `.cloud` URL.
4. Deploy. Every push to `main` auto-deploys; `web/vercel.json` configures the
   Vite build, SPA rewrites, and service-worker caching headers.

The Convex backend deploys separately via `.github/workflows/deploy-convex.yml`
on `convex/**` changes.
