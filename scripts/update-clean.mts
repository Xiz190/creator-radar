import { readFileSync } from "node:fs";
const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
import { captureDetailPage } from "../src/lib/monitor/detail.ts";
import { getPgPool } from "../src/lib/db.ts";

const pool = getPgPool();
// 更新所有 splice_blog 条目的干净正文
const res = await pool.query(`select source_id, url from monitor_items where source_id='splice_blog'`);
console.log("splice 条目:", res.rows.length);
let updated = 0;
for (const { source_id, url } of res.rows) {
  try {
    const detail = await captureDetailPage(url);
    if (detail.paragraphs.length > 0) {
      await pool.query(
        `update monitor_items set page_title=$1, content_json=$2, content_quality=$3, captured_at=now() where source_id=$4 and url=$5`,
        [detail.pageTitle, JSON.stringify(detail.paragraphs), detail.contentQuality, source_id, url]
      );
      updated++;
      console.log(`  ✅ ${url.slice(0,50)} → ${detail.paragraphs.length} 段`);
    }
  } catch (e) { console.log(`  ⚠️ ${url.slice(0,50)}: ${(e as Error).message.slice(0,40)}`); }
}
console.log(`更新 ${updated} 条`);
