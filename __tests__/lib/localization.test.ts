import {
  getLocalizedName,
  getQuestName,
  getRewardName,
} from "@/lib/localization";

describe("localization utilities", () => {
  describe("getLocalizedName", () => {
    it("returns English name for 'en' locale", () => {
      expect(getLocalizedName("Hello", "你好", "en")).toBe("Hello");
    });

    it("returns Chinese name for 'zh-CN' locale", () => {
      expect(getLocalizedName("Hello", "你好", "zh-CN")).toBe("你好");
    });

    it("falls back to English when Chinese name is null", () => {
      expect(getLocalizedName("Hello", null, "zh-CN")).toBe("Hello");
    });

    it("falls back to English when Chinese name is undefined", () => {
      expect(getLocalizedName("Hello", undefined, "zh-CN")).toBe("Hello");
    });

    it("falls back to English when Chinese name is empty string", () => {
      expect(getLocalizedName("Hello", "", "zh-CN")).toBe("Hello");
    });

    it("returns English name for unknown locale", () => {
      expect(getLocalizedName("Hello", "你好", "fr")).toBe("Hello");
    });

    it("returns English name for empty locale", () => {
      expect(getLocalizedName("Hello", "你好", "")).toBe("Hello");
    });
  });

  describe("getQuestName", () => {
    it("returns English quest name for 'en' locale", () => {
      const quest = { name_en: "Brush Teeth", name_zh: "刷牙" };
      expect(getQuestName(quest, "en")).toBe("Brush Teeth");
    });

    it("returns Chinese quest name for 'zh-CN' locale", () => {
      const quest = { name_en: "Brush Teeth", name_zh: "刷牙" };
      expect(getQuestName(quest, "zh-CN")).toBe("刷牙");
    });

    it("falls back to English when name_zh is null", () => {
      const quest = { name_en: "Brush Teeth", name_zh: null };
      expect(getQuestName(quest, "zh-CN")).toBe("Brush Teeth");
    });

    it("returns 'Unknown Quest' when quest is null", () => {
      expect(getQuestName(null, "en")).toBe("Unknown Quest");
    });

    it("returns 'Unknown Quest' when quest is undefined", () => {
      expect(getQuestName(undefined, "en")).toBe("Unknown Quest");
    });
  });

  describe("getRewardName", () => {
    it("returns English reward name for 'en' locale", () => {
      const reward = { name_en: "Ice Cream", name_zh: "冰淇淋" };
      expect(getRewardName(reward, "en")).toBe("Ice Cream");
    });

    it("returns Chinese reward name for 'zh-CN' locale", () => {
      const reward = { name_en: "Ice Cream", name_zh: "冰淇淋" };
      expect(getRewardName(reward, "zh-CN")).toBe("冰淇淋");
    });

    it("falls back to English when name_zh is null", () => {
      const reward = { name_en: "Ice Cream", name_zh: null };
      expect(getRewardName(reward, "zh-CN")).toBe("Ice Cream");
    });

    it("returns 'Unknown Reward' when reward is null", () => {
      expect(getRewardName(null, "en")).toBe("Unknown Reward");
    });

    it("returns 'Unknown Reward' when reward is undefined", () => {
      expect(getRewardName(undefined, "en")).toBe("Unknown Reward");
    });
  });
});
