/**
 * Tests for invite-parent API route
 * Tests POST from app/api/invite-parent/route.ts
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
  isEmailServiceAvailable: (...args: any[]) => mockIsEmailServiceAvailable(...args),
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

describe("Invite Parent API Route", () => {
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

  it("returns 400 when familyId missing", async () => {
    const request = makeRequest({ locale: "en", email: "test@test.com" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing required fields");
  });

  it("returns 400 when locale missing", async () => {
    const request = makeRequest({ familyId: "family-1", email: "test@test.com" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing required fields");
  });

  it("returns 400 when email invalid format", async () => {
    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "not-an-email",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid email address");
  });

  it("returns 401 when user not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not parent in family", async () => {
    profileChain.single.mockResolvedValue({
      data: { name: "Child", role: "child", family_id: "family-1" },
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

  it("returns 403 when user belongs to different family", async () => {
    profileChain.single.mockResolvedValue({
      data: { name: "Parent", role: "parent", family_id: "other-family" },
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

  it("returns 500 when RPC fails", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "RPC failed" },
    });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("RPC error");
  });

  it("returns 500 when RPC returns no data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("RPC returned no invite code");
  });

  it("returns success with inviteCode when no email provided", async () => {
    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.inviteCode).toBe("INVITE-CODE-123");
    expect(response.body.emailSent).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns success with emailSent=true when email sent successfully", async () => {
    mockSendEmail.mockResolvedValue({ success: true });
    mockIsEmailServiceAvailable.mockReturnValue(true);

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "coparent@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.inviteCode).toBe("INVITE-CODE-123");
    expect(response.body.emailSent).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "coparent@example.com",
        subject: "Test Subject",
        html: "<html>test</html>",
      })
    );
  });

  it("returns success with emailSent=false when email service unavailable", async () => {
    mockIsEmailServiceAvailable.mockReturnValue(false);

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "coparent@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.inviteCode).toBe("INVITE-CODE-123");
    expect(response.body.emailSent).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns success with emailSent=false when sendEmail throws", async () => {
    mockIsEmailServiceAvailable.mockReturnValue(true);
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const request = makeRequest({
      familyId: "family-1",
      locale: "en",
      email: "coparent@example.com",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.inviteCode).toBe("INVITE-CODE-123");
    expect(response.body.emailSent).toBe(false);
  });
});
