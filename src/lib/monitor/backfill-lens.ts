// 补齐「创作者视角」：给还没有 creator_lens 的条目批量生成一句视角。
// 与抓取解耦——抓取只进货，视角单独补。脚本 scripts/gen-lens.ts 与
// 后台「一键补齐」按钮（/api/monitor/items action=backfill-lens）共用同一套逻辑口径。

import type { Pool } from "pg";
import { generateCreatorLens, hasLlm } from "./creator-lens";

export type BackfillLensResult = {
  ok: boolean;
  scanned: number; // 本次尝试生成的条数
  filled: number; // 成功写入
  failed: number; // 生成/写入失败
  remaining: number; // 补齐后仍缺视角的条数
  total: number; // 2026 后条目总数
  missingBefore: number; // 补齐前缺视角的条数
  message: string;
  error?: string;
};

const SINCE = "2026-01-01";

async function countState(pool: Pool): Promise<{ missing: number; total: number }> {
  const { rows } = await pool.query<{ missing: string; total: string }>(
    `select
       count(*) filter (where coalesce(creator_lens,'') = '') as missing,
       count(*) as total
     from monitor_items
     where list_published_at >= $1`,
    [SINCE],
  );
  return { missing: Number(rows[0]?.missing ?? 0), total: Number(rows[0]?.total ?? 0) };
}

/**
 * 补齐缺视角的条目。只填空的，不会覆盖已生成 / 已人工校准的。
 * @param limit 本次最多补多少条（防止单次请求过久）。默认 40，上限 500。
 */
export async function backfillMissingLens(pool: Pool, limit = 40): Promise<BackfillLensResult> {
  const cap = Math.max(1, Math.min(500, Number.isFinite(limit) ? limit : 40));
  const { missing: missingBefore, total } = await countState(pool);

  if (!hasLlm()) {
    return {
      ok: false, scanned: 0, filled: 0, failed: 0,
      remaining: missingBefore, total, missingBefore,
      message: "未配置 LLM_API_KEY，无法生成创作者视角。",
      error: "LLM 未配置",
    };
  }

  if (missingBefore === 0) {
    return {
      ok: true, scanned: 0, filled: 0, failed: 0,
      remaining: 0, total, missingBefore: 0,
      message: "所有条目都已有创作者视角，无需补齐。",
    };
  }

  const { rows } = await pool.query<{ source_id: string; url: string; title: string; body: string }>(
    `select source_id, url, title, coalesce(content_json::text,'') as body
     from monitor_items
     where list_published_at >= $1 and coalesce(creator_lens,'') = ''
     order by list_published_at desc
     limit $2`,
    [SINCE, cap],
  );

  let filled = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const { lens, valueLevel } = await generateCreatorLens(r.title, r.body);
      const importance = valueLevel === "高" ? "重点内容" : valueLevel === "中" ? "中等重点" : "普通内容";
      await pool.query(
        `update monitor_items set creator_lens = $3, importance_level = $4 where source_id = $1 and url = $2`,
        [r.source_id, r.url, lens, importance],
      );
      filled += 1;
    } catch {
      failed += 1;
    }
  }

  const remaining = Math.max(0, missingBefore - filled);
  const message =
    `本次补齐 ${filled} 条` +
    (failed ? `，失败 ${failed} 条` : "") +
    (remaining > 0 ? `，还剩 ${remaining} 条缺视角（可再点一次继续）。` : "，已全部补齐。");

  return { ok: true, scanned: rows.length, filled, failed, remaining, total, missingBefore, message };
}
