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

import ConfirmedPage from "@/app/[locale]/(auth)/auth/confirmed/page";

describe("ConfirmedPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders confirmed title", async () => {
    const jsx = await ConfirmedPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(
      screen.getByText("verification.confirmedTitle")
    ).toBeInTheDocument();
  });

  it("renders confirmed message", async () => {
    const jsx = await ConfirmedPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(
      screen.getByText("verification.confirmedMessage")
    ).toBeInTheDocument();
  });

  it("renders go to login link", async () => {
    const jsx = await ConfirmedPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    const loginLink = screen.getByText("verification.goToLogin");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/en/login");
  });

  it("renders language switcher", async () => {
    const jsx = await ConfirmedPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders with zh-CN locale in links", async () => {
    const jsx = await ConfirmedPage({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    render(jsx);

    const loginLink = screen.getByText("verification.goToLogin");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/zh-CN/login");
  });
});
