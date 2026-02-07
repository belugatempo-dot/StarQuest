// Use jest.fn at module scope properly
const mockGetUser = jest.fn();
const mockCreateServerClient = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: (...args: any[]) => mockCreateServerClient(...args),
}));

jest.mock("next/server", () => {
  class MockNextResponse {
    cookies: any;
    constructor() {
      this.cookies = {
        set: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
      };
    }
    static next(_opts?: any) {
      return new MockNextResponse();
    }
  }
  return {
    NextResponse: MockNextResponse,
  };
});

import { updateSession } from "@/lib/supabase/middleware";

describe("lib/supabase/middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    };
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockCreateServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  function makeMockRequest() {
    return {
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      },
    } as any;
  }

  it("returns response when env variables are present", async () => {
    const request = makeMockRequest();
    const result = await updateSession(request);
    expect(result).toBeDefined();
  });

  it("creates server client with correct env variables", async () => {
    const request = makeMockRequest();
    await updateSession(request);

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it("returns early when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const request = makeMockRequest();

    const result = await updateSession(request);
    expect(result).toBeDefined();
    expect(mockCreateServerClient).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns early when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const request = makeMockRequest();

    const result = await updateSession(request);
    expect(result).toBeDefined();
    expect(mockCreateServerClient).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("calls getUser to refresh session", async () => {
    const request = makeMockRequest();
    await updateSession(request);
    expect(mockGetUser).toHaveBeenCalled();
  });

  it("handles getUser error gracefully", async () => {
    mockGetUser.mockRejectedValue(new Error("Network error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const request = makeMockRequest();

    const result = await updateSession(request);
    expect(result).toBeDefined();
    consoleSpy.mockRestore();
  });

  it("uses provided response if given", async () => {
    const request = makeMockRequest();
    const customResponse = {
      cookies: {
        set: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
      },
    } as any;

    await updateSession(request, customResponse);
    expect(mockCreateServerClient).toHaveBeenCalled();
  });

  describe("getAll cookie callback (line 28)", () => {
    it("getAll callback returns cookies from request", async () => {
      const mockCookies = [
        { name: "sb-access-token", value: "access123" },
        { name: "sb-refresh-token", value: "refresh456" },
      ];
      const request = {
        cookies: {
          getAll: jest.fn().mockReturnValue(mockCookies),
          set: jest.fn(),
        },
      } as any;

      mockCreateServerClient.mockImplementation(
        (url: string, key: string, config: any) => {
          // Call getAll to exercise line 28
          const cookies = config.cookies.getAll();
          expect(cookies).toEqual(mockCookies);
          return { auth: { getUser: mockGetUser } };
        }
      );

      await updateSession(request);

      expect(request.cookies.getAll).toHaveBeenCalled();
    });
  });

  describe("setAll cookie callback (lines 30-43)", () => {
    it("setAll callback sets cookies on request", async () => {
      const request = makeMockRequest();

      mockCreateServerClient.mockImplementation(
        (url: string, key: string, config: any) => {
          // Trigger setAll to exercise lines 30-43
          config.cookies.setAll([
            { name: "sb-token", value: "abc123", options: { path: "/" } },
          ]);
          return { auth: { getUser: mockGetUser } };
        }
      );

      await updateSession(request);

      expect(request.cookies.set).toHaveBeenCalledWith("sb-token", "abc123");
    });

    it("setAll creates new response when no response provided", async () => {
      const request = makeMockRequest();

      mockCreateServerClient.mockImplementation(
        (url: string, key: string, config: any) => {
          config.cookies.setAll([
            { name: "token", value: "val", options: {} },
          ]);
          return { auth: { getUser: mockGetUser } };
        }
      );

      const result = await updateSession(request);
      expect(result).toBeDefined();
      // The result should have cookies.set method (it's a MockNextResponse)
      expect(result.cookies).toBeDefined();
    });

    it("setAll uses provided response without creating new one", async () => {
      const request = makeMockRequest();
      const customResponse = {
        cookies: {
          set: jest.fn(),
          getAll: jest.fn().mockReturnValue([]),
        },
      } as any;

      mockCreateServerClient.mockImplementation(
        (url: string, key: string, config: any) => {
          config.cookies.setAll([
            { name: "token", value: "val", options: { path: "/" } },
          ]);
          return { auth: { getUser: mockGetUser } };
        }
      );

      await updateSession(request, customResponse);

      // Should set on the custom response
      expect(customResponse.cookies.set).toHaveBeenCalledWith(
        "token",
        "val",
        { path: "/" }
      );
    });

    it("setAll sets multiple cookies on request and response", async () => {
      const request = makeMockRequest();

      mockCreateServerClient.mockImplementation(
        (url: string, key: string, config: any) => {
          config.cookies.setAll([
            { name: "sb-access-token", value: "access123", options: { path: "/" } },
            { name: "sb-refresh-token", value: "refresh456", options: { path: "/", httpOnly: true } },
          ]);
          return { auth: { getUser: mockGetUser } };
        }
      );

      const result = await updateSession(request);

      // Both cookies should be set on request
      expect(request.cookies.set).toHaveBeenCalledWith("sb-access-token", "access123");
      expect(request.cookies.set).toHaveBeenCalledWith("sb-refresh-token", "refresh456");
      // Both cookies should be set on response
      expect(result.cookies.set).toHaveBeenCalledWith("sb-access-token", "access123", { path: "/" });
      expect(result.cookies.set).toHaveBeenCalledWith("sb-refresh-token", "refresh456", { path: "/", httpOnly: true });
    });

    it("setAll with provided response does not create a new response", async () => {
      const request = makeMockRequest();
      const customResponse = {
        cookies: {
          set: jest.fn(),
          getAll: jest.fn().mockReturnValue([]),
        },
      } as any;

      let setAllCalled = false;
      mockCreateServerClient.mockImplementation(
        (url: string, key: string, config: any) => {
          config.cookies.setAll([
            { name: "sb-token", value: "value1", options: { path: "/" } },
          ]);
          setAllCalled = true;
          return { auth: { getUser: mockGetUser } };
        }
      );

      const result = await updateSession(request, customResponse);

      expect(setAllCalled).toBe(true);
      // When a response is provided, the returned response should be the custom one
      // with cookies set on it
      expect(customResponse.cookies.set).toHaveBeenCalledWith(
        "sb-token",
        "value1",
        { path: "/" }
      );
    });
  });
});
