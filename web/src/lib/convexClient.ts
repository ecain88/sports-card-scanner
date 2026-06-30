import { ConvexReactClient } from "convex/react";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!url) {
  // Fail loud in dev; in prod the build injects the value from env.
  console.error("VITE_CONVEX_URL is not set — the app cannot reach Convex. See web/.env.example.");
}

/** Shared Convex client for the PWA. */
export const convex = new ConvexReactClient(url ?? "");
