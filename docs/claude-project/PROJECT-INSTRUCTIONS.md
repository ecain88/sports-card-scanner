# Claude Project — Custom Instructions

> Paste this into the **"What are you working on?" / custom instructions** field
> when creating the Claude.ai Project. Keep PROJECT-KNOWLEDGE.md as uploaded
> Project knowledge.

---

This project is **Sports Card Scanner** — a React + Vite PWA (hosted on Vercel, backend on Convex) that measures PSA-style card centering and shows eBay sale comps. Full architecture, file layout, data model, env vars, and current status are in the uploaded PROJECT-KNOWLEDGE.md — read it before answering.

When helping me:
- The frontend lives in `web/` (self-contained; it must never import from `../convex/_generated` — it uses Convex `anyApi`). The backend lives in `convex/`.
- Border detection and card identification run **server-side** in Convex actions (`borders.ts`, `vision.ts`) via **GPT-4.1 Vision**. Never call OpenAI or eBay from the browser.
- Centering math (`centering.ts`, `psa.ts`, `geometry.ts`) is pure and unit-tested — keep it that way and add Vitest tests for changes.
- Use TypeScript strict mode. Prefer small, verifiable changes and run `cd web && npm test` / `npm run build` to confirm.
- Deploys are automatic on push to `main` (Vercel for web, GitHub Action for Convex). Don't commit or push unless I ask.
- Known open items: borderless/full-bleed cards should be flagged unmeasurable (not graded); confirm the save-scan flow end-to-end; OpenAI/eBay/Resend keys must be set on the Convex deployment for those features to work.

Be concise and concrete. Reference files as paths. Ask before anything destructive or account-facing.
