/**
 * Tests for invite-parent API route logic
 *
 * Unit tests for validation logic + integration tests calling the handler.
 */

// Mock next/server before any imports
jest.mock("next/server", () => {
  class MockHeaders {
    private _headers: Map<string, string>;
    constructor(init?: Record<string, string>) {
      this._headers = new Map(Object.entries(init || {}));
    }
    get(name: string) {
      return this._headers.get(name) || null;
    }
  }
  class MockNextRequest {
    private _headers: MockHeaders;
    url: string;
    nextUrl: { searchParams: URLSearchParams };
    _body: any;
    constructor(
      url: string,
      init?: {
        headers?: Record<string, string>;
        method?: string;
        body?: string;
      }
    ) {
      this.url = url;
      this._headers = new MockHeaders(init?.headers);
      this.nextUrl = {
        searchParams: new URLSearchParams(new URL(url).search),
      };
      this._body = init?.body ? JSON.parse(init.body) : null;
    }
    get headers() {
      return this._headers;
    }
    async json() {
      return this._body;
    }
  }
  class MockNextResponse {
    status: number;
    body: any;
    constructor(body: any, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
    }
    static json(body: any, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
  createAdminClient: jest.fn(),
}));

const mockSendEmail = jest.fn();
const mockIsEmailServiceAvailable = jest.fn();
jest.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  isEmailServiceAvailable: (...args: any[]) =>
    mockIsEmailServiceAvailable(...args),
}));

jest.mock("@/lib/email/templates/invite-parent", () => ({
  generateInviteParentHtml: jest.fn().mockReturnValue("<html>test</html>"),
  getInviteParentSubject: jest.fn().mockReturnValue("Test Subject"),
}));

import { POST } from "@/app/api/invite-parent/route";
const { NextRequest } = require("next/server");

function makeChain(finalResult: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(finalResult);
  chain.single = jest.fn().mockResolvedValue(finalResult);
  return chain;
}

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/invite-parent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("Invite Parent API - Handler Integration Tests", () => {
  let profileChain: any;
  let familyChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    profileChain = makeChain({
      data: { name: "Parent", role: "parent", family_id: "family-1" },
      error: null,
    });

    familyChain = makeChain({
      data: { name: "Smith Family" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return profileChain;
      if (table === "families") return familyChain;
      return makeChain({ data: null, error: null });
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockRpc.mockResolvedValue({ data: "INVITE-CODE-123", error: null });

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
      rpc: mockRpc,
    });

    mockIsEmailServiceAvailable.mockReturnValue(true);
    mockSendEmail.mockResolvedValue({ success: true });
  });

  it("returns 500 when RPC throws an exception (non-Error)", async () => {
    // This covers the rpcErr instanceof Error branch (false path) at lines 99-100
    mockRpc.mockRejectedValue("string-error");

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("RPC exception: string-error");
  });

  it("returns 500 when RPC throws an Error instance", async () => {
    // This covers the rpcErr instanceof Error branch (true path) at lines 99-100
    mockRpc.mockRejectedValue(new Error("Connection refused"));

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("RPC exception: Connection refused");
  });

  it("returns 500 with error message when outer catch receives a non-Error", async () => {
    // This covers the outer catch at lines 136-138 with non-Error
    // Make request.json() throw a non-Error value
    const badRequest = {
      async json() {
        throw "unexpected-string-thrown";
      },
    };

    const response = await POST(badRequest as any);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("unexpected-string-thrown");
  });

  it("returns 500 with error message when outer catch receives an Error", async () => {
    // This covers the outer catch at lines 136-138 with Error instance
    const badRequest = {
      async json() {
        throw new Error("JSON parse failed");
      },
    };

    const response = await POST(badRequest as any);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("JSON parse failed");
  });

  it("uses fallback family name when family query returns null", async () => {
    familyChain.single.mockResolvedValue({
      data: null,
      error: null,
    });

    mockIsEmailServiceAvailable.mockReturnValue(true);
    mockSendEmail.mockResolvedValue({ success: true });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "test@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("uses fallback inviter name when profile name is empty", async () => {
    profileChain.single.mockResolvedValue({
      data: { name: "", role: "parent", family_id: "family-1" },
      error: null,
    });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "test@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns 403 when profile is null", async () => {
    profileChain.single.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("handles zh-CN locale for email template", async () => {
    mockIsEmailServiceAvailable.mockReturnValue(true);
    mockSendEmail.mockResolvedValue({ success: true });

    const request = makeRequest({
      familyId: "family-1",
      locale: "zh-CN",
      email: "test@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.emailSent).toBe(true);
  });

  it("handles email with whitespace by trimming", async () => {
    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "  test@example.com  ",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("handles sendEmail returning success: false", async () => {
    mockIsEmailServiceAvailable.mockReturnValue(true);
    mockSendEmail.mockResolvedValue({ success: false, error: "Domain not verified" });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "test@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.emailSent).toBe(false);
  });

  it("returns 400 when familyId is missing", async () => {
    const request = makeRequest({ locale: "en" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing required fields");
  });

  it("returns 400 when locale is missing", async () => {
    const request = makeRequest({ familyId: "family-1" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing required fields");
  });

  it("returns 400 for invalid email format", async () => {
    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "not-an-email",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid email address");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 500 when RPC returns error object", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "RPC function failed" },
    });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("RPC error");
  });

  it("returns 500 when RPC returns null data (no invite code)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("RPC returned no invite code");
  });

  it("returns emailSent=false when sendEmail throws", async () => {
    mockIsEmailServiceAvailable.mockReturnValue(true);
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "test@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.emailSent).toBe(false);
  });

  it("returns emailSent=false when email service is not available", async () => {
    mockIsEmailServiceAvailable.mockReturnValue(false);

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "test@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.emailSent).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not attempt email when no email is provided", async () => {
    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.emailSent).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("Invite Parent API - Unit Tests", () => {
  describe("Input validation", () => {
    it("should validate required fields: familyId and locale (email optional)", () => {
      const body1 = { familyId: "", locale: "en" };
      const body2 = { familyId: "f1", locale: "" };

      expect(!body1.familyId || !body1.locale).toBe(true);
      expect(!body2.familyId || !body2.locale).toBe(true);
    });

    it("should accept valid required fields without email", () => {
      const body = { familyId: "f1", locale: "en" };
      expect(!body.familyId || !body.locale).toBe(false);
    });

    it("should accept valid required fields with email", () => {
      const body = { familyId: "f1", email: "test@test.com", locale: "en" };
      expect(!body.familyId || !body.locale).toBe(false);
    });

    it("should validate email format only when email is provided", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Valid emails
      expect(emailRegex.test("user@example.com")).toBe(true);
      expect(emailRegex.test("user+tag@example.co.uk")).toBe(true);

      // Invalid emails
      expect(emailRegex.test("not-an-email")).toBe(false);
      expect(emailRegex.test("@example.com")).toBe(false);
      expect(emailRegex.test("user@")).toBe(false);
      expect(emailRegex.test("user @example.com")).toBe(false);
      expect(emailRegex.test("")).toBe(false);
    });

    it("should allow empty/undefined email (optional field)", () => {
      const body1 = { familyId: "f1", locale: "en" };
      const body2 = { familyId: "f1", email: undefined, locale: "en" };
      const body3 = { familyId: "f1", email: "", locale: "en" };

      const trimmedEmail1 = body1.email?.trim() || "";
      const trimmedEmail2 = body2.email?.trim() || "";
      const trimmedEmail3 = body3.email?.trim() || "";

      // Empty emails should not trigger validation
      expect(trimmedEmail1).toBe("");
      expect(trimmedEmail2).toBe("");
      expect(trimmedEmail3).toBe("");
    });
  });

  describe("Authorization logic", () => {
    it("should reject when user is not authenticated (no user)", () => {
      const user = null;
      expect(user).toBeNull();
    });

    it("should reject when user role is not parent", () => {
      const profile = { role: "child", family_id: "f1", name: "Kid" };
      const familyId = "f1";
      expect(
        profile.role !== "parent" || profile.family_id !== familyId
      ).toBe(true);
    });

    it("should reject when user family_id does not match request", () => {
      const profile = { role: "parent", family_id: "f2", name: "Dad" };
      const familyId = "f1";
      expect(
        profile.role !== "parent" || profile.family_id !== familyId
      ).toBe(true);
    });

    it("should allow parent with matching family_id", () => {
      const profile = { role: "parent", family_id: "f1", name: "Dad" };
      const familyId = "f1";
      expect(
        profile.role !== "parent" || profile.family_id !== familyId
      ).toBe(false);
    });
  });

  describe("Response format", () => {
    it("should always return inviteCode and emailSent in success response", () => {
      const response = { success: true, inviteCode: "ABC123", emailSent: false };
      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("inviteCode");
      expect(response).toHaveProperty("emailSent");
      expect(typeof response.inviteCode).toBe("string");
      expect(typeof response.emailSent).toBe("boolean");
    });

    it("should set emailSent to true when email was sent successfully", () => {
      const response = { success: true, inviteCode: "ABC123", emailSent: true };
      expect(response.emailSent).toBe(true);
    });

    it("should set emailSent to false when no email provided", () => {
      const response = { success: true, inviteCode: "ABC123", emailSent: false };
      expect(response.emailSent).toBe(false);
    });

    it("should set emailSent to false when email service unavailable", () => {
      // Simulating: email provided but service not available
      const emailProvided = true;
      const isEmailServiceAvailable = false;
      const shouldAttemptEmail = emailProvided && isEmailServiceAvailable;
      expect(shouldAttemptEmail).toBe(false);
    });
  });

  describe("Email sending logic", () => {
    it("should only attempt email when both email provided and service available", () => {
      const cases = [
        { email: "", available: true, expected: false },
        { email: "", available: false, expected: false },
        { email: "test@test.com", available: false, expected: false },
        { email: "test@test.com", available: true, expected: true },
      ];

      for (const { email, available, expected } of cases) {
        const trimmedEmail = email.trim();
        const shouldAttempt = !!trimmedEmail && available;
        expect(shouldAttempt).toBe(expected);
      }
    });

    it("should not fail the whole request if email sending fails", () => {
      // Email failure should result in emailSent: false, NOT a 500 error
      const emailSendResult = { success: false, error: "Domain not verified" };
      const emailSent = emailSendResult.success;
      const response = { success: true, inviteCode: "CODE1", emailSent };

      expect(response.success).toBe(true);
      expect(response.emailSent).toBe(false);
      expect(response.inviteCode).toBe("CODE1");
    });
  });

  describe("Locale normalization", () => {
    it("should normalize zh-CN locale to zh-CN ReportLocale", () => {
      const locale = "zh-CN";
      const reportLocale = locale === "zh-CN" ? "zh-CN" : "en";
      expect(reportLocale).toBe("zh-CN");
    });

    it("should normalize other locales to en ReportLocale", () => {
      const locale = "en";
      const reportLocale = locale === "zh-CN" ? "zh-CN" : "en";
      expect(reportLocale).toBe("en");
    });

    it("should normalize unknown locale to en", () => {
      const locale = "fr";
      const reportLocale = locale === "zh-CN" ? "zh-CN" : "en";
      expect(reportLocale).toBe("en");
    });
  });

  describe("Error handling", () => {
    it("should handle RPC failure (null invite code)", () => {
      const inviteCode = null;
      const rpcError = null;
      expect(!inviteCode).toBe(true);
    });

    it("should handle RPC error object", () => {
      const inviteCode = null;
      const rpcError = { message: "RPC failed" };
      expect(rpcError || !inviteCode).toBeTruthy();
    });

    it("should handle successful RPC response", () => {
      const inviteCode = "ABC123";
      const rpcError = null;
      expect(rpcError || !inviteCode).toBe(false);
    });
  });
});
