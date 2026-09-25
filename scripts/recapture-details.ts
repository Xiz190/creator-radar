// 一次性脚本：用最新的正文提取逻辑重抓库里所有条目的详情。
// 用法：npx tsx --env-file=.env.local scripts/recapture-details.ts
import { getPgPool } from "@/lib/db";
import { captureDetailPage } from "@/lib/monitor/detail";
import { upsertItemDetail } from "@/lib/monitor/db";

async function main() {
  const pool = getPgPool();
  const { rows } = await pool.query<{ source_id: string; url: string }>(
    "select source_id, url from monitor_items order by source_id, list_published_at desc",
  );
  console.log(`共 ${rows.length} 条待重抓...`);

  let ok = 0, empty = 0, fail = 0;
  for (const { source_id, url } of rows) {
    try {
      const d = await captureDetailPage(url);
      await upsertItemDetail(source_id, url, {
        pageTitle: d.pageTitle,
        paragraphs: d.paragraphs,
        attachments: d.attachments.map((a) => ({ url: a.url, text: a.text, kind: a.kind })),
        externalLinks: (d.externalLinks ?? []).map((l) => ({ text: l.text, url: l.url })),
        contentQuality: d.contentQuality,
        captureNote: d.captureNote,
        capturedAtIso: new Date().toISOString(),
      });
      if (d.contentQuality === "empty") empty++;
      else ok++;
    } catch {
      fail++;
    }
  }
  console.log(`完成：正文 ${ok} / 空 ${empty} / 失败 ${fail}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
