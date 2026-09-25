// 一次性脚本：手动跑指定来源的抓取。用法：
//   npx tsx --env-file=.env.local scripts/run-source.ts suno_blog
import { getPgPool } from "@/lib/db";
import { backfillLensAfterRun } from "@/lib/monitor/backfill-lens";
import { runMonitorOnce } from "@/lib/monitor/runner";

async function main() {
  const sourceIds = process.argv.slice(2);
  if (sourceIds.length === 0) {
    console.error("用法: tsx scripts/run-source.ts <sourceId> [sourceId...]");
    process.exit(1);
  }
  console.log("开始抓取来源:", sourceIds.join(", "));
  const run = await runMonitorOnce({ scope: { sourceIds }, bypassLockWhenScoped: true });
  console.log("状态:", run.status);
  for (const r of run.results ?? []) {
    console.log(
      `  ${r.displayName}: 扫描 ${r.scannedCount} / 可见 ${r.visibleCount} / 新增 ${r.newCount}` +
        (r.errorMessage ? `  [错误] ${r.errorMessage}` : ""),
    );
  }
  console.log("补齐创作者视角（中→英）...");
  await backfillLensAfterRun(getPgPool()); // runner 已在后台启动这一轮，这里等它跑完再退出
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
