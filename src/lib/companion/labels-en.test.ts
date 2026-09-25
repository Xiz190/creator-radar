import { describe, expect, it } from "vitest";
import { CATEGORY_STYLE } from "@/lib/monitor/content-meta";
import { CATEGORY_LABEL_EN, categoryLabelEn } from "@/lib/companion/labels-en";

describe("分类英文名", () => {
  const keys = Object.keys(CATEGORY_STYLE);

  it("13 个分类全部有英文名", () => {
    for (const key of keys) {
      expect(CATEGORY_LABEL_EN[key], `${key} 缺少英文名`).toBeTruthy();
    }
  });

  it("英文名非空、不含中文、且与中文名不同", () => {
    for (const key of keys) {
      const en = CATEGORY_LABEL_EN[key];
      expect(en.length, `${key} 英文名为空`).toBeGreaterThan(0);
      expect(/[一-龥]/.test(en), `${key} 英文名混入中文：${en}`).toBe(false);
      expect(en, `${key} 英文名与中文名相同`).not.toBe(CATEGORY_STYLE[key].displayLabel);
    }
  });

  it("不认识的分类回退为原值（不抛错、不返回 undefined）", () => {
    expect(categoryLabelEn("不存在的分类")).toBe("不存在的分类");
    expect(categoryLabelEn("")).toBe("");
  });

  it("英文 key 也能解析（走 getCategoryStyle 的 legacyMap）", () => {
    expect(categoryLabelEn("signal_exec")).toBe("AI Tool Update");
    expect(categoryLabelEn("signal_support")).toBe("Creative Opportunity");
  });

  it("原型属性名不会穿透查表（返回字符串而非 Object.prototype 上的函数）", () => {
    for (const key of ["constructor", "toString", "valueOf", "__proto__", "hasOwnProperty"]) {
      const out = categoryLabelEn(key);
      expect(typeof out, `${key} 应回退为字符串`).toBe("string");
      expect(out, `${key} 应回退为原值`).toBe(key);
    }
  });
});
