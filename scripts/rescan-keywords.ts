// 用新灌入的关键词库重扫所有 item，打上分类标签 + 重要性分级。
// 用法：npx tsx --env-file=.env.local scripts/rescan-keywords.ts
import { getPgPool } from "../src/lib/db.ts";
import { rescanKeywordsOnItems } from "../src/lib/monitor/db/scanner.ts";

async function main() {
  const pool = getPgPool();
  const r = await rescanKeywordsOnItems(pool, 1000);
  console.log("重扫完成：");
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
