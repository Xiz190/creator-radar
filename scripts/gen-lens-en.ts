// 批量生成「创作者视角」的**英文版**并写入 creator_lens_en。
// 用法：npx tsx --env-file=.env.local scripts/gen-lens-en.ts [数量|all]
//
// 与 gen-lens.ts（中文版）的关系：两份各写各的母语，**都从原始标题+正文直接生成**，
// 不是互为翻译。所以千万别拿中文 lens 去喂它当输入——那样只会得到翻译腔。
//
// ⚠️ 本脚本**不写 importance_level**。那个字段由中文版生成时一并判定，
// 两个脚本都写会造成同一字段被两个来源来回覆盖。
import { getPgPool } from "@/lib/db";
import { generateCreatorLensEn } from "@/lib/monitor/creator-lens";

async function main() {
  const arg = (process.argv[2] || "20").toLowerCase();
  const fillAll = arg === "all";
  const limit = fillAll ? 100000 : Number(arg) || 20;
  const pool = getPgPool();

  const { rows: cnt } = await pool.query<{ missing: string; total: string }>(
    `select
       count(*) filter (where coalesce(creator_lens_en,'') = '') as missing,
       count(*) as total
     from monitor_items
     where list_published_at >= '2026-01-01'`,
  );
  console.log(
    `当前 2026 后条目：共 ${cnt[0]?.total} 条，其中缺英文创作者视角 ${cnt[0]?.missing} 条。`,
  );

  // 只取「还没有英文版」的，不覆盖已生成的
  const { rows } = await pool.query<{ source_id: string; url: string; title: string; body: string }>(
    `select source_id, url, title, coalesce(content_json::text,'') as body
     from monitor_items
     where list_published_at >= '2026-01-01'
       and coalesce(creator_lens_en,'') = ''
     order by list_published_at desc limit $1`,
    [limit],
  );
  console.log(`本次生成 ${rows.length} 条${fillAll ? "（全部缺的）" : ""}...\n`);

  let ok = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const { lens } = await generateCreatorLensEn(r.title, r.body);
      await pool.query(
        `update monitor_items set creator_lens_en = $3 where source_id = $1 and url = $2`,
        [r.source_id, r.url, lens],
      );
      ok++;
      console.log(`  ✓ ${r.title.slice(0, 34)}\n     ${lens}\n`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${r.title.slice(0, 34)} — ${(e as Error).message}`);
    }
  }
  console.log(`\n完成：成功 ${ok} 条，失败 ${failed} 条。`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
