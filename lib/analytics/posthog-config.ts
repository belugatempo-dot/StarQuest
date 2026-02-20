// Client-safe PostHog configuration — NO Node.js dependencies
// This file can be imported by "use client" components safely.

export const POSTHOG_CONFIG = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  person_profiles: "identified_only" as const,
  capture_pageview: false, // Manual tracking via PostHogPageView component
  capture_pageleave: true,
  autocapture: true,
  disable_session_recording: true, // Enabled per-user in PostHogUserIdentify
  respect_dnt: true,
};
