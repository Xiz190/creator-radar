// 给来源补英文显示名（display_name_en）。
// 用法：npx tsx --env-file=.env.local scripts/fill-source-display-en.ts
//
// 为什么需要：display_name 是**我们自己编的中文标签**（写在 init-data.sql 里），
// 不是抓来的内容——所以"界面英文、数据保留原文"那条不适用于它，
// 它就该跟 lens 一样是中英双语。
//
// 为什么不用 department_name + channel_name 拼：技术源那栏写的是 "RSS"，
// 拼出来是 "Suno · RSS" 这种，比标签本身还难看。
//
// 表是幂等的：只写还没填过的（不覆盖手工调整过的）。
import { getPgPool } from "@/lib/db";

/** sourceId → 英文显示名。中文来源保留其官方英文名，不做意译。 */
const EN: Record<string, string> = {
  cdm_feed: "CDM · Create Digital Music",
  cnaf_home: "China National Arts Fund",
  elevenlabs_blog: "ElevenLabs · Blog",
  krea_blog: "Krea · Blog",
  luma_news: "Luma · News",
  mubert_blog: "Mubert · Blog",
  musicaly_feed: "Music Ally",
  petapixel_feed: "PetaPixel",
  pika_blog: "Pika · Blog",
  qbitai_feed: "QbitAI",
  runway_news: "Runway · News",
  splice_blog: "Splice · Blog",
  stability_news: "Stability AI · News",
  suno_blog: "Suno · Blog",
  synthtopia_feed: "Synthtopia",
  // 以下两个已禁用（CAPA 判死），但仍补上——将来重新启用时不会漏。
  // CAPA = China Association of Performing Arts（中国演出行业协会）
  capa_tzgg: "CAPA · Notices",
  capa_rcyf: "CAPA · Music Talent Fund",
};

async function main() {
  const pool = getPgPool();
  const { rows } = await pool.query<{ id: string; display_name: string | null }>(
    `select id, display_name from monitor_sources order by id`,
  );

  let filled = 0;
  let skipped = 0;
  const unknown: string[] = [];

  for (const r of rows) {
    const en = EN[r.id];
    if (!en) {
      if (r.display_name && /[一-龥]/.test(r.display_name)) unknown.push(r.id);
      continue;
    }
    // 只补空的，不覆盖已有值
    const res = await pool.query(
      `update monitor_sources set display_name_en = $2
        where id = $1 and coalesce(display_name_en,'') = ''`,
      [r.id, en],
    );
    if (res.rowCount && res.rowCount > 0) {
      filled++;
      console.log(`  ✓ ${r.id} → ${en}`);
    } else {
      skipped++;
    }
  }

  console.log(`\n补齐 ${filled} 条，跳过（已有值）${skipped} 条，来源总数 ${rows.length}。`);
  if (unknown.length > 0) {
    console.log(`\n⚠️ 以下来源名含中文但脚本里没有对应英文，英文界面下会回退显示中文：`);
    for (const id of unknown) console.log(`   ${id}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
