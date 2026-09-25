// 批量为动态生成"创作者视角一句话"并存库。
// 用法：npx tsx --env-file=.env.local scripts/gen-lens.ts [数量]
import { getPgPool } from "@/lib/db";
import { generateCreatorLens } from "@/lib/monitor/creator-lens";

async function main() {
  // 用法：gen-lens.ts [N|all]  —— 默认只补「缺视角」的最近 20 条；传 all 补全部缺的。
  const arg = (process.argv[2] || "20").toLowerCase();
  const fillAll = arg === "all";
  const limit = fillAll ? 100000 : Number(arg) || 20;
  const pool = getPgPool();

  // 先报告：一共还差多少条没有创作者视角
  const { rows: cnt } = await pool.query<{ missing: string; total: string }>(
    `select
       count(*) filter (where coalesce(creator_lens,'') = '') as missing,
       count(*) as total
     from monitor_items
     where list_published_at >= '2026-01-01'`,
  );
  console.log(`当前 2026 后条目：共 ${cnt[0]?.total} 条，其中缺创作者视角 ${cnt[0]?.missing} 条。`);

  // 只取「还没有视角」的条目补齐（不会覆盖已生成/已人工校准的），近的优先
  const { rows } = await pool.query<{ source_id: string; url: string; title: string; body: string }>(
    `select source_id, url, title, coalesce(content_json::text,'') as body
     from monitor_items
     where list_published_at >= '2026-01-01'
       and coalesce(creator_lens,'') = ''
     order by list_published_at desc limit $1`,
    [limit],
  );
  console.log(`本次补齐 ${rows.length} 条${fillAll ? "（全部缺的）" : ""}...\n`);

  for (const r of rows) {
    try {
      const { lens, valueLevel } = await generateCreatorLens(r.title, r.body);
      const importance = valueLevel === "高" ? "重点内容" : valueLevel === "中" ? "中等重点" : "普通内容";
      await pool.query(
        `update monitor_items set creator_lens = $3, importance_level = $4 where source_id = $1 and url = $2`,
        [r.source_id, r.url, lens, importance],
      );
      console.log(`  ✓ [${valueLevel}] ${r.title.slice(0, 28)}\n     ${lens}`);
    } catch (e) {
      console.log(`  ✗ ${r.title.slice(0, 30)} — ${(e as Error).message}`);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
