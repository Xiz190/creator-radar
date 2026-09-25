// 用新的音乐体裁关键词重扫 matched_genres（把政务公文体裁换成音乐内容形式）。
// 用法：npx tsx --env-file=.env.local scripts/rescan-genres.ts
import { getPgPool } from "../src/lib/db.ts";
import { rescanAllGenres } from "../src/lib/monitor/db/scanner.ts";

async function main() {
  const r = await rescanAllGenres(300);
  console.log("体裁重扫完成：", JSON.stringify(r));
  const pool = getPgPool();
  const dist = await pool.query<{ genre: string; c: string }>(
    `select g as genre, count(*)::text as c
     from monitor_items, jsonb_array_elements_text(coalesce(matched_genres,'[]'::jsonb)) as g
     group by g order by count(*) desc`,
  );
  console.log("体裁分布：");
  for (const row of dist.rows) console.log(`  ${row.genre}: ${row.c}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
