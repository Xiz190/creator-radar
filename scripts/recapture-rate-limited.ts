// 定向重抓「正文其实是限流页」的条目。
// 用法：npx tsx --env-file=.env.local scripts/recapture-rate-limited.ts
//
// 背景（2026-09-18 实测）：39 条条目的 content_json 实际是
//   ["You have been rate-limited for making too many requests in a short time frame.", …]
// ——抓取时被限流，拦截页被当成了正文。后果不止正文难看：lens 生成器读到这坨垃圾，
// 写出"我读不到正文，去点原文"这种毫无价值的点评（中文版 26 条中招）。
//
// 为什么要单写一个脚本而不是用 recapture-details.ts：后者重抓**全库 714 条**，
// 那正是当初触发限流的原因。这里只重抓中招的、且每条之间留间隔。
//
// 重抓后会**清空这两条的中英文 lens**，让它们能按新正文重新生成——
// 原来那两句是在垃圾正文上写出来的，留着没意义。
import { getPgPool } from "@/lib/db";
import { captureDetailPage } from "@/lib/monitor/detail";
import { upsertItemDetail } from "@/lib/monitor/db";

const RATE_LIMIT_RE =
  "rate.?limit|too many requests in a short time|website owner\\? if you think|if you think you have reached this message in error|checking your browser before accessing";

/** 每条之间的间隔。目标站点刚限过我们，别连着猛敲。 */
const DELAY_MS = 2500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const pool = getPgPool();
  const { rows } = await pool.query<{ source_id: string; url: string; title: string }>(
    `select source_id, url, title
       from monitor_items
      where content_json::text ~* $1
      order by list_published_at desc`,
    [RATE_LIMIT_RE],
  );
  console.log(`找到 ${rows.length} 条正文是限流页的条目，开始定向重抓（每条间隔 ${DELAY_MS}ms）...\n`);

  let recovered = 0;
  let stillBlocked = 0;
  let failed = 0;

  for (const r of rows) {
    try {
      const d = await captureDetailPage(r.url);
      await upsertItemDetail(r.source_id, r.url, {
        pageTitle: d.pageTitle,
        paragraphs: d.paragraphs,
        attachments: d.attachments.map((a) => ({ url: a.url, text: a.text, kind: a.kind })),
        externalLinks: (d.externalLinks ?? []).map((l) => ({ text: l.text, url: l.url })),
        contentQuality: d.contentQuality,
      });

      // 原 lens 是在垃圾正文上生成的，清掉以便按新正文重生成
      await pool.query(
        `update monitor_items set creator_lens = null, creator_lens_en = null
          where source_id = $1 and url = $2`,
        [r.source_id, r.url],
      );

      const good = (d.contentQuality ?? "") !== "empty" && (d.paragraphs?.length ?? 0) > 0;
      if (good) {
        recovered++;
        console.log(`  ✓ [${d.contentQuality}] ${r.title.slice(0, 34)} → ${d.paragraphs.length} 段`);
      } else {
        stillBlocked++;
        console.log(`  ○ [${d.contentQuality}] ${r.title.slice(0, 34)} — 仍是空/拦截，lens 已清空待重生成`);
      }
    } catch (e) {
      failed++;
      console.log(`  ✗ ${r.title.slice(0, 34)} — ${(e as Error).message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n完成：取回正文 ${recovered} 条 / 仍拿不到 ${stillBlocked} 条 / 失败 ${failed} 条。`);
  console.log("这些条目的中英文 lens 已清空，接着跑 gen-lens.ts all 与 gen-lens-en.ts all 补回。");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
