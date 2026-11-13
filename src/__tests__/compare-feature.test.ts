import { describe, it, expect } from "vitest";
import { parseItemsParam, MAX_COMPARE_ITEMS } from "@/app/api/monitor/compare/route";
import { generateRuleBasedComparison, parseAiComparison } from "@/lib/monitor/creator-compare";

// ============================================================================
// 创作者版对比：参数解析、规则对比、AI 结果清洗
// ============================================================================

describe("对比功能 - parseItemsParam（URL 参数解析）", () => {
  it("正常解析 2 条", () => {
    const input = "source1::https://example.com/1|source2::https://example.com/2";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ sourceId: "source1", url: "https://example.com/1" });
    expect(result[1]).toEqual({ sourceId: "source2", url: "https://example.com/2" });
  });

  it("正常解析 3 条", () => {
    const input = "s1::http://a.com|s2::http://b.com|s3::http://c.com";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(3);
  });

  it("空字符串返回空数组", () => {
    expect(parseItemsParam("")).toEqual([]);
  });

  it("跳过无效格式（没有 :: 的条目）", () => {
    const input = "source1::https://a.com|invalid|source2::https://b.com";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(2);
    expect(result[0].sourceId).toBe("source1");
    expect(result[1].sourceId).toBe("source2");
  });

  it("跳过 sourceId 为空的条目", () => {
    const input = "::https://a.com|source1::https://b.com";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("source1");
  });

  it("跳过 url 为空的条目", () => {
    const input = "source1::|source2::https://b.com";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("source2");
  });

  it(`超过 ${MAX_COMPARE_ITEMS} 条时截断到 ${MAX_COMPARE_ITEMS} 条`, () => {
    const items = Array.from({ length: 10 }, (_, i) => `s${i}::https://example.com/${i}`);
    const input = items.join("|");
    const result = parseItemsParam(input);
    expect(result).toHaveLength(MAX_COMPARE_ITEMS);
  });

  it("正确解析包含特殊字符的 URL", () => {
    const input = "source1::https://example.com/path?a=1&b=2#hash";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/path?a=1&b=2#hash");
  });

  it("处理开头和结尾的分隔符", () => {
    const input = "|s1::http://a.com|s2::http://b.com|";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(2);
  });

  it("正确解析包含 :: 的 URL（只分割第一个 ::）", () => {
    const input = "source1::https://example.com/foo::bar";
    const result = parseItemsParam(input);
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("source1");
    expect(result[0].url).toBe("https://example.com/foo::bar");
  });
});

describe("对比功能 - generateRuleBasedComparison（创作者规则版）", () => {
  const items = [
    { title: "Suno launches v5 with new credits pricing", department: "Suno", publishedAt: "2026-11-01", keywords: ["Suno", "v5"] },
    { title: "AI 音乐大赛开始征集作品", summary: "报名截止 12 月 1 日", department: "量子位", publishedAt: "2026-11-08", keywords: ["大赛", "Suno"] },
    { title: "Streaming revenue report 2026", department: "Music Ally", publishedAt: "2026-11-10", keywords: ["report"] },
  ];

  it("结构完整，每条都有行动建议", () => {
    const r = generateRuleBasedComparison(items, "zh");
    expect(r.overallSummary.length).toBeGreaterThan(0);
    expect(r.similarities.length).toBeGreaterThan(0);
    expect(r.differences.length).toBeGreaterThan(0);
    expect(r.perItem.map((p) => p.index)).toEqual([0, 1, 2]);
    expect(r.keyFindings.length).toBeGreaterThan(0);
  });

  it("机会/截止 → act；新功能 → act；什么都没有 → skip", () => {
    const r = generateRuleBasedComparison(items, "zh");
    expect(r.perItem[0].action).toBe("act");
    expect(r.perItem[1].action).toBe("act");
    expect(r.perItem[2].action).toBe("skip");
  });

  it("只涉及版权 → watch", () => {
    const r = generateRuleBasedComparison(
      [{ title: "Reservoir hits Suno with copyright lawsuit" }, { title: "Label signs licensing deal" }],
      "en",
    );
    expect(r.perItem.every((p) => p.action === "watch")).toBe(true);
    expect(r.similarities.some((s) => s.toLowerCase().includes("copyright"))).toBe(true);
  });

  it("共同关键词进共同点，部分信号进差异点", () => {
    const r = generateRuleBasedComparison(items.slice(0, 2), "zh");
    expect(r.similarities.some((s) => s.includes("suno"))).toBe(true);
    expect(r.differences.some((s) => s.includes("只有"))).toBe(true);
  });

  it("来源不同、日期相差几天都写进差异点", () => {
    const r = generateRuleBasedComparison(items, "en");
    expect(r.differences.some((s) => s.startsWith("From 3 different sources"))).toBe(true);
    expect(r.differences.some((s) => s.includes("9 days apart"))).toBe(true);
  });

  it("英文模式输出英文、不夹中文说明", () => {
    const r = generateRuleBasedComparison(items, "en");
    expect(r.overallSummary).toMatch(/^Of 3 items/);
    expect(r.keyFindings).not.toMatch(/[\u4e00-\u9fff]/);
    expect(r.perItem.every((p) => !/[\u4e00-\u9fff]/.test(p.reason))).toBe(true);
  });

  it("没有任何共同点时给出明确说法", () => {
    const r = generateRuleBasedComparison([{ title: "A" }, { title: "B" }], "zh");
    expect(r.similarities[0]).toContain("没有共同");
  });

  it("共同点和差异点最多 6 条", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ title: `Item ${i} launches pricing contest deadline copyright`, department: `S${i}`, publishedAt: `2026-11-0${i + 1}` }));
    const r = generateRuleBasedComparison(many, "en");
    expect(r.similarities.length).toBeLessThanOrEqual(6);
    expect(r.differences.length).toBeLessThanOrEqual(6);
  });
});

describe("对比功能 - parseAiComparison（清洗 AI 返回）", () => {
  it("正常 JSON 被接受，越界 index 和非法 action 被丢掉", () => {
    const text = 'ok {"overallSummary":"x","similarities":["a"],"differences":["b"],"perItem":[{"index":0,"action":"act","reason":"r"},{"index":5,"action":"act"},{"index":1,"action":"maybe"}],"keyFindings":"k"}';
    const r = parseAiComparison(text, 2);
    expect(r?.perItem).toEqual([{ index: 0, action: "act", reason: "r" }]);
  });

  it("不是 JSON 或缺 overallSummary 时返回 null", () => {
    expect(parseAiComparison("no json here", 2)).toBeNull();
    expect(parseAiComparison('{"similarities":[]}', 2)).toBeNull();
  });
});
