import { render, screen } from "@testing-library/react";

const mockUser = {
  id: "user-1",
  name: "Jane",
  role: "parent",
  family_id: "fam-1",
  email: "jane@test.com",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

jest.mock("@/lib/auth", () => ({
  requireParent: jest.fn().mockResolvedValue({
    id: "user-1",
    name: "Jane",
    role: "parent",
    family_id: "fam-1",
    email: "jane@test.com",
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
  }),
}));

jest.mock("@/lib/demo/demo-context", () => ({
  DemoProvider: ({ children }: any) => children,
}));

jest.mock("@/components/ui/DemoBanner", () => ({
  DemoBanner: () => null,
}));

jest.mock("@/components/admin/AdminNav", () => {
  return function MockAdminNav({ user, locale }: any) {
    return (
      <div data-testid="admin-nav">
        AdminNav - {user.name} - {locale}
      </div>
    );
  };
});

import AdminLayout from "@/app/[locale]/(parent)/layout";
import { requireParent } from "@/lib/auth";

describe("AdminLayout (Parent Layout)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders AdminNav and children", async () => {
    const jsx = await AdminLayout({
      children: <div data-testid="page-content">Page Content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("admin-nav")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("calls requireParent with the locale", async () => {
    await AdminLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(requireParent).toHaveBeenCalledWith("zh-CN");
  });

  it("passes user and locale to AdminNav", async () => {
    const jsx = await AdminLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("admin-nav")).toHaveTextContent("Jane");
    expect(screen.getByTestId("admin-nav")).toHaveTextContent("en");
  });

  it("renders main container with correct classes", async () => {
    const jsx = await AdminLayout({
      children: <div data-testid="page-content">Content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    const { container } = render(jsx);

    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("container", "mx-auto");
  });
});
