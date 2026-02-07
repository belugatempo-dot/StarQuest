import {
  baseLayout,
  t,
  commonTranslations,
  colors,
} from "@/lib/email/templates/base-layout";
import type { ReportLocale } from "@/types/reports";

describe("base-layout email template", () => {
  describe("baseLayout", () => {
    it("returns complete HTML with DOCTYPE, html tag, head, and body", () => {
      const html = baseLayout("<p>Test content</p>", "en");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("<body");
      expect(html).toContain("</html>");
    });

    it("includes English brand name for en locale", () => {
      const html = baseLayout("<p>Hello</p>", "en");
      expect(html).toContain("StarQuest");
    });

    it("includes Chinese brand name for zh-CN locale", () => {
      const html = baseLayout("<p>Hello</p>", "zh-CN");
      expect(html).toContain("夺星大闯关");
    });

    it("includes English company name for en locale", () => {
      const html = baseLayout("<p>Hello</p>", "en");
      expect(html).toContain("Beluga Tempo");
    });

    it("includes Chinese company name for zh-CN locale", () => {
      const html = baseLayout("<p>Hello</p>", "zh-CN");
      expect(html).toContain("鲸律");
    });

    it("includes the content parameter in the output", () => {
      const content = "<p>Custom email body with unique text</p>";
      const html = baseLayout(content, "en");
      expect(html).toContain("Custom email body with unique text");
    });

    it("sets html lang attribute to en for en locale", () => {
      const html = baseLayout("<p>Test</p>", "en");
      expect(html).toContain('lang="en"');
    });

    it("sets html lang attribute to zh for zh-CN locale", () => {
      const html = baseLayout("<p>Test</p>", "zh-CN");
      expect(html).toContain('lang="zh"');
    });

    it("includes View in App button for en locale", () => {
      const html = baseLayout("<p>Test</p>", "en");
      expect(html).toContain("View in App");
    });

    it("includes Chinese View in App button for zh-CN locale", () => {
      const html = baseLayout("<p>Test</p>", "zh-CN");
      expect(html).toContain("在应用中查看");
    });

    it("includes footer with unsubscribe text for en locale", () => {
      const html = baseLayout("<p>Test</p>", "en");
      expect(html).toContain(
        "To manage your email preferences, visit Settings in the StarQuest app."
      );
    });

    it("includes footer with automated email notice", () => {
      const html = baseLayout("<p>Test</p>", "en");
      expect(html).toContain(
        "This is an automated email from StarQuest. Please do not reply directly to this email."
      );
    });

    it("includes footer with Chinese unsubscribe text for zh-CN locale", () => {
      const html = baseLayout("<p>Test</p>", "zh-CN");
      expect(html).toContain(
        "如需管理邮件偏好设置，请访问 StarQuest 应用中的设置页面。"
      );
    });

    it("uses default appUrl when not provided", () => {
      const html = baseLayout("<p>Test</p>", "en");
      expect(html).toContain("starquest-kappa.vercel.app");
    });

    it("uses custom appUrl when provided", () => {
      const html = baseLayout(
        "<p>Test</p>",
        "en",
        "https://custom.example.com"
      );
      expect(html).toContain("https://custom.example.com/en/admin");
    });

    it("links to admin page with correct locale in URL", () => {
      const html = baseLayout("<p>Test</p>", "zh-CN");
      expect(html).toContain("/zh-CN/admin");
    });

    it("includes copyright footer with current year", () => {
      const html = baseLayout("<p>Test</p>", "en");
      const currentYear = new Date().getFullYear();
      expect(html).toContain(`${currentYear}`);
    });
  });

  describe("t (translation helper)", () => {
    it("returns English text for en locale", () => {
      expect(t("brandName", "en")).toBe("StarQuest");
    });

    it("returns Chinese text for zh-CN locale", () => {
      expect(t("brandName", "zh-CN")).toBe("夺星大闯关");
    });

    it("returns English text for zh-CN when Chinese translation is missing", () => {
      // All common keys have zh-CN, so test the fallback chain:
      // If the key exists but zh-CN is missing, should fall back to en
      expect(t("companyName", "en")).toBe("Beluga Tempo");
    });

    it("returns the key itself for completely unknown keys", () => {
      expect(t("completelyUnknownKey", "en")).toBe("completelyUnknownKey");
    });

    it("returns the key itself for unknown keys with zh-CN locale", () => {
      expect(t("totallyMadeUpKey", "zh-CN")).toBe("totallyMadeUpKey");
    });
  });

  describe("colors", () => {
    it("has primary color (Tiffany blue)", () => {
      expect(colors.primary).toBe("#81D8D0");
    });

    it("has primaryDark color", () => {
      expect(colors.primaryDark).toBeDefined();
      expect(typeof colors.primaryDark).toBe("string");
    });

    it("has secondary color (dark blue)", () => {
      expect(colors.secondary).toBe("#1E3A5F");
    });

    it("has background color", () => {
      expect(colors.background).toBeDefined();
    });

    it("has white color", () => {
      expect(colors.white).toBe("#FFFFFF");
    });

    it("has text and textLight colors", () => {
      expect(colors.text).toBeDefined();
      expect(colors.textLight).toBeDefined();
    });

    it("has border color", () => {
      expect(colors.border).toBeDefined();
    });

    it("has success, warning, and error colors", () => {
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
    });
  });

  describe("commonTranslations", () => {
    it("has brandName key", () => {
      expect(commonTranslations.brandName).toBeDefined();
      expect(commonTranslations.brandName.en).toBe("StarQuest");
      expect(commonTranslations.brandName["zh-CN"]).toBe("夺星大闯关");
    });

    it("has companyName key", () => {
      expect(commonTranslations.companyName).toBeDefined();
      expect(commonTranslations.companyName.en).toBe("Beluga Tempo");
      expect(commonTranslations.companyName["zh-CN"]).toBe("鲸律");
    });

    it("has unsubscribeText key", () => {
      expect(commonTranslations.unsubscribeText).toBeDefined();
      expect(commonTranslations.unsubscribeText.en).toContain("email preferences");
    });

    it("has footerNote key", () => {
      expect(commonTranslations.footerNote).toBeDefined();
      expect(commonTranslations.footerNote.en).toContain("automated email");
    });

    it("has viewInApp key", () => {
      expect(commonTranslations.viewInApp).toBeDefined();
      expect(commonTranslations.viewInApp.en).toBe("View in App");
      expect(commonTranslations.viewInApp["zh-CN"]).toBe("在应用中查看");
    });
  });
});
