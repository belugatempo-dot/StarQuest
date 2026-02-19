import { render, screen } from "@testing-library/react";

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("@/components/ui/LanguageSwitcher", () => {
  return function MockLanguageSwitcher() {
    return <div data-testid="language-switcher">LanguageSwitcher</div>;
  };
});

import HomePage from "@/app/[locale]/page";

describe("HomePage (Locale Root Page)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders brand name and slogan", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/brand\.name/)).toBeInTheDocument();
    expect(screen.getByText("brand.slogan")).toBeInTheDocument();
  });

  it("renders language switcher", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders login and register links with locale", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const loginLink = screen.getByText("common.login");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/en/login");

    const registerLink = screen.getByText("common.register");
    expect(registerLink.closest("a")).toHaveAttribute("href", "/en/register");
  });

  it("renders feature cards", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("common.quests")).toBeInTheDocument();
    expect(screen.getByText("common.stars")).toBeInTheDocument();
    expect(screen.getByText("common.rewards")).toBeInTheDocument();
  });

  it("renders footer with brand info", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/Beluga Tempo/)).toBeInTheDocument();
  });

  it("uses correct locale in links for zh-CN", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    const loginLink = screen.getByText("common.login");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/zh-CN/login");
  });

  it("renders introduction link to visualization page", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const introLink = screen.getByText("auth.introduction");
    expect(introLink.closest("a")).toHaveAttribute(
      "href",
      "/starquest-visualization.html"
    );
    expect(introLink.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("renders try demo link with correct locale", async () => {
    const jsx = await HomePage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const demoLink = screen.getByText("auth.tryDemo");
    expect(demoLink.closest("a")).toHaveAttribute(
      "href",
      "/en/login?demo=true"
    );
  });
});
