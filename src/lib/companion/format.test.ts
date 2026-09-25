import { describe, expect, it } from "vitest";
import {
  formatCompanionDate,
  localDayKey,
  readingMinutes,
  shortAgo,
  shortDate,
  sourceAbbr,
  viewedLabel,
  weekdayOf,
} from "@/lib/companion/format";

describe("伴侣版 · 日期格式", () => {
  it("输出 mockup 的形状：星期全称 · 月缩写 日，且不含年份", () => {
    const out = formatCompanionDate(new Date(2000, 0, 1));
    expect(out).toMatch(/^[A-Z][a-z]+ · [A-Z][a-z]{2} \d{1,2}$/);
    expect(/\d{4}/.test(out), `不应含年份，实际：${out}`).toBe(false);
  });

  it("星期与月日的取值正确", () => {
    // 2000-01-01 是星期六（公认事实，用它锁住 WEEKDAYS 数组的顺序）
    expect(formatCompanionDate(new Date(2000, 0, 1))).toBe("Saturday · Jan 1");
    // 同一年里跨月的一例
    expect(formatCompanionDate(new Date(2000, 11, 25))).toMatch(/^[A-Z][a-z]+ · Dec 25$/);
  });

  it("日不补零（mockup 是 Sep 7 不是 Sep 07）", () => {
    expect(formatCompanionDate(new Date(2000, 8, 7))).toContain("· Sep 7");
    expect(formatCompanionDate(new Date(2000, 8, 7))).not.toContain("Sep 07");
  });
});

describe("伴侣版 · 来源缩写", () => {
  it("单个词的来源取前两位大写", () => {
    expect(sourceAbbr("CDM")).toBe("CD");
    expect(sourceAbbr("SXSW")).toBe("SX");
    expect(sourceAbbr("Synthtopia")).toBe("SY");
  });

  it("多个词的来源取各词首字母", () => {
    expect(sourceAbbr("Boiler Room")).toBe("BR");
    expect(sourceAbbr("The Verge")).toBe("TV");
  });

  it("空/空白/undefined 回退为 ??（而不是空串或崩溃）", () => {
    expect(sourceAbbr("")).toBe("??");
    expect(sourceAbbr("   ")).toBe("??");
    expect(sourceAbbr(undefined)).toBe("??");
  });

  it("结果不超过 2 个字符且为大写（单字母来源退化为 1 个字符是允许的）", () => {
    for (const name of ["A", "AB", "A B", "非常长的来源名称", "  x  y  "]) {
      const out = sourceAbbr(name);
      expect(out.length, `${name} 的结果超过 2 字符：${out}`).toBeLessThanOrEqual(2);
      expect(out, `${name} 的结果不是大写：${out}`).toBe(out.toUpperCase());
      expect(out.length, `${name} 的结果为空`).toBeGreaterThan(0);
    }
  });
});

describe("伴侣版 · 相对时间", () => {
  // 用本地时间构造，并把 now 注入，避免测试依赖真实当前时间或时区
  const now = new Date(2026, 8, 18, 12, 0, 0).getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("一小时以内显示 just now", () => {
    expect(viewedLabel(new Date(now - 30_000).toISOString(), now)).toBe("just now");
    expect(viewedLabel(new Date(now - 59_000).toISOString(), now)).toBe("just now");
  });

  it("分钟 / 小时 / 天 三档递进", () => {
    expect(viewedLabel(ago(5 * 60_000), now)).toBe("5m ago");
    expect(viewedLabel(ago(59 * 60_000), now)).toBe("59m ago");
    expect(viewedLabel(ago(3 * 3_600_000), now)).toBe("3h ago");
    expect(viewedLabel(ago(23 * 3_600_000), now)).toBe("23h ago");
    expect(viewedLabel(ago(2 * 86_400_000), now)).toBe("2d ago");
    expect(viewedLabel(ago(6 * 86_400_000), now)).toBe("6d ago");
  });

  it("超过一周退回绝对日期", () => {
    // 2026-09-18 往前 10 天 = 2026-09-08
    expect(viewedLabel(ago(10 * 86_400_000), now)).toBe("Sep 8");
  });

  it("缺失或无效的输入回退为 just now，不抛错也不显示 NaN", () => {
    expect(viewedLabel(undefined, now)).toBe("just now");
    expect(viewedLabel("", now)).toBe("just now");
    expect(viewedLabel("not-a-date", now)).toBe("just now");
    expect(viewedLabel("not-a-date", now)).not.toContain("NaN");
  });

  it("未来时间归到 just now（时钟偏差不应显示负数）", () => {
    expect(viewedLabel(new Date(now + 3_600_000).toISOString(), now)).toBe("just now");
  });
});

describe("伴侣版 · 日键与短日期", () => {
  it("localDayKey 用本地时区并补零", () => {
    expect(localDayKey(new Date(2026, 8, 7))).toBe("2026-09-07");
    expect(localDayKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("shortDate 把日键转成短日期", () => {
    expect(shortDate("2026-09-17")).toBe("Sep 17");
    expect(shortDate("2026-01-01")).toBe("Jan 1");
  });

  it("weekdayOf 给出全星期名", () => {
    // 2000-01-01 是星期六
    expect(weekdayOf("2000-01-01")).toBe("Saturday");
  });

  it("非日期输入原样返回，不抛错", () => {
    expect(shortDate("")).toBe("");
    expect(shortDate("not-a-date")).toBe("not-a-date");
    expect(weekdayOf("nope")).toBe("nope");
  });
});

describe("伴侣版 · Feed 行尾时间", () => {
  const now = new Date(2026, 8, 18, 23, 30, 0);

  it("当天显示 today", () => {
    expect(shortAgo("2026-09-18", now)).toBe("today");
  });

  it("按天数差显示 Nd", () => {
    expect(shortAgo("2026-09-17", now)).toBe("1d");
    expect(shortAgo("2026-09-13", now)).toBe("5d");
  });

  it("同一天不因时刻而漂移（清晨也应是 today）", () => {
    expect(shortAgo("2026-09-18", new Date(2026, 8, 18, 0, 5, 0))).toBe("today");
  });

  it("无效输入返回空串", () => {
    expect(shortAgo("", now)).toBe("");
    expect(shortAgo("nope", now)).toBe("");
  });
});

describe("伴侣版 · 阅读时长估算", () => {
  it("空正文也算 1 分钟——不出现 0 min read", () => {
    expect(readingMinutes([])).toBe(1);
    expect(readingMinutes(undefined)).toBe(1);
    expect(readingMinutes(["   "])).toBe(1);
  });

  it("短文本按 1 分钟下限", () => {
    expect(readingMinutes(["A short line about stems."])).toBe(1);
    expect(readingMinutes(["word ".repeat(100)])).toBe(1);
  });

  it("英文按 ~220 词/分 向上取整", () => {
    expect(readingMinutes(["word ".repeat(300)])).toBe(2); // 1.36 → 2
    expect(readingMinutes(["word ".repeat(500)])).toBe(3); // 2.27 → 3
  });

  it("中文按 ~350 字/分 单独计，不与英文混算", () => {
    // 400 个汉字 → 1.14 → 2 分钟
    expect(readingMinutes(["字".repeat(400)])).toBe(2);
    // 300 个汉字 → 0.86 → 1 分钟
    expect(readingMinutes(["字".repeat(300)])).toBe(1);
  });

  it("中英混排时两部分相加", () => {
    // 200 汉字(0.57) + 200 词(0.91) = 1.48 → 2
    expect(readingMinutes(["字".repeat(200) + " " + "word ".repeat(200)])).toBe(2);
  });

  it("多段拼接后计算，不是逐段各算一次", () => {
    const half = "word ".repeat(150);
    expect(readingMinutes([half, half])).toBe(2); // 300 词 → 2，而不是 1+1
  });
});
