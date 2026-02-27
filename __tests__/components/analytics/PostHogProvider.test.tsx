import { render } from "@testing-library/react";
import posthog from "posthog-js";
import PostHogProviderInner from "@/components/analytics/PostHogProviderInner";

describe("PostHogProviderInner", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("renders children", () => {
    const { getByText } = render(
      <PostHogProviderInner>
        <div>Test Child</div>
      </PostHogProviderInner>
    );
    expect(getByText("Test Child")).toBeInTheDocument();
  });

  it("initializes PostHog when NEXT_PUBLIC_POSTHOG_KEY is set", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    render(
      <PostHogProviderInner>
        <div>Test</div>
      </PostHogProviderInner>
    );
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({
        capture_pageview: false,
        disable_session_recording: true,
        respect_dnt: true,
      })
    );
  });

  it("does not initialize PostHog when key is missing", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    render(
      <PostHogProviderInner>
        <div>Test</div>
      </PostHogProviderInner>
    );
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("passes person_profiles: identified_only config", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    render(
      <PostHogProviderInner>
        <div>Test</div>
      </PostHogProviderInner>
    );
    expect(posthog.init).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        person_profiles: "identified_only",
      })
    );
  });
});
