import { readFileSync } from "node:fs";
// 手动加载 .env.local
const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
import { captureDetailPage } from "../src/lib/monitor/detail.ts";
import { getPgPool } from "../src/lib/db.ts";

const pool = getPgPool();
const res = await pool.query(`select source_id, url from monitor_items where title like '%MPC Live III%' limit 1`);
if (res.rows.length === 0) { console.log("没找到 MPC 条目"); process.exit(0); }
const { source_id, url } = res.rows[0];
console.log("重新抓取详情:", url);

const detail = await captureDetailPage(url);
console.log("新正文段落数:", detail.paragraphs.length, "| quality:", detail.contentQuality);
console.log("首段:", detail.paragraphs[0]?.slice(0, 90));
console.log("尾段:", detail.paragraphs[detail.paragraphs.length - 1]?.slice(0, 90));

await pool.query(
  `update monitor_items set page_title = $1, content_json = $2, content_quality = $3, captured_at = now()
   where source_id = $4 and url = $5`,
  [detail.pageTitle, JSON.stringify(detail.paragraphs), detail.contentQuality, source_id, url]
);
console.log("✅ 已更新数据库");
