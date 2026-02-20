import { render } from "@testing-library/react";
import posthog from "posthog-js";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";

// Override pathname/searchParams for this test
const mockPathname = jest.fn().mockReturnValue("/en/admin");
const mockSearchParams = jest.fn().mockReturnValue(new URLSearchParams());

jest.mock("next/navigation", () => ({
  ...jest.requireActual("next/navigation"),
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}));

describe("PostHogPageView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue("/en/admin");
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("renders null (no visible UI)", () => {
    const { container } = render(<PostHogPageView />);
    expect(container.innerHTML).toBe("");
  });

  it("captures $pageview event on mount", () => {
    render(<PostHogPageView />);
    expect(posthog.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: expect.stringContaining("/en/admin"),
    });
  });

  it("includes search params in the captured URL", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("tab=quests"));
    render(<PostHogPageView />);
    expect(posthog.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: expect.stringContaining("/en/admin?tab=quests"),
    });
  });

  it("captures new pageview when pathname changes", () => {
    const { rerender } = render(<PostHogPageView />);
    expect(posthog.capture).toHaveBeenCalledTimes(1);

    mockPathname.mockReturnValue("/en/admin/quests");
    rerender(<PostHogPageView />);
    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.capture).toHaveBeenLastCalledWith("$pageview", {
      $current_url: expect.stringContaining("/en/admin/quests"),
    });
  });
});
