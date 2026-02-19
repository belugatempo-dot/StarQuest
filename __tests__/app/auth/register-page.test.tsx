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

jest.mock("@/components/auth/RegisterForm", () => {
  return function MockRegisterForm() {
    return <div data-testid="register-form">RegisterForm</div>;
  };
});

jest.mock("@/components/ui/LanguageSwitcher", () => {
  return function MockLanguageSwitcher() {
    return <div data-testid="language-switcher">LanguageSwitcher</div>;
  };
});

import RegisterPage from "@/app/[locale]/(auth)/register/page";

describe("RegisterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the register form", async () => {
    const jsx = await RegisterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("register-form")).toBeInTheDocument();
  });

  it("renders brand name and slogan", async () => {
    const jsx = await RegisterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText(/brand\.name/)).toBeInTheDocument();
    expect(screen.getByText("brand.slogan")).toBeInTheDocument();
  });

  it("renders register prompt heading", async () => {
    const jsx = await RegisterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("auth.registerPrompt")).toBeInTheDocument();
  });

  it("renders language switcher", async () => {
    const jsx = await RegisterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders login link with correct locale", async () => {
    const jsx = await RegisterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const loginLink = screen.getByText("common.login");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/en/login");
  });

  it("renders login link with zh-CN locale", async () => {
    const jsx = await RegisterPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    const loginLink = screen.getByText("common.login");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/zh-CN/login");
  });

  it("renders introduction link to visualization page", async () => {
    const jsx = await RegisterPage({
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
    const jsx = await RegisterPage({
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
    const jsx = await RegisterPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByText("auth.orExplore")).toBeInTheDocument();
  });
});
