// 线上定时抓取入口（GitHub Actions: .github/workflows/crawl.yml 每 6 小时跑一次）：
// 抓全部启用的来源 → 补齐中英文创作者视角 → 退出。
// 本地也能手动跑：npx tsx --env-file=.env.local scripts/crawl.ts
import { getPgPool } from "@/lib/db";
import { backfillLensAfterRun } from "@/lib/monitor/backfill-lens";
import { runMonitorOnce } from "@/lib/monitor/runner";

async function main() {
  const started = Date.now();
  const run = await runMonitorOnce();
  console.log(`抓取状态: ${run.status}${run.errorMessage ? `（${run.errorMessage}）` : ""}`);
  let newTotal = 0;
  for (const r of run.results ?? []) {
    newTotal += r.newCount ?? 0;
    console.log(
      `  ${r.displayName}: 扫描 ${r.scannedCount} / 新增 ${r.newCount}` +
        (r.errorMessage ? `  [错误] ${r.errorMessage}` : ""),
    );
  }
  console.log(`共新增 ${newTotal} 条`);

  // runner 已在后台启动这一轮，这里等它跑完再退出（一轮最多各 40 条，积压会在下一次继续补）
  await backfillLensAfterRun(getPgPool());
  console.log(`完成，用时 ${Math.round((Date.now() - started) / 1000)} 秒`);

  // 抓取整体失败（如拿不到锁、数据库异常）时让 Actions 标红，便于发现
  process.exit(run.status === "error" ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
