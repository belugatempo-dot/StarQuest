// Server-only PostHog utilities — imports posthog-node (Node.js only)
// Do NOT import this file from "use client" components.
// For client-side config, use ./posthog-config.ts instead.

import { PostHog } from "posthog-node";

export { POSTHOG_CONFIG } from "./posthog-config";

// Server-side PostHog client singleton (for API routes and server components)
let serverPostHogClient: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!serverPostHogClient) {
    serverPostHogClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1, // Flush immediately in serverless
      flushInterval: 0,
    });
  }

  return serverPostHogClient;
}

// Helper to capture events from server-side code
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const posthog = getServerPostHog();
  if (!posthog) return;

  posthog.capture({
    distinctId,
    event,
    properties,
  });
}
