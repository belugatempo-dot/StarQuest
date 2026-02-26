import { renderHook, act } from "@testing-library/react";
import { useLoginForm } from "@/lib/hooks/useLoginForm";

// Mock Supabase client
const mockSignIn = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignIn },
    from: mockFrom,
  }),
}));

// Mock analytics
const mockTrackLogin = jest.fn();
const mockTrackLoginFailed = jest.fn();

jest.mock("@/lib/analytics/events", () => ({
  trackLogin: (...args: unknown[]) => mockTrackLogin(...args),
  trackLoginFailed: (...args: unknown[]) => mockTrackLoginFailed(...args),
}));

describe("useLoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as any).location;
    (window as any).location = { href: "" };
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useLoginForm("en"));

    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.showResendButton).toBe(false);
    expect(result.current.showRegistrationLink).toBe(false);
  });

  it("updates email and password", () => {
    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("test@example.com"));
    expect(result.current.email).toBe("test@example.com");

    act(() => result.current.setPassword("secret"));
    expect(result.current.password).toBe("secret");
  });

  it("sets error on sign-in failure (generic)", async () => {
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials" },
    });

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(result.current.error).toBe("Invalid credentials");
    expect(result.current.loading).toBe(false);
    expect(result.current.showResendButton).toBe(false);
    expect(mockTrackLoginFailed).toHaveBeenCalledWith("invalid_credentials");
  });

  it("sets emailNotVerified error and showResendButton on email not confirmed", async () => {
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: "Email not confirmed" },
    });

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(result.current.error).toBe("auth.emailNotVerified");
    expect(result.current.showResendButton).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(mockTrackLoginFailed).toHaveBeenCalledWith("email_not_confirmed");
  });

  it("sets userRecordNotFound error and showRegistrationLink on user query error", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(result.current.error).toBe("auth.userRecordNotFound");
    expect(result.current.showRegistrationLink).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("sets familySetupRequired error when family_id is null", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { role: "parent", family_id: null },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(result.current.error).toBe("auth.familySetupRequired");
    expect(result.current.loading).toBe(false);
  });

  it("sets loginFailed error when data.user is null", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(result.current.error).toBe("auth.loginFailed");
    expect(result.current.loading).toBe(false);
  });

  it("redirects to /{locale}/activities on success", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { role: "parent", family_id: "f1" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(window.location.href).toBe("/en/activities");
    expect(mockTrackLogin).toHaveBeenCalledWith("parent", "en");
  });

  it("uses correct locale in redirect path", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { role: "child", family_id: "f1" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const { result } = renderHook(() => useLoginForm("zh-CN"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(window.location.href).toBe("/zh-CN/activities");
    expect(mockTrackLogin).toHaveBeenCalledWith("child", "zh-CN");
  });

  it("tracks analytics on success before redirect", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { role: "child", family_id: "f1" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(mockTrackLogin).toHaveBeenCalledWith("child", "en");
  });

  it("resets error and showRegistrationLink on new login attempt", async () => {
    // First login: trigger user record error
    mockSignIn.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    await act(() => result.current.handleLogin());

    expect(result.current.error).toBe("auth.userRecordNotFound");
    expect(result.current.showRegistrationLink).toBe(true);

    // Second login: resets state
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: "Bad password" },
    });

    await act(() => result.current.handleLogin());

    expect(result.current.error).toBe("Bad password");
    expect(result.current.showRegistrationLink).toBe(false);
  });

  it("sets loading true during login", async () => {
    let resolveSignIn: (v: any) => void;
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
    );

    const { result } = renderHook(() => useLoginForm("en"));

    act(() => result.current.setEmail("a@b.com"));
    act(() => result.current.setPassword("pw"));

    // Start login (don't await)
    let loginPromise: Promise<void>;
    act(() => {
      loginPromise = result.current.handleLogin();
    });

    expect(result.current.loading).toBe(true);

    // Resolve
    await act(async () => {
      resolveSignIn!({
        data: null,
        error: { message: "Fail" },
      });
      await loginPromise!;
    });

    expect(result.current.loading).toBe(false);
  });
});
