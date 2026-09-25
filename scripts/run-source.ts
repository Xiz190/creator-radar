// 一次性脚本：手动跑指定来源的抓取。用法：
//   npx tsx --env-file=.env.local scripts/run-source.ts suno_blog
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
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
