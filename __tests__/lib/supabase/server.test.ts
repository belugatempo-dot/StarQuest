// Mock dependencies before importing
const mockCreateServerClient = jest.fn();
const mockCreateSupabaseClient = jest.fn();
const mockCookieStore = {
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
};

jest.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateSupabaseClient,
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue(mockCookieStore),
}));

describe("lib/supabase/server", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    };
    mockCreateServerClient.mockReturnValue({ auth: {} });
    mockCreateSupabaseClient.mockReturnValue({ auth: {} });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createClient", () => {
    it("creates a server client with cookie handlers", async () => {
      const { createClient } = require("@/lib/supabase/server");
      await createClient();

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

    it("cookie getAll calls cookieStore.getAll", async () => {
      const { createClient } = require("@/lib/supabase/server");
      await createClient();

      const cookieConfig = mockCreateServerClient.mock.calls[0][2];
      cookieConfig.cookies.getAll();
      expect(mockCookieStore.getAll).toHaveBeenCalled();
    });

    it("cookie setAll calls cookieStore.set for each cookie", async () => {
      const { createClient } = require("@/lib/supabase/server");
      await createClient();

      const cookieConfig = mockCreateServerClient.mock.calls[0][2];
      cookieConfig.cookies.setAll([
        { name: "a", value: "1", options: {} },
        { name: "b", value: "2", options: {} },
      ]);
      expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
    });

    it("cookie setAll swallows errors from Server Components", async () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error("Server Component");
      });
      const { createClient } = require("@/lib/supabase/server");
      await createClient();

      const cookieConfig = mockCreateServerClient.mock.calls[0][2];
      // Should not throw
      expect(() =>
        cookieConfig.cookies.setAll([{ name: "a", value: "1", options: {} }])
      ).not.toThrow();
    });
  });

  describe("createAdminClient", () => {
    it("creates admin client with service role key", () => {
      const { createAdminClient } = require("@/lib/supabase/server");
      createAdminClient();

      expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-service-key",
        expect.objectContaining({
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      );
    });

    it("falls back to anon key when service role not set", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      jest.resetModules();

      const { createAdminClient } = require("@/lib/supabase/server");
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      createAdminClient();

      expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY is not set")
      );
      consoleSpy.mockRestore();
    });
  });
});
