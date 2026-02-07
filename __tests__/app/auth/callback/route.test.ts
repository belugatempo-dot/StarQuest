/**
 * Email Verification Callback Route Tests
 *
 * Tests the actual GET route handler for email verification callback.
 */

const mockVerifyOtp = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { verifyOtp: (...args: any[]) => mockVerifyOtp(...args) },
    })
  ),
}));

jest.mock("next/server", () => {
  class MockNextResponse {
    static redirect(url: string) {
      return { type: "redirect", url: String(url) };
    }
  }
  return { NextResponse: MockNextResponse };
});

import { GET } from "@/app/[locale]/(auth)/auth/callback/route";

function makeRequest(url: string) {
  return { url } as any;
}

describe("auth/callback route handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("successful OTP verification", () => {
    it("redirects to /en/auth/confirmed on successful OTP verification", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=abc123&type=email"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/en/auth/confirmed",
      });
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "abc123",
        type: "email",
      });
    });

    it("logs success message on successful verification", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      const consoleSpy = jest.spyOn(console, "log");

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=abc123&type=email"
      );
      await GET(request);

      expect(consoleSpy).toHaveBeenCalledWith("✅ Email verification successful");
    });
  });

  describe("verification errors", () => {
    it("redirects to /en/auth/verify-email?error=invalid_token on verification error", async () => {
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Token expired", status: 400 },
      });

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=expired123&type=email"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/en/auth/verify-email?error=invalid_token",
      });
    });

    it("logs enhanced error details on verification error", async () => {
      const consoleSpy = jest.spyOn(console, "error");
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Token expired", status: 400 },
      });

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=expired123&type=recovery"
      );
      await GET(request);

      expect(consoleSpy).toHaveBeenCalledWith("❌ Verification error:", {
        message: "Token expired",
        status: 400,
        token_hash_length: 10,
        type_received: "recovery",
        type_used: "recovery",
      });
    });
  });

  describe("missing parameters", () => {
    it("redirects to verify-email when token_hash is missing", async () => {
      const request = makeRequest(
        "https://example.com/en/auth/callback?type=email"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/en/auth/verify-email?error=invalid_token",
      });
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it("redirects to verify-email when type is missing", async () => {
      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=abc123"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/en/auth/verify-email?error=invalid_token",
      });
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it("redirects to verify-email when both params are missing", async () => {
      const request = makeRequest("https://example.com/en/auth/callback");
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/en/auth/verify-email?error=invalid_token",
      });
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });
  });

  describe("locale extraction", () => {
    it("extracts zh-CN locale from pathname", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeRequest(
        "https://example.com/zh-CN/auth/callback?token_hash=abc123&type=email"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/zh-CN/auth/confirmed",
      });
    });

    it("extracts fr locale from pathname", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeRequest(
        "https://example.com/fr/auth/callback?token_hash=abc123&type=email"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/fr/auth/confirmed",
      });
    });

    it("defaults locale to en when pathname has no locale segment", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      // Pathname is just "/" which after split/filter gives empty array
      const request = makeRequest(
        "https://example.com/?token_hash=abc123&type=email"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/en/auth/confirmed",
      });
    });

    it("uses locale in error redirect for zh-CN", async () => {
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Error", status: 400 },
      });

      const request = makeRequest(
        "https://example.com/zh-CN/auth/callback?token_hash=abc123&type=email"
      );
      const result = await GET(request);

      expect(result).toEqual({
        type: "redirect",
        url: "https://example.com/zh-CN/auth/verify-email?error=invalid_token",
      });
    });
  });

  describe("OTP type validation", () => {
    it.each(["email", "recovery", "invite", "email_change"])(
      "uses valid type '%s' as-is",
      async (validType) => {
        mockVerifyOtp.mockResolvedValue({ error: null });

        const request = makeRequest(
          `https://example.com/en/auth/callback?token_hash=abc123&type=${validType}`
        );
        await GET(request);

        expect(mockVerifyOtp).toHaveBeenCalledWith({
          token_hash: "abc123",
          type: validType,
        });
      }
    );

    it("defaults to 'email' type for invalid type param 'signup'", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=abc123&type=signup"
      );
      await GET(request);

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "abc123",
        type: "email",
      });
    });

    it("defaults to 'email' type for invalid type param 'magiclink'", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=abc123&type=magiclink"
      );
      await GET(request);

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "abc123",
        type: "email",
      });
    });

    it("defaults to 'email' type for completely random type value", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=abc123&type=totally_invalid"
      );
      await GET(request);

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "abc123",
        type: "email",
      });
    });

    it("logs invalid type_received and type_used='email' on error", async () => {
      const consoleSpy = jest.spyOn(console, "error");
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Bad token", status: 400 },
      });

      const request = makeRequest(
        "https://example.com/en/auth/callback?token_hash=abc123&type=signup"
      );
      await GET(request);

      expect(consoleSpy).toHaveBeenCalledWith("❌ Verification error:", {
        message: "Bad token",
        status: 400,
        token_hash_length: 6,
        type_received: "signup",
        type_used: "email",
      });
    });
  });
});
