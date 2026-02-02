import type { ReportLocale } from "@/types/reports";

/**
 * Bilingual text helper
 */
export interface BilingualText {
  en: string;
  "zh-CN": string;
}

/**
 * Common translations for email templates
 */
export const commonTranslations: Record<string, BilingualText> = {
  brandName: {
    en: "StarQuest",
    "zh-CN": "夺星大闯关",
  },
  companyName: {
    en: "Beluga Tempo",
    "zh-CN": "鲸律",
  },
  unsubscribeText: {
    en: "To manage your email preferences, visit Settings in the StarQuest app.",
    "zh-CN": "如需管理邮件偏好设置，请访问 StarQuest 应用中的设置页面。",
  },
  footerNote: {
    en: "This is an automated email from StarQuest. Please do not reply directly to this email.",
    "zh-CN": "这是 StarQuest 的自动邮件，请勿直接回复。",
  },
  viewInApp: {
    en: "View in App",
    "zh-CN": "在应用中查看",
  },
};

/**
 * Get localized text
 */
export function t(key: string, locale: ReportLocale): string {
  return commonTranslations[key]?.[locale] || commonTranslations[key]?.en || key;
}

/**
 * Brand colors
 */
export const colors = {
  primary: "#81D8D0", // Tiffany blue
  primaryDark: "#5BC4BB",
  secondary: "#1E3A5F", // Starry dark blue
  background: "#F8FAFC",
  white: "#FFFFFF",
  text: "#1F2937",
  textLight: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

/**
 * Base HTML email layout with responsive styles
 */
export function baseLayout(
  content: string,
  locale: ReportLocale,
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL || "https://starquest-kappa.vercel.app"
): string {
  return `
<!DOCTYPE html>
<html lang="${locale === "zh-CN" ? "zh" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${t("brandName", locale)}</title>
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
    }
    table {
      border-collapse: collapse !important;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }

    /* Main styles */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: ${colors.text};
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header-logo {
      font-size: 28px;
      font-weight: bold;
      color: ${colors.white};
      margin: 0;
    }
    .header-tagline {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 8px;
    }

    /* Content */
    .content {
      background-color: ${colors.white};
      padding: 32px 24px;
    }

    /* Cards */
    .card {
      background-color: ${colors.background};
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
    }
    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: ${colors.secondary};
      margin: 0 0 12px 0;
    }

    /* Stats */
    .stats-grid {
      display: table;
      width: 100%;
      margin: 16px 0;
    }
    .stat-item {
      display: table-cell;
      text-align: center;
      padding: 16px;
      background-color: ${colors.background};
      border-radius: 8px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: ${colors.primary};
    }
    .stat-label {
      font-size: 12px;
      color: ${colors.textLight};
      text-transform: uppercase;
      margin-top: 4px;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .data-table th {
      background-color: ${colors.background};
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: ${colors.textLight};
      border-bottom: 2px solid ${colors.border};
    }
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid ${colors.border};
    }

    /* Buttons */
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${colors.primary};
      color: ${colors.white} !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .btn:hover {
      background-color: ${colors.primaryDark};
    }

    /* Footer */
    .footer {
      background-color: ${colors.background};
      padding: 24px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: ${colors.textLight};
      margin: 4px 0;
    }
    .footer-brand {
      font-weight: 600;
      color: ${colors.secondary};
    }

    /* Utilities */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-success { color: ${colors.success}; }
    .text-warning { color: ${colors.warning}; }
    .text-error { color: ${colors.error}; }
    .text-muted { color: ${colors.textLight}; }
    .mt-0 { margin-top: 0; }
    .mb-0 { margin-bottom: 0; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content, .header, .footer {
        padding: 20px 16px !important;
      }
      .stats-grid {
        display: block;
      }
      .stat-item {
        display: block;
        margin-bottom: 8px;
      }
    }
  </style>
</head>
<body style="background-color: ${colors.background}; margin: 0; padding: 20px 0;">
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1 class="header-logo">${t("brandName", locale)}</h1>
      <p class="header-tagline">${t("companyName", locale)}</p>
    </div>

    <!-- Main Content -->
    <div class="content">
      ${content}

      <div class="text-center">
        <a href="${appUrl}/${locale}/admin" class="btn">${t("viewInApp", locale)}</a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>${t("footerNote", locale)}</p>
      <p>${t("unsubscribeText", locale)}</p>
      <p class="footer-brand">&copy; ${new Date().getFullYear()} ${t("companyName", locale)} | ${t("brandName", locale)}</p>
    </div>
  </div>
</body>
</html>
`;
}
