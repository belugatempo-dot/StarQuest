import { render, screen } from "@testing-library/react";

const mockRequireAuth = jest.fn();

jest.mock("@/lib/auth", () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}));

jest.mock("@/components/shared/AppNav", () => {
  return function MockAppNav({ user, locale }: any) {
    return (
      <div data-testid="app-nav">
        AppNav - {user.name} - {locale}
      </div>
    );
  };
});

jest.mock("@/components/analytics/PostHogUserIdentify", () => ({
  PostHogUserIdentify: ({ user }: any) => (
    <div data-testid="posthog-identify">{user.locale}</div>
  ),
}));

jest.mock("@/lib/demo/demo-context", () => ({
  DemoProvider: ({ userEmail, children }: any) => (
    <div data-testid="demo-provider" data-email={userEmail}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/DemoBanner", () => ({
  DemoBanner: () => <div data-testid="demo-banner">DemoBanner</div>,
}));

import MainLayout from "@/app/[locale]/(main)/layout";

describe("MainLayout", () => {
  const mockUser = {
    id: "user-1",
    name: "Jane",
    role: "parent",
    family_id: "fam-1",
    email: "jane@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(mockUser);
  });

  it("calls requireAuth with locale", async () => {
    const jsx = await MainLayout({
      children: <div>content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(mockRequireAuth).toHaveBeenCalledWith("en");
  });

  it("renders AppNav with user and locale props", async () => {
    const jsx = await MainLayout({
      children: <div>content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const nav = screen.getByTestId("app-nav");
    expect(nav).toHaveTextContent("Jane");
    expect(nav).toHaveTextContent("en");
  });

  it("renders PostHogUserIdentify with user data", async () => {
    const jsx = await MainLayout({
      children: <div>content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("posthog-identify")).toHaveTextContent("en");
  });

  it("renders DemoBanner", async () => {
    const jsx = await MainLayout({
      children: <div>content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("demo-banner")).toBeInTheDocument();
  });

  it("wraps content in DemoProvider with user email", async () => {
    const jsx = await MainLayout({
      children: <div>content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const provider = screen.getByTestId("demo-provider");
    expect(provider).toHaveAttribute("data-email", "jane@test.com");
  });

  it("renders children content", async () => {
    const jsx = await MainLayout({
      children: <div>child content here</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("child content here")).toBeInTheDocument();
  });
});
