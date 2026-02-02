import type { ReportLocale } from "@/types/reports";
import { baseLayout, colors } from "./base-layout";

export interface InviteParentEmailData {
  inviterName: string;
  familyName: string;
  inviteCode: string;
  locale: ReportLocale;
  appUrl?: string;
}

const translations = {
  subject: {
    en: (familyName: string) =>
      `You're invited to join ${familyName} on StarQuest`,
    "zh-CN": (familyName: string) =>
      `邀请您加入${familyName}的 StarQuest 家庭`,
  },
  greeting: {
    en: (inviterName: string) =>
      `${inviterName} has invited you to co-manage their family on StarQuest`,
    "zh-CN": (inviterName: string) =>
      `${inviterName} 邀请您在 StarQuest 上共同管理他们的家庭`,
  },
  description: {
    en: "As a co-parent, you'll be able to manage quests, approve star requests, and track your children's progress together.",
    "zh-CN":
      "作为共同家长，您将能够管理任务、审批星星申请，并一起跟踪孩子们的进展。",
  },
  joinButton: {
    en: "Join Family",
    "zh-CN": "加入家庭",
  },
  fallbackText: {
    en: (code: string) =>
      `Or enter this code during registration: <strong>${code}</strong>`,
    "zh-CN": (code: string) =>
      `或在注册时输入此邀请码：<strong>${code}</strong>`,
  },
  expiryNote: {
    en: "This invitation expires in 7 days.",
    "zh-CN": "此邀请7天内有效。",
  },
};

export function getInviteParentSubject(data: InviteParentEmailData): string {
  return translations.subject[data.locale](data.familyName);
}

export function generateInviteParentHtml(data: InviteParentEmailData): string {
  const {
    inviterName,
    familyName,
    inviteCode,
    locale,
    appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      "https://starquest-kappa.vercel.app",
  } = data;

  const registerUrl = `${appUrl}/${locale}/register?invite=${inviteCode}`;

  const content = `
    <h2 style="color: ${colors.secondary}; margin-top: 0;">
      ${translations.greeting[locale](inviterName)}
    </h2>

    <p style="color: ${colors.text}; font-size: 16px;">
      ${translations.description[locale]}
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${registerUrl}" class="btn" style="
        display: inline-block;
        padding: 16px 32px;
        background-color: ${colors.primary};
        color: ${colors.white} !important;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 18px;
      ">${translations.joinButton[locale]}</a>
    </div>

    <div class="card" style="
      background-color: ${colors.background};
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
      text-align: center;
    ">
      <p style="color: ${colors.textLight}; margin: 0 0 8px 0; font-size: 14px;">
        ${translations.fallbackText[locale](inviteCode)}
      </p>
    </div>

    <p style="color: ${colors.textLight}; font-size: 14px; text-align: center;">
      ${translations.expiryNote[locale]}
    </p>
  `;

  return baseLayout(content, locale, appUrl);
}
