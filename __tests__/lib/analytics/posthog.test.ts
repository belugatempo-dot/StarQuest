import { POSTHOG_CONFIG, getServerPostHog, captureServerEvent } from "@/lib/analytics/posthog";

// Mock posthog-node
jest.mock("posthog-node", () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    flush: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

describe("lib/analytics/posthog", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("POSTHOG_CONFIG", () => {
    it("has capture_pageview disabled", () => {
      expect(POSTHOG_CONFIG.capture_pageview).toBe(false);
    });

    it("has session recording disabled by default", () => {
      expect(POSTHOG_CONFIG.disable_session_recording).toBe(true);
    });

    it("has person_profiles set to identified_only", () => {
      expect(POSTHOG_CONFIG.person_profiles).toBe("identified_only");
    });

    it("respects DNT", () => {
      expect(POSTHOG_CONFIG.respect_dnt).toBe(true);
    });

    it("has autocapture enabled", () => {
      expect(POSTHOG_CONFIG.autocapture).toBe(true);
    });

    it("has capture_pageleave enabled", () => {
      expect(POSTHOG_CONFIG.capture_pageleave).toBe(true);
    });
  });

  describe("getServerPostHog", () => {
    it("returns null when key is not set", () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const client = getServerPostHog();
      expect(client).toBeNull();
    });

    it("returns a PostHog client when key is set", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
      const client = getServerPostHog();
      expect(client).not.toBeNull();
    });
  });

  describe("captureServerEvent", () => {
    it("does nothing when key is not set", () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      // Should not throw
      captureServerEvent("user-123", "test_event", { foo: "bar" });
    });

    it("captures event when key is set", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
      captureServerEvent("user-123", "test_event", { foo: "bar" });
      const client = getServerPostHog();
      expect(client!.capture).toHaveBeenCalledWith({
        distinctId: "user-123",
        event: "test_event",
        properties: { foo: "bar" },
      });
    });
  });
});
