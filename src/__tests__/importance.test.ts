import { describe, it, expect } from "vitest";
import { combineImportance } from "@/lib/monitor/importance";

// ============================================================================
// 价值档位规则（方案 B，2026-10-16）
//
// 背景：关键词打分和 LLM 判断曾经写同一个字段、谁最后写算谁——
// LLM 映射里没有「核心」，于是 Suno v6（关键词分 105）被压到「中等」；
// 之后再重扫关键词又会把 LLM 的判断冲掉。现在两半各存一列，最终档位按这张表算。
// ============================================================================

describe("combineImportance", () => {
  it("关键词判核心：LLM 高→核心，中→重点（重大发布不被埋），低→普通（无关新闻照样降）", () => {
    expect(combineImportance("核心关注", "高")).toBe("核心关注");
    expect(combineImportance("核心关注", "中")).toBe("重点内容");
    expect(combineImportance("核心关注", "低")).toBe("普通内容");
  });

  it("其他关键词档位：以 LLM 为准", () => {
    for (const kw of ["重点内容", "中等重点", "普通内容", null]) {
      expect(combineImportance(kw, "高")).toBe("重点内容");
      expect(combineImportance(kw, "中")).toBe("中等重点");
      expect(combineImportance(kw, "低")).toBe("普通内容");
    }
  });

  it("还没有 LLM 判断：用关键词档位；都没有就是普通", () => {
    expect(combineImportance("核心关注", null)).toBe("核心关注");
    expect(combineImportance("中等重点", undefined)).toBe("中等重点");
    expect(combineImportance(null, null)).toBe("普通内容");
    expect(combineImportance("加急推荐", null)).toBe("普通内容");
  });
});
