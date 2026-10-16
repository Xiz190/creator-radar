// 一次性补数据：给「已有创作者视角、但还没存 LLM 价值判断」的条目补上 llm_value_level，
// 并按 importance.ts 的规则重算最终档位。只存价值判断，不改已有的视角文字。
// 先跑 scripts/rescan-keywords.ts 填好 keyword_level，再跑本脚本。
// 用法：npx tsx --env-file=.env.local scripts/backfill-value-level.ts [N|all]   （默认 5 条，先试）
import { getPgPool } from "@/lib/db";
import { generateCreatorLens } from "@/lib/monitor/creator-lens";
import { combineImportance } from "@/lib/monitor/importance";

async function main() {
  const arg = (process.argv[2] || "5").toLowerCase();
  const limit = arg === "all" ? 100000 : Number(arg) || 5;
  const pool = getPgPool();

  const { rows } = await pool.query<{ source_id: string; url: string; title: string; body: string; keyword_level: string | null; importance_level: string | null }>(
    `select source_id, url, title, coalesce(content_json::text,'') as body, keyword_level, importance_level
     from monitor_items
     where list_published_at >= '2026-01-01'
       and coalesce(creator_lens,'') <> ''
       and llm_value_level is null
     order by list_published_at desc limit $1`,
    [limit],
  );
  console.log(`本次处理 ${rows.length} 条\n`);

  let changed = 0;
  for (const r of rows) {
    try {
      const { valueLevel } = await generateCreatorLens(r.title, r.body);
      const importance = combineImportance(r.keyword_level, valueLevel);
      await pool.query(
        `update monitor_items set llm_value_level = $3, importance_level = $4,
           is_starred = ($4 in ('核心关注','重点内容'))
         where source_id = $1 and url = $2`,
        [r.source_id, r.url, valueLevel, importance],
      );
      if (importance !== r.importance_level) changed += 1;
      console.log(`  ✓ 关键词[${r.keyword_level ?? "-"}] × LLM[${valueLevel}] → ${importance}${importance !== r.importance_level ? `（原 ${r.importance_level}）` : ""}  ${r.title.slice(0, 40)}`);
    } catch (e) {
      console.log(`  ✗ ${r.title.slice(0, 40)} — ${(e as Error).message}`);
    }
  }
  console.log(`\n完成：${rows.length} 条，其中档位有变化 ${changed} 条。`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
