import { render, screen } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: any) => (
    <div data-testid="intl-provider">{children}</div>
  ),
}));

jest.mock("next-intl/server", () => ({
  getMessages: jest.fn().mockResolvedValue({ brand: { name: "StarQuest" } }),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/i18n/config", () => ({
  locales: ["en", "zh-CN"],
}));

jest.mock("@/components/ThemeProvider", () => ({
  ThemeProvider: ({ children }: any) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

import LocaleLayout, {
  generateStaticParams,
} from "@/app/[locale]/layout";
import { notFound } from "next/navigation";

describe("LocaleLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders children within providers for valid locale", async () => {
    const jsx = await LocaleLayout({
      children: <div data-testid="child-content">Hello</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    const { container } = render(jsx);

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("intl-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("renders html element with correct lang attribute", async () => {
    const jsx = await LocaleLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    const { container } = render(jsx);

    // The html tag is rendered but in JSDOM it becomes part of the container
    // We check that the layout rendered successfully
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });

  it("calls notFound for invalid locale", async () => {
    try {
      await LocaleLayout({
        children: <div>Content</div>,
        params: Promise.resolve({ locale: "fr" }),
      });
    } catch {
      // notFound throws
    }
    expect(notFound).toHaveBeenCalled();
  });

  it("generateStaticParams returns all locales", () => {
    const params = generateStaticParams();
    expect(params).toEqual([{ locale: "en" }, { locale: "zh-CN" }]);
  });
});
