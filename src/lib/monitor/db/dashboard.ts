import { getPgPool } from "@/lib/db";

export async function getDepartmentUpdateStats(daysAgo: number = 7) {
  const pool = getPgPool();
  const since = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
  const today = new Date().toISOString().split("T")[0];

  const dailyRes = await pool.query<{ department_name: string; date: string; count: string }>(
    `select s.department_name, date_trunc('day', i.first_seen_at)::date as date, count(*) as count
     from monitor_items i
     join monitor_sources s on s.id = i.source_id
     where i.first_seen_at >= $1::timestamptz and s.department_name is not null
     group by s.department_name, date_trunc('day', i.first_seen_at)::date
     order by s.department_name, date`,
    [since],
  );

  const deptSeries = new Map<string, Array<{ date: string; count: number }>>();
  const deptToday = new Map<string, number>();
  const deptTotal = new Map<string, number>();

  for (const row of dailyRes.rows) {
    const dept = row.department_name;
    const date = String(row.date);
    const count = Number(row.count);

    if (!deptSeries.has(dept)) deptSeries.set(dept, []);
    deptSeries.get(dept)!.push({ date, count });

    deptTotal.set(dept, (deptTotal.get(dept) || 0) + count);

    if (date === today) {
      deptToday.set(dept, (deptToday.get(dept) || 0) + count);
    }
  }

  const dates = Array.from({ length: daysAgo }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysAgo - 1 - i));
    return d.toISOString().split("T")[0];
  });

  const result: Array<{ departmentName: string; total: number; todayCount: number; series: Array<{ date: string; count: number }> }> = [];
  for (const [dept, series] of deptSeries) {
    const seriesMap = new Map(series.map((s) => [s.date, s.count]));
    const fullSeries = dates.map((date) => ({ date, count: seriesMap.get(date) || 0 }));
    result.push({
      departmentName: dept,
      total: deptTotal.get(dept) || 0,
      todayCount: deptToday.get(dept) || 0,
      series: fullSeries,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export async function getImportanceDistribution(days: number = 14) {
  const pool = getPgPool();
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const res = await pool.query<{ level: string; count: string }>(
    `select coalesce(i.importance_level, '普通内容') as level, count(*)::text as count
     from monitor_items i
     where i.first_seen_at >= $1::timestamptz
     group by level
     order by count(*) desc`,
    [since],
  );

  const map: Record<string, number> = {
    "核心关注": 0,
    "重点内容": 0,
    "中等重点": 0,
    "普通内容": 0,
  };
  for (const row of res.rows) {
    const lvl = String(row.level);
    let key: string;
    if (lvl === "加急推荐" || lvl === "核心关注") key = "核心关注";
    else if (lvl === "重点内容") key = "重点内容";
    else if (lvl === "中等重点") key = "中等重点";
    else key = "普通内容";
    map[key] = (map[key] ?? 0) + Number(row.count);
  }
  return [
    { level: "核心关注", label: "核心关注", count: map["核心关注"], color: "#dc2626" },
    { level: "重点内容", label: "⚠ 重点内容", count: map["重点内容"], color: "#f59e0b" },
    { level: "中等重点", label: "中等重点", count: map["中等重点"], color: "#3b82f6" },
    { level: "普通内容", label: "普通内容", count: map["普通内容"], color: "#6b7280" },
  ];
}

export async function getSignalTrend(daysAgo: number = 30) {
  const pool = getPgPool();
  const since = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
  const res = await pool.query<{
    date: string;
    total: string;
    starred: string;
    important: string;
  }>(
    `select date_trunc('day', i.first_seen_at)::date as date,
            count(*) as total,
            sum(case when i.is_starred then 1 else 0 end) as starred,
            sum(case when i.importance_level in ('重点内容', '核心关注') then 1 else 0 end) as important
     from monitor_items i
     where i.first_seen_at >= $1::timestamptz
     group by date_trunc('day', i.first_seen_at)::date
     order by date`,
    [since],
  );
  return res.rows.map((row) => ({
    date: row.date,
    total: Number(row.total),
    starred: Number(row.starred),
    important: Number(row.important),
  }));
}

export async function getTopKeywords(limit: number = 20, days: number = 14) {
  const pool = getPgPool();
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const res1 = await pool.query<{ keyword: string; category: string; cnt: string }>(
    `select k as keyword,
            c->>'category' as category,
            count(*)::text as cnt
     from monitor_items i
     cross join jsonb_array_elements(case when jsonb_typeof(i.matched_categories) = 'array' then i.matched_categories else '[]'::jsonb end) as c
     cross join jsonb_array_elements_text(coalesce(c->'topKeywords', '[]'::jsonb)) as k
     where i.first_seen_at >= $1::timestamptz
     group by k, c->>'category'
     order by cnt desc
     limit $2`,
    [since, limit * 2],
  );

  const counter = new Map<string, { keyword: string; category: string; count: number }>();
  for (const row of res1.rows) {
    const kw = String(row.keyword).trim();
    if (!kw) continue;
    const key = `${kw}::${row.category}`;
    const existing = counter.get(key);
    if (existing) existing.count += Number(row.cnt);
    else counter.set(key, { keyword: kw, category: row.category, count: Number(row.cnt) });
  }

  return Array.from(counter.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function getDashboardSummary(days: number = 14, topKeywordsLimit: number = 20) {
  const pool = getPgPool();
  const [deptStats, importanceDist, signalTrend, topKeywords] = await Promise.all([
    getDepartmentUpdateStats(days),
    getImportanceDistribution(days),
    getSignalTrend(days),
    getTopKeywords(topKeywordsLimit, days),
  ]);

  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const totalRes = await pool.query<{ total: string; unread: string; starred: string; urgent: string; highlight: string; mid: string; core: string }>(
    `select count(*)::text as total,
            count(case when not is_read then 1 end)::text as unread,
            count(case when is_starred then 1 end)::text as starred,
            count(case when importance_level = '加急推荐' then 1 end)::text as urgent,
            count(case when importance_level in ('核心关注', '加急推荐') then 1 end)::text as core,
            count(case when importance_level = '重点内容' then 1 end)::text as highlight,
            count(case when importance_level = '中等重点' then 1 end)::text as mid
     from monitor_items
     where first_seen_at >= $1::timestamptz`,
    [since],
  );
  const topRow = totalRes.rows[0];

  // 「近期最重点」头条：按 keyword_score + 新近度排，只取已生成创作者视角的条目
  // （= 最重点 + 已解读，头条直接呈现"实质"，不是计数）。
  const highlightsRes = await pool.query<{
    title: string;
    url: string;
    source_id: string;
    creator_lens: string;
    list_published_at: string;
    keyword_score: number;
    importance_level: string | null;
    source_name: string | null;
  }>(
    `select i.title, i.url, i.source_id, i.creator_lens,
            i.list_published_at::text as list_published_at,
            i.keyword_score, i.importance_level,
            s.display_name as source_name
     from monitor_items i
     join monitor_sources s on s.id = i.source_id
     where i.creator_lens is not null and length(trim(i.creator_lens)) > 0
     order by i.keyword_score desc nulls last, i.list_published_at desc
     limit 20`,
  );
  // 同源最多 2 条，避免头条被单个来源的一批发布刷屏
  const perSource = new Map<string, number>();
  const topHighlights: Array<{ title: string; url: string; sourceId: string; lens: string; source: string; date: string; score: number; level: string }> = [];
  for (const r of highlightsRes.rows) {
    const src = (r.source_name ?? "").split("·")[0];
    const used = perSource.get(src) ?? 0;
    if (used >= 2) continue;
    perSource.set(src, used + 1);
    topHighlights.push({
      title: r.title,
      url: r.url,
      sourceId: r.source_id,
      lens: r.creator_lens,
      source: src,
      date: r.list_published_at,
      score: Number(r.keyword_score),
      level: r.importance_level ?? "",
    });
    if (topHighlights.length >= 5) break;
  }

  // 热点话题（重点↔普通共现衔接）：只取工具/品牌名(weight>=5，滤掉 introducing/guide 等通用词)，
  // 统计每个话题在「重点」与「普通」内容里各出现多少 → 可视化"重点和普通有没有衔接"。
  const IMPORTANT = "('重点内容','中等重点','核心关注','加急推荐')";
  const hotTopicsRes = await pool.query<{ keyword: string; important_ct: string; normal_ct: string; total: string }>(
    `with kw_tool as (select distinct keyword from monitor_keywords where weight >= 5)
     select kw as keyword,
            count(*) filter (where importance_level in ${IMPORTANT})::text as important_ct,
            count(*) filter (where importance_level is null or importance_level not in ${IMPORTANT})::text as normal_ct,
            count(*)::text as total
     from monitor_items i
     cross join jsonb_array_elements_text(coalesce(matched_keywords, '[]'::jsonb)) kw
     where kw in (select keyword from kw_tool)
     group by kw
     having count(*) >= 2
     order by count(*) desc
     limit 8`,
  );
  const hotTopics = hotTopicsRes.rows.map((r) => ({
    keyword: r.keyword,
    important: Number(r.important_ct),
    normal: Number(r.normal_ct),
    total: Number(r.total),
  }));

  // 热力图专用：独立 170 天窗口（约 24 周），跨全库按日聚合入库量。
  // 不依赖 getDepartmentUpdateStats 的短窗口（否则 15 周日历永远填不满）。
  const HEAT_WINDOW_DAYS = 170;
  const heatSince = new Date(Date.now() - HEAT_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const heatRes = await pool.query<{ date: string; count: string }>(
    `select to_char(date_trunc('day', first_seen_at), 'YYYY-MM-DD') as date, count(*)::text as count
     from monitor_items
     where first_seen_at >= $1::timestamptz
     group by date_trunc('day', first_seen_at)
     order by date_trunc('day', first_seen_at)`,
    [heatSince],
  );
  const heatmapDaily = heatRes.rows.map((r) => ({ date: r.date, count: Number(r.count) }));

  const dates = signalTrend.map((s) => s.date);
  const signalTrendFormatted = {
    dates,
    series: [
      { key: "total", label: "总数", color: "#6b7280", values: signalTrend.map((s) => s.total) },
      { key: "starred", label: "标星", color: "#f59e0b", values: signalTrend.map((s) => s.starred) },
      { key: "important", label: "重点", color: "#dc2626", values: signalTrend.map((s) => s.important) },
    ],
  };

  return {
    periodDays: days,
    counts: {
      total: Number(topRow?.total ?? 0),
      unread: Number(topRow?.unread ?? 0),
      starred: Number(topRow?.starred ?? 0),
      urgent: Number(topRow?.urgent ?? 0),
      core: Number(topRow?.core ?? 0),
      highlight: Number(topRow?.highlight ?? 0),
      mid: Number(topRow?.mid ?? 0),
    },
    departmentStats: deptStats,
    importanceDistribution: importanceDist,
    signalTrend: signalTrendFormatted,
    topKeywords,
    topHighlights,
    hotTopics,
    heatmapDaily,
  };
}

// 全量语料统计（首页情报速览 + /stats 情报概览共用）。
// 与"个人阅读行为"无关，纯讲内容规模/来源结构/时间分布——
// 快照部署后（无活爬虫、无今日新增）也永远有数据，不会空。
export type CorpusStats = {
  scale: { total: number; displayable: number; sources: number; yearLabel: string };
  sourceRoles: Array<{ label: string; value: number }>;
  topSources: Array<{ label: string; value: number }>;
  timeline: Array<{ label: string; value: number }>;
};

// content_category → 面向创作者的角色标签
const SOURCE_ROLE_LABELS: Record<string, string> = {
  ai_tools: "工具官方",
  industry: "垂直媒体",
  performance: "演出",
  competition: "机会",
};

export async function getCorpusStats(): Promise<CorpusStats> {
  const pool = getPgPool();

  const [scaleRes, rolesRes, topSrcRes, timeRes] = await Promise.all([
    pool.query<{ total: string; displayable: string; sources: string; min_year: string | null; max_year: string | null }>(
      `select
         count(*)::text as total,
         count(*) filter (
           where content_quality is not null and content_quality <> 'empty' and content_quality <> ''
             and creator_lens is not null and length(trim(creator_lens)) > 0
         )::text as displayable,
         count(distinct source_id)::text as sources,
         to_char(min(list_published_at), 'YYYY') as min_year,
         to_char(max(list_published_at), 'YYYY') as max_year
       from monitor_items`,
    ),
    // 按"有内容的源"数量分布（非条目数）——讲来源结构/策展广度，
    // 与"规模总览"的总条数分工；演出类源(CAPA)无产出则自然不出现，
    // 与主动排除 CAPA 的叙事一致。
    pool.query<{ cat: string | null; n: string }>(
      `select s.content_category as cat, count(distinct i.source_id)::text as n
       from monitor_items i
       join monitor_sources s on s.id = i.source_id
       group by s.content_category
       order by count(distinct i.source_id) desc`,
    ),
    // 活跃来源 Top（按条目数）——干净、不偏斜，讲"内容来自哪些源"
    pool.query<{ name: string | null; n: string }>(
      `select s.display_name as name, count(*)::text as n
       from monitor_items i
       join monitor_sources s on s.id = i.source_id
       group by s.display_name
       order by count(*) desc
       limit 6`,
    ),
    pool.query<{ ym: string; n: string }>(
      `select to_char(list_published_at, 'YYYY-MM') as ym, count(*)::text as n
       from monitor_items
       where list_published_at is not null
       group by to_char(list_published_at, 'YYYY-MM')
       order by to_char(list_published_at, 'YYYY-MM')`,
    ),
  ]);

  const s = scaleRes.rows[0];
  const minY = s?.min_year ?? null;
  const maxY = s?.max_year ?? null;
  const yearLabel = minY && maxY ? (minY === maxY ? minY : `${minY}–${maxY}`) : "—";

  const sourceRoles = rolesRes.rows.map((r) => ({
    label: SOURCE_ROLE_LABELS[r.cat ?? ""] ?? (r.cat ?? "其他"),
    value: Number(r.n),
  }));

  // display_name "PetaPixel·影像/AI图像" → 取"·"前的简称做条形标签
  const topSources = topSrcRes.rows.map((r) => ({
    label: (r.name ?? "其他").split("·")[0],
    value: Number(r.n),
  }));

  const timeline = timeRes.rows.map((r) => ({ label: r.ym, value: Number(r.n) }));

  return {
    scale: {
      total: Number(s?.total ?? 0),
      displayable: Number(s?.displayable ?? 0),
      sources: Number(s?.sources ?? 0),
      yearLabel,
    },
    sourceRoles,
    topSources,
    timeline,
  };
}