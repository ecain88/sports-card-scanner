# Sports Card Scanner — Project Knowledge

> Upload this file as **Project knowledge** in a Claude.ai Project. It is a
> self-contained snapshot of the app so any new chat starts with full context.
> Last updated: 2026-08-07.

## What it is

A **Progressive Web App (PWA)** that:
1. Tells you whether a sports card is **well-centered** (PSA-style left/right + top/bottom border ratios → a supported PSA grade), and
2. Shows **recent eBay sale comps** for that card.

The user photographs a card in the browser; the app detects the outer card edge
and inner print frame, computes centering percentages, maps them to a PSA grade
(4–10), and links to eBay comps.

## Where it lives

- **Repo:** GitHub `ecain88/sports-card-scanner` (branch `main`).
- **Frontend:** Vite PWA in `web/`, deployed on **Vercel** (Vercel *Root Directory* = `web`), auto-deploys on push to `main`.
- **Backend:** **Convex** (serverless DB + functions + file storage). Known dev deployment: `dependable-lemming-377`. Auto-deploys via `.github/workflows/deploy-convex.yml` on `convex/**` changes (needs `CONVEX_DEPLOY_KEY` GitHub secret).

## Current status (2026-08-07)

**Working:**
- PWA shell (Scan / Collection / Profile) live on Vercel.
- Convex client + `@convex-dev/auth` email/password sign-in/up/out.
- Collection query (`getCollection`) renders saved cards.
- PSA centering math + eBay deep-link helpers — pure, unit-tested (**35+ Vitest tests**).
- Border detection via **GPT-4.1 Vision** (`convex/borders.ts`) — replaced the earlier client-side OpenCV.js WASM approach (commit `45f38af7`).

**Needs credentials to fully light up (set on the Convex deployment):**
- `OPENAI_API_KEY` — GPT-4.1 border detection + card identification.
- `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` — in-app active listings.
- `RESEND_API_KEY` / `AUTH_RESEND_OTP_FROM` — password-reset emails.

**Known issues / next steps:**
- **Borderless / full-bleed cards** (e.g. Topps Chrome "Power Players" James Wood) can't be centering-graded reliably; the app should flag them as *unmeasurable* rather than grade the holder gap. `borders.ts` returns a `borderless` flag for this — verify the UI honors it.
- **Save-scan flow** (Scan → `saveCard` + `updateCardCentering`) should be confirmed end-to-end so scans land in Collection.
- `web/src/lib/cv.integration.test.ts` is a stub after the OpenCV → Vision pivot; `cv.ts` now calls the Convex `borders.detectBorders` action.
- `mobile/` (Expo/React Native) is the retired original native app, kept for history — not deployed.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5, React Router 6 |
| PWA | vite-plugin-pwa (service worker, installable) |
| Backend | Convex (DB, serverless functions, file storage) |
| Auth | Convex Auth (Password) + Resend OTP reset |
| AI / Vision | OpenAI **GPT-4.1** (border detection + card ID) |
| Marketplace | eBay Browse API (active listings) + sold-comps deep links |
| Hosting | Vercel (web) + Convex Cloud (backend) |
| Testing | Vitest (strict TypeScript throughout) |

## Architecture & data flow

**Scan (primary):** `ScanPage.tsx` renders the photo in a `<canvas>` → "Auto-detect borders" calls `cv.ts` → Convex action `borders.detectBorders(base64)` → **GPT-4.1** returns normalized `outer`/`inner` rects + `confidence` + `borderless`. Rects overlay on the canvas; the user can nudge them with sliders. Centering is then computed **client-side** (`centering.ts` → border widths → % splits; `psa.ts` → worst axis → PSA grade) and shown by `CenteringResult.tsx`.

**Card ID:** `vision.ts` action (GPT-4.1) extracts player/year/brand/set/#/variation/etc. + an eBay-optimized `searchQuery`. Separate pipeline from centering.

**Comps:** `CompsPanel.tsx` → `ebay.ts` builds eBay search deep links (sold = `LH_Sold=1&LH_Complete=1`; active). In-app active listings come from the Convex `ebay.ts` action (eBay Browse API, OAuth client-credentials).

**Auth:** `SignInForm.tsx` → Convex Auth Password provider; reset via Resend OTP.

## Repo layout (key files)

```
convex/            # Backend (Convex)
  borders.ts       # GPT-4.1 border detection (outer/inner rects)
  vision.ts        # GPT-4.1 card identification
  ebay.ts          # eBay Browse API active listings
  cards.ts         # queries/mutations: save/get/delete + centering + sales
  auth.ts, auth.config.ts, http.ts, schema.ts
web/               # Frontend PWA (Vercel root)
  src/lib/         # centering.ts, psa.ts, geometry.ts, ebay.ts, cv.ts, api.ts, convexClient.ts (+ *.test.ts)
  src/pages/       # ScanPage, CollectionPage, ProfilePage
  src/components/  # CenteringResult, CompsPanel, SignInForm
  vite.config.ts, .env.example
.github/workflows/deploy-convex.yml
docs/              # implementation plans / ADRs + this file
```

## Data model — `cards` table (`convex/schema.ts`)

```
userId, playerName, year, brand, cardSet, cardNumber, variation, sport, team,
grade, searchQuery, storageId?, avgPrice, lowPrice, highPrice, totalSales,
lastSalePrice?, lastSaleDate?, saleListings[],
centering?: {                       // borders detected by GPT-4.1 Vision
  lrLeftPct, lrRightPct, tbTopPct, tbBottomPct,
  worstLargerPct, supportedGradeFront, confidence, manualAdjusted
},
isBorderless?
```
Index: `by_user` on `userId`. Auth tables (users/sessions/etc.) managed by `@convex-dev/auth`.

## PSA centering rule

Centering = ratio of opposing border widths on the worst axis (50/50 = perfect).
Front tolerances (max larger-side %): **10 ≤ 55, 9 ≤ 60, 8 ≤ 65, 7 ≤ 70, 6 ≤ 80, 5 ≤ 85**; worse → grade 4. Back tolerances are looser.

## Environment variables

- **Web (Vercel / `web/.env`):** `VITE_CONVEX_URL=https://<deployment>.convex.cloud`
- **Convex backend (`npx convex env set …`):** `OPENAI_API_KEY`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `RESEND_API_KEY`, `AUTH_RESEND_OTP_FROM`
- **Local (`.env.local`, auto-created by Convex CLI):** `CONVEX_URL`, `CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT`

## Run & deploy

```bash
# install
npm install && (cd web && npm install)
# local dev — two terminals
npm run convex:dev
cd web && npm run dev        # http://localhost:5173
# tests / build
cd web && npm test
cd web && npm run build
```
Deploy: push to `main` → Vercel (web) + GitHub Action (Convex) auto-deploy.

## Key decisions

- **GPT-4.1 Vision over OpenCV.js** for border detection — more robust on real photos, zero 10 MB browser bundle; all external API calls live in Convex actions, never the browser.
- **`web/` is self-contained** — it uses Convex `anyApi` (not generated types) so the Vercel build never reaches into `../convex/_generated`.
- **Centering math is pure & local** — only border detection is server-side; the % → PSA-grade math is client-side and fully unit-tested.
- **eBay sold comps as deep links** — avoids the gated Marketplace Insights API.
