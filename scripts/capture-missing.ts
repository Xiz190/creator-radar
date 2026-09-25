// 补抓「还没抓详情」的条目（content_quality 为 null），把正文补全。
// 只补 page_title / content_json / content_quality，不动 creator_lens / importance。
// 用法：npx tsx --env-file=.env.local scripts/capture-missing.ts
import { captureDetailPage } from "../src/lib/monitor/detail.ts";
import { getPgPool } from "../src/lib/db.ts";

async function main() {
  const pool = getPgPool();
  const { rows } = await pool.query<{ source_id: string; url: string }>(
    `select source_id, url from monitor_items where content_quality is null order by first_seen_at desc`,
  );
  console.log(`补抓 ${rows.length} 条未抓详情...`);
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      const d = await captureDetailPage(r.url);
      await pool.query(
        `update monitor_items set page_title = $1, content_json = $2, content_quality = $3, captured_at = now()
         where source_id = $4 and url = $5`,
        [d.pageTitle, JSON.stringify(d.paragraphs), d.contentQuality, r.source_id, r.url],
      );
      ok++;
      if (ok % 20 === 0) console.log(`  ...已补 ${ok}`);
    } catch {
      fail++;
    }
  }
  console.log(`完成：成功 ${ok}，失败 ${fail}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
