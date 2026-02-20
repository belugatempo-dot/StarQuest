import { render } from "@testing-library/react";
import posthog from "posthog-js";
import { PostHogUserIdentify } from "@/components/analytics/PostHogUserIdentify";

describe("PostHogUserIdentify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const parentUser = {
    id: "parent-uuid-123",
    role: "parent" as const,
    family_id: "family-uuid-456",
    locale: "en",
    email: "parent@example.com",
    name: "John Parent",
  };

  const childUser = {
    id: "child-uuid-789",
    role: "child" as const,
    family_id: "family-uuid-456",
    locale: "zh-CN",
    email: "child@example.com",
    name: "Emma Child",
  };

  it("renders null (no visible UI)", () => {
    const { container } = render(<PostHogUserIdentify user={parentUser} />);
    expect(container.innerHTML).toBe("");
  });

  describe("parent identification", () => {
    it("identifies parent with full PII", () => {
      render(<PostHogUserIdentify user={parentUser} />);
      expect(posthog.identify).toHaveBeenCalledWith("parent-uuid-123", {
        role: "parent",
        family_id: "family-uuid-456",
        locale: "en",
        email: "parent@example.com",
        name: "John Parent",
      });
    });

    it("starts session recording for parents", () => {
      render(<PostHogUserIdentify user={parentUser} />);
      expect(posthog.startSessionRecording).toHaveBeenCalled();
      expect(posthog.stopSessionRecording).not.toHaveBeenCalled();
    });

    it("groups parent by family", () => {
      render(<PostHogUserIdentify user={parentUser} />);
      expect(posthog.group).toHaveBeenCalledWith("family", "family-uuid-456");
    });
  });

  describe("child identification", () => {
    it("identifies child WITHOUT email and name (privacy)", () => {
      render(<PostHogUserIdentify user={childUser} />);
      expect(posthog.identify).toHaveBeenCalledWith("child-uuid-789", {
        role: "child",
        family_id: "family-uuid-456",
        locale: "zh-CN",
      });
      // Verify NO email or name sent
      const identifyCall = (posthog.identify as jest.Mock).mock.calls[0];
      expect(identifyCall[1]).not.toHaveProperty("email");
      expect(identifyCall[1]).not.toHaveProperty("name");
    });

    it("stops session recording for children", () => {
      render(<PostHogUserIdentify user={childUser} />);
      expect(posthog.stopSessionRecording).toHaveBeenCalled();
      expect(posthog.startSessionRecording).not.toHaveBeenCalled();
    });

    it("groups child by family", () => {
      render(<PostHogUserIdentify user={childUser} />);
      expect(posthog.group).toHaveBeenCalledWith("family", "family-uuid-456");
    });
  });

  it("does not group when family_id is null", () => {
    const orphanUser = { ...parentUser, family_id: null };
    render(<PostHogUserIdentify user={orphanUser} />);
    expect(posthog.group).not.toHaveBeenCalled();
  });

  it("handles null email and name gracefully for parent", () => {
    const parentNoEmail = { ...parentUser, email: null, name: null };
    render(<PostHogUserIdentify user={parentNoEmail} />);
    expect(posthog.identify).toHaveBeenCalledWith("parent-uuid-123", {
      role: "parent",
      family_id: "family-uuid-456",
      locale: "en",
      email: undefined,
      name: undefined,
    });
  });
});
