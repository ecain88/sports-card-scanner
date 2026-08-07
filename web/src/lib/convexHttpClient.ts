import { ConvexHttpClient } from "convex/browser";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

/**
 * Plain HTTP client for one-shot action calls (e.g. border detection).
 *
 * Unlike `convex` (ConvexReactClient), this doesn't route through the app's
 * persistent WebSocket — each call is a standalone fetch. Long-running actions
 * (GPT-4.1 vision on a full-size photo) can take 5-15s, and on mobile that's
 * long enough for the socket to drop (screen lock, backgrounded tab, network
 * handoff) and take the in-flight action down with it. The HTTP client isn't
 * exposed to that failure mode.
 */
export const convexHttp = new ConvexHttpClient(url ?? "");
