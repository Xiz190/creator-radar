import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Pool } from "pg";

// ============================================================================
// 抓取后自动补视角（backfillLensAfterRun）
//
// 背景：视角曾只靠手动跑 gen-lens 脚本，没人记得跑就断供（9/19 起 203 条全缺）。
// 现在每次抓取成功后 runner 在后台调用它。这里锁住三条行为：
//   1. 没配 LLM → 直接跳过，一条 SQL 都不发
//   2. 并发调用只跑一轮（定时器 + 手动触发撞在一起时不会重复花 API 额度）
//   3. 先补中文、再补英文，各写各的列；英文不碰 importance_level
// ============================================================================

const llm = { enabled: true };
const genZh = vi.fn(async () => ({ lens: "中文视角", valueLevel: "中" as const }));
const genEn = vi.fn(async () => ({ lens: "English lens" }));

vi.mock("@/lib/monitor/creator-lens", () => ({
  hasLlm: () => llm.enabled,
  generateCreatorLens: (...a: unknown[]) => genZh(...(a as [])),
  generateCreatorLensEn: (...a: unknown[]) => genEn(...(a as [])),
}));

import { backfillLensAfterRun } from "@/lib/monitor/backfill-lens";

const ROW = { source_id: "s1", url: "https://x/1", title: "T", body: "" };

function createMockPool() {
  const sqls: string[] = [];
  const pool = {
    query: vi.fn(async (sql: string) => {
      sqls.push(sql);
      if (sql.includes("count(*)")) return { rows: [{ missing: "1", total: "1" }] };
      if (sql.trim().startsWith("select")) return { rows: [ROW] };
      return { rows: [] };
    }),
  };
  return { pool: pool as unknown as Pool, sqls };
}

describe("backfillLensAfterRun", () => {
  beforeEach(() => {
    llm.enabled = true;
    genZh.mockClear();
    genEn.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("没配 LLM 时跳过，不查库", async () => {
    llm.enabled = false;
    const { pool, sqls } = createMockPool();
    await backfillLensAfterRun(pool);
    expect(sqls).toHaveLength(0);
  });

  it("并发调用共用同一轮", async () => {
    const { pool } = createMockPool();
    const a = backfillLensAfterRun(pool);
    const b = backfillLensAfterRun(pool);
    expect(b).toBe(a);
    await a;
    expect(genZh).toHaveBeenCalledTimes(1);
    expect(genEn).toHaveBeenCalledTimes(1);
  });

  it("先中文后英文，英文只写 creator_lens_en", async () => {
    const { pool, sqls } = createMockPool();
    await backfillLensAfterRun(pool);
    const updates = sqls.filter((s) => s.trim().startsWith("update"));
    expect(updates).toHaveLength(2);
    expect(updates[0]).toContain("creator_lens = $3, importance_level");
    expect(updates[1]).toContain("creator_lens_en = $3");
    expect(updates[1]).not.toContain("importance_level");
  });

  it("一轮结束后可以再次启动", async () => {
    const { pool } = createMockPool();
    await backfillLensAfterRun(pool);
    await backfillLensAfterRun(pool);
    expect(genZh).toHaveBeenCalledTimes(2);
  });
});
