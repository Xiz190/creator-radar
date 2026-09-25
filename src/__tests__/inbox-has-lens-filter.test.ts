import { describe, it, expect, vi, beforeEach } from "vitest";
import { getInboxItemsByFilter } from "@/lib/monitor/db/inbox";

// ============================================================================
// getInboxItemsByFilter 的 hasLens 筛选 —— 数据层单测
//
// 验证点：
//   1. hasLens=true 时，生成的 SQL 应包含 creator_lens 非空过滤
//   2. 不传 hasLens 时，SQL 不应包含该过滤（严格增量、无行为变化）
// ============================================================================

type QueryCall = { sql: string; values: unknown[] };
let queryCalls: QueryCall[] = [];

vi.mock("@/lib/db", () => ({
  getPgPool: () => ({
    query: vi.fn(async (sql: string, values?: unknown[]) => {
      queryCalls.push({ sql, values: values ?? [] });
      return { rows: [], rowCount: 0 };
    }),
  }),
}));

vi.mock("@/lib/monitor/utils/cache", () => ({
  getCachedCount: () => null,
  setCachedCount: () => {},
}));

describe("getInboxItemsByFilter - hasLens 筛选", () => {
  beforeEach(() => {
    queryCalls = [];
  });

  it("hasLens=true 时，SQL 应包含 creator_lens 非空过滤", async () => {
    await getInboxItemsByFilter({ hasLens: true, limit: 5 });
    const combined = queryCalls.map((c) => c.sql).join("\n");
    expect(combined).toContain(`length(trim(coalesce(mi.creator_lens, ''))) > 0`);
  });

  it("不传 hasLens 时，SQL 不应包含 creator_lens 过滤", async () => {
    await getInboxItemsByFilter({ limit: 5 });
    const combined = queryCalls.map((c) => c.sql).join("\n");
    expect(combined).not.toContain(`length(trim(coalesce(mi.creator_lens, ''))) > 0`);
  });
});
