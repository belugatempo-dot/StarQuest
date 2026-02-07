// Reset global mock and test real implementation
const mockCreateBrowserClient = jest.fn().mockReturnValue({
  auth: { getUser: jest.fn() },
  from: jest.fn(),
});

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: any[]) => mockCreateBrowserClient(...args),
}));

// Need to unmock the client module since jest.setup.js mocks it globally
jest.unmock("@/lib/supabase/client");

import { createClient } from "@/lib/supabase/client";

describe("lib/supabase/client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("calls createBrowserClient with env variables", () => {
    createClient();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
  });

  it("returns the client from createBrowserClient", () => {
    const result = createClient();
    expect(result).toBeDefined();
    expect(result.auth).toBeDefined();
  });

  it("exports createClient as a function", () => {
    expect(typeof createClient).toBe("function");
  });
});
