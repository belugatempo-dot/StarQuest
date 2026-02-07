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

const mockGetUser = jest.fn().mockResolvedValue({
  data: { user: { email: "session@test.com" } },
});

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

jest.mock("@/components/auth/ResendVerificationButton", () => {
  return function MockResendButton({ email, locale }: any) {
    return (
      <div data-testid="resend-button">
        Resend - {email} - {locale}
      </div>
    );
  };
});

jest.mock("@/components/ui/LanguageSwitcher", () => {
  return function MockLanguageSwitcher() {
    return <div data-testid="language-switcher">LanguageSwitcher</div>;
  };
});

import VerifyEmailPage from "@/app/[locale]/(auth)/auth/verify-email/page";

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { email: "session@test.com" } },
    });
  });

  it("renders check email title", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ email: "test@test.com" }),
    });
    render(jsx);

    expect(screen.getByText("verification.checkEmailTitle")).toBeInTheDocument();
  });

  it("displays email from searchParams", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ email: "param@test.com" }),
    });
    render(jsx);

    expect(screen.getByText("param@test.com")).toBeInTheDocument();
  });

  it("fetches email from session when not in searchParams", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("session@test.com")).toBeInTheDocument();
  });

  it("renders error message for invalid_token", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ error: "invalid_token" }),
    });
    render(jsx);

    expect(screen.getByText("verification.invalidToken")).toBeInTheDocument();
  });

  it("does not render error message when no error", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ email: "test@test.com" }),
    });
    render(jsx);

    expect(
      screen.queryByText("verification.invalidToken")
    ).not.toBeInTheDocument();
  });

  it("renders resend button with email", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ email: "test@test.com" }),
    });
    render(jsx);

    expect(screen.getByTestId("resend-button")).toHaveTextContent(
      "test@test.com"
    );
  });

  it("renders language switcher", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ email: "test@test.com" }),
    });
    render(jsx);

    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders login link", async () => {
    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ email: "test@test.com" }),
    });
    render(jsx);

    const loginLink = screen.getByText("common.login");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/en/login");
  });

  it("does not render resend button when no email available", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const jsx = await VerifyEmailPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByTestId("resend-button")).not.toBeInTheDocument();
  });
});
