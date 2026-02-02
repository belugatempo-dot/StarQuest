import { Resend } from "resend";
import type { EmailSendResult } from "@/types/reports";

// Singleton Resend client
let resendClient: Resend | null = null;

/**
 * Get or create the Resend client singleton
 */
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured - email sending disabled");
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

/**
 * Email options for sending
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Default sender email address
 */
const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "StarQuest <onboarding@resend.dev>";

/**
 * Send an email using Resend
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<EmailSendResult> {
  const client = getResendClient();

  if (!client) {
    return {
      success: false,
      error: "Email service not configured (RESEND_API_KEY missing)",
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: options.from || DEFAULT_FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("Resend API error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error sending email";
    console.error("Email send error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if email service is configured and available
 */
export function isEmailServiceAvailable(): boolean {
  return !!process.env.RESEND_API_KEY;
}
