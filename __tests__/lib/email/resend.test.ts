describe("Email Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isEmailServiceAvailable", () => {
    it("returns false when RESEND_API_KEY is not set", () => {
      delete process.env.RESEND_API_KEY;
      const { isEmailServiceAvailable } = require("@/lib/email/resend");
      expect(isEmailServiceAvailable()).toBe(false);
    });

    it("returns true when RESEND_API_KEY is set", () => {
      process.env.RESEND_API_KEY = "test-api-key";
      const { isEmailServiceAvailable } = require("@/lib/email/resend");
      expect(isEmailServiceAvailable()).toBe(true);
    });
  });

  describe("sendEmail", () => {
    it("returns error when RESEND_API_KEY is not configured", async () => {
      delete process.env.RESEND_API_KEY;
      const { sendEmail } = require("@/lib/email/resend");

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("RESEND_API_KEY missing");
    });

    it("sends email successfully when API key is configured", async () => {
      process.env.RESEND_API_KEY = "test-api-key";

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: "test-message-id" },
        error: null,
      });

      jest.doMock("resend", () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: {
            send: mockSend,
          },
        })),
      }));

      const { sendEmail } = require("@/lib/email/resend");

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("test-message-id");
    });

    it("handles array of recipients", async () => {
      process.env.RESEND_API_KEY = "test-api-key";

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: "test-message-id" },
        error: null,
      });

      jest.doMock("resend", () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: {
            send: mockSend,
          },
        })),
      }));

      const { sendEmail } = require("@/lib/email/resend");

      await sendEmail({
        to: ["test1@example.com", "test2@example.com"],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["test1@example.com", "test2@example.com"],
        })
      );
    });

    it("returns error when Resend API fails", async () => {
      process.env.RESEND_API_KEY = "test-api-key";

      const mockSend = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "API rate limit exceeded" },
      });

      jest.doMock("resend", () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: {
            send: mockSend,
          },
        })),
      }));

      const { sendEmail } = require("@/lib/email/resend");

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("API rate limit exceeded");
    });

    it("handles exceptions gracefully", async () => {
      process.env.RESEND_API_KEY = "test-api-key";

      const mockSend = jest.fn().mockRejectedValue(new Error("Network error"));

      jest.doMock("resend", () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: {
            send: mockSend,
          },
        })),
      }));

      const { sendEmail } = require("@/lib/email/resend");

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });
});
