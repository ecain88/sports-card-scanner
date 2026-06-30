/**
 * Integration tests for the border detection pipeline were removed when the
 * OpenCV.js WASM implementation was replaced with GPT-4.1 Vision (convex/borders.ts).
 *
 * End-to-end testing now requires a live OPENAI_API_KEY and a Convex deployment.
 * The pure geometry helpers (isLikelyBorderless, computeCentering, etc.) remain
 * fully covered by their own unit tests in geometry.test.ts and centering.test.ts.
 */
