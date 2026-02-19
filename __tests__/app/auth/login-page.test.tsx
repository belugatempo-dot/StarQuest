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

jest.mock("@/components/auth/LoginForm", () => {
  return function MockLoginForm() {
    return <div data-testid="login-form">LoginForm</div>;
  };
});

jest.mock("@/components/ui/LanguageSwitcher", () => {
  return function MockLanguageSwitcher() {
    return <div data-testid="language-switcher">LanguageSwitcher</div>;
  };
});

import LoginPage from "@/app/[locale]/(auth)/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the login form", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  it("renders brand name", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/brand\.name/)).toBeInTheDocument();
  });

  it("renders welcome back message", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("auth.welcomeBack")).toBeInTheDocument();
  });

  it("renders login prompt heading", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("auth.loginPrompt")).toBeInTheDocument();
  });

  it("renders language switcher", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders register link with correct locale", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const registerLink = screen.getByText("common.register");
    expect(registerLink.closest("a")).toHaveAttribute("href", "/en/register");
  });

  it("renders register link with zh-CN locale", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    const registerLink = screen.getByText("common.register");
    expect(registerLink.closest("a")).toHaveAttribute(
      "href",
      "/zh-CN/register"
    );
  });

  it("renders introduction link to visualization page", async () => {
    const jsx = await LoginPage({
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
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const demoLink = screen.getByText("auth.tryDemo");
    expect(demoLink.closest("a")).toHaveAttribute(
      "href",
      "/en/login?demo=true"
    );
  });

  it("renders explore text", async () => {
    const jsx = await LoginPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("auth.orExplore")).toBeInTheDocument();
  });
});
