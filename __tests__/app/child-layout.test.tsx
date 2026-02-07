import { render, screen } from "@testing-library/react";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn().mockResolvedValue({
    id: "child-1",
    name: "Alice",
    role: "child",
    family_id: "fam-1",
    email: "alice@test.com",
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
  }),
}));

jest.mock("@/components/child/ChildNav", () => {
  return function MockChildNav({ user, locale }: any) {
    return (
      <div data-testid="child-nav">
        ChildNav - {user.name} - {locale}
      </div>
    );
  };
});

import ChildLayout from "@/app/[locale]/(child)/layout";
import { requireAuth } from "@/lib/auth";

describe("ChildLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders ChildNav and children", async () => {
    const jsx = await ChildLayout({
      children: <div data-testid="page-content">Page Content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("child-nav")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("calls requireAuth with the locale", async () => {
    await ChildLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(requireAuth).toHaveBeenCalledWith("zh-CN");
  });

  it("passes user and locale to ChildNav", async () => {
    const jsx = await ChildLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("child-nav")).toHaveTextContent("Alice");
    expect(screen.getByTestId("child-nav")).toHaveTextContent("en");
  });

  it("renders main container with correct classes", async () => {
    const jsx = await ChildLayout({
      children: <div data-testid="page-content">Content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    const { container } = render(jsx);

    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("container", "mx-auto");
  });
});
