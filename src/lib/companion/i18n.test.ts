import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n";
import { COMPANION_TABS } from "@/lib/companion/nav";

describe("伴侣版 i18n 词条", () => {
  it("三个 tab 标签中英文都有且不同", () => {
    for (const tab of COMPANION_TABS) {
      const zh = t(tab.labelKey, "zh");
      const en = t(tab.labelKey, "en");
      expect(zh, `${tab.key} 缺中文`).not.toBe(tab.labelKey);
      expect(en, `${tab.key} 缺英文`).not.toBe(tab.labelKey);
      expect(zh, `${tab.key} 中英文相同`).not.toBe(en);
    }
  });

  it("Today 屏词条齐全", () => {
    const keys = [
      "companion.today.ranked",
      "companion.today.seeAll",
      "companion.today.recentlyViewed",
      "companion.stat.unread",
      "companion.stat.key",
    ] as const;
    for (const k of keys) {
      expect(t(k, "en"), `${k} 缺英文`).not.toBe(k);
      expect(t(k, "zh"), `${k} 缺中文`).not.toBe(k);
    }
  });

  it("带占位符的词条能替换", () => {
    expect(t("companion.stat.unread", "en", { n: 15 })).toContain("15");
  });
});
