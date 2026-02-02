import {
  generateInviteParentHtml,
  getInviteParentSubject,
} from "@/lib/email/templates/invite-parent";
import type { InviteParentEmailData } from "@/lib/email/templates/invite-parent";

describe("invite-parent email template", () => {
  const baseData: InviteParentEmailData = {
    inviterName: "Jane",
    familyName: "Smith Family",
    inviteCode: "ABC123",
    locale: "en",
    appUrl: "https://starquest-kappa.vercel.app",
  };

  describe("getInviteParentSubject", () => {
    it("generates English subject with family name", () => {
      const subject = getInviteParentSubject(baseData);
      expect(subject).toBe(
        "You're invited to join Smith Family on StarQuest"
      );
    });

    it("generates Chinese subject with family name", () => {
      const subject = getInviteParentSubject({
        ...baseData,
        locale: "zh-CN",
      });
      expect(subject).toBe("邀请您加入Smith Family的 StarQuest 家庭");
    });
  });

  describe("generateInviteParentHtml", () => {
    it("includes invite code in HTML", () => {
      const html = generateInviteParentHtml(baseData);
      expect(html).toContain("ABC123");
    });

    it("includes registration link with invite code", () => {
      const html = generateInviteParentHtml(baseData);
      expect(html).toContain(
        "https://starquest-kappa.vercel.app/en/register?invite=ABC123"
      );
    });

    it("includes inviter name", () => {
      const html = generateInviteParentHtml(baseData);
      expect(html).toContain("Jane");
    });

    it("includes Join Family CTA button", () => {
      const html = generateInviteParentHtml(baseData);
      expect(html).toContain("Join Family");
    });

    it("includes 7-day expiry note in English", () => {
      const html = generateInviteParentHtml(baseData);
      expect(html).toContain("This invitation expires in 7 days");
    });

    it("generates Chinese content for zh-CN locale", () => {
      const html = generateInviteParentHtml({
        ...baseData,
        locale: "zh-CN",
      });
      expect(html).toContain("加入家庭");
      expect(html).toContain("此邀请7天内有效");
      expect(html).toContain("邀请您在 StarQuest 上共同管理");
    });

    it("uses zh-CN locale in registration link", () => {
      const html = generateInviteParentHtml({
        ...baseData,
        locale: "zh-CN",
      });
      expect(html).toContain(
        "https://starquest-kappa.vercel.app/zh-CN/register?invite=ABC123"
      );
    });

    it("includes base layout brand elements", () => {
      const html = generateInviteParentHtml(baseData);
      expect(html).toContain("StarQuest");
      expect(html).toContain("Beluga Tempo");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("includes Chinese brand name for zh-CN locale", () => {
      const html = generateInviteParentHtml({
        ...baseData,
        locale: "zh-CN",
      });
      expect(html).toContain("夺星大闯关");
      expect(html).toContain("鲸律");
    });

    it("includes fallback code text", () => {
      const html = generateInviteParentHtml(baseData);
      expect(html).toContain("Or enter this code during registration");
      expect(html).toContain("<strong>ABC123</strong>");
    });

    it("includes Chinese fallback code text", () => {
      const html = generateInviteParentHtml({
        ...baseData,
        locale: "zh-CN",
      });
      expect(html).toContain("或在注册时输入此邀请码");
    });

    it("uses custom appUrl if provided", () => {
      const html = generateInviteParentHtml({
        ...baseData,
        appUrl: "https://custom.example.com",
      });
      expect(html).toContain(
        "https://custom.example.com/en/register?invite=ABC123"
      );
    });
  });
});
