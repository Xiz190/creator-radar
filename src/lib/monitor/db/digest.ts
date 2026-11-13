// 日报取数：近 N 小时首次抓到的条目，按重要度、关键词得分排序，带中英创作者视角。
// 只取"普通内容"以上或已有创作者视角的条目，免得把噪声也塞进邮件。
import { getPgPool } from "@/lib/db";
import { getCategoryGroup } from "../content-meta";
import type { DigestEntry, DigestLang } from "../digest-email";
import { sourceNameFor } from "@/lib/source-names";

type Row = {
  source_id: string;
  department_name: string | null;
  title: string;
  url: string;
  list_published_at: string | null;
  matched_categories: unknown;
  creator_lens: string | null;
  creator_lens_en: string | null;
};

function topSignalCategory(raw: unknown): string | null {
  const arr = Array.isArray(raw) ? (raw as Array<{ category?: string; score?: number }>) : [];
  const signal = arr
    .filter((c) => typeof c?.category === "string" && getCategoryGroup(c.category) === "signal")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return signal[0]?.category ?? null;
}

export async function getDigestItems(opts: { lang: DigestLang; limit?: number; sinceHours?: number }): Promise<DigestEntry[]> {
  const { lang, limit = 12, sinceHours = 24 } = opts;
  const pool = getPgPool();
  const res = await pool.query<Row>(
    `select mi.source_id,
            ms.department_name,
            mi.title,
            mi.url,
            mi.list_published_at::text as list_published_at,
            mi.matched_categories,
            mi.creator_lens,
            mi.creator_lens_en
       from monitor_items mi
       join monitor_sources ms on ms.id = mi.source_id
      where mi.first_seen_at >= now() - make_interval(hours => $1::int)
        and (coalesce(mi.importance_level, '普通内容') <> '普通内容' or mi.creator_lens is not null)
      order by case mi.importance_level when '核心关注' then 4 when '加急推荐' then 4 when '重点内容' then 3 when '中等重点' then 2 else 1 end desc,
               coalesce(mi.keyword_score, 0) desc,
               mi.first_seen_at desc
      limit $2`,
    [sinceHours, limit],
  );
  return res.rows.map((r) => ({
    title: r.title,
    url: r.url,
    sourceId: r.source_id,
    source: sourceNameFor(r.department_name ?? r.source_id, lang),
    publishedAt: r.list_published_at,
    category: topSignalCategory(r.matched_categories),
    lens: lang === "en" ? r.creator_lens_en ?? r.creator_lens : r.creator_lens,
  }));
}
