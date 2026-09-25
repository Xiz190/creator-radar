import { getPgPool } from "@/lib/db";

export async function getDepartmentUpdateStats(days: number = 7) {
  const pool = getPgPool();
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const todayStart = new Date(new Date().toISOString().slice(0, 10));

  const res = await pool.query<{ department_name: string; list_published_at: string; cnt: string }>(
    `select coalesce(s.department_name, '未分类部委') as department_name,
            i.list_published_at::date as list_published_at,
            count(*)::text as cnt
     from monitor_items i
     inner join monitor_sources s on s.id = i.source_id
     where i.list_published_at >= $1::date
     group by s.department_name, i.list_published_at::date
     order by s.department_name, i.list_published_at::date desc`,
    [since],
  );

  const byDept = new Map<string, { total: number; today: number; byDate: Map<string, number> }>();
  const today = todayStart.toISOString().slice(0, 10);

  for (const row of res.rows) {
    const dept = row.department_name;
    const date = String(row.list_published_at).slice(0, 10);
    const cnt = Number(row.cnt);
    if (!byDept.has(dept)) byDept.set(dept, { total: 0, today: 0, byDate: new Map() });
    const agg = byDept.get(dept)!;
    agg.total += cnt;
    if (date === today) agg.today += cnt;
    agg.byDate.set(date, cnt);
  }

  const dateLabels: string[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const dt = new Date(Date.now() - d * 24 * 3600 * 1000);
    dateLabels.push(dt.toISOString().slice(0, 10));
  }

  return Array.from(byDept.entries())
    .map(([departmentName, agg]) => ({
      departmentName,
      total: agg.total,
      todayCount: agg.today,
      series: dateLabels.map((date) => ({ date, count: agg.byDate.get(date) ?? 0 })),
    }))
    .sort((a, b) => b.total - a.total);
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
    { level: "中等重点", label: "中等重点", count: map["中等重点"], color: "#fbbf24" },
    { level: "普通内容", label: "普通", count: map["普通内容"], color: "#94a3b8" },
  ];
}

export async function getSignalTrend(days: number = 14) {
  const pool = getPgPool();
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const dateLabels: string[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const dt = new Date(Date.now() - d * 24 * 3600 * 1000);
    dateLabels.push(dt.toISOString().slice(0, 10));
  }

  const res = await pool.query<{ category: string; day: string; cnt: string }>(
    `
    select
      case c->>'category'
        when 'signal_risk' then 'C·申报截止预警'
        when 'signal_opportunity' then 'B·创作机会'
        when 'signal_pre' then 'D·行业观察'
        when 'risk' then 'C·申报截止预警'
        when 'opportunity' then 'B·创作机会'
        when 'pre_signal' then 'D·行业观察'
        else c->>'category'
      end as category,
      i.first_seen_at::date as day,
      count(*)::text as cnt
    from monitor_items i
    cross join jsonb_array_elements(case when jsonb_typeof(i.matched_categories) = 'array' then i.matched_categories else '[]'::jsonb end) as c
    where (
      c->>'category' in ('C·申报截止预警', 'B·创作机会', 'D·行业观察')
      or c->>'category' in ('signal_risk', 'signal_opportunity', 'signal_pre', 'risk', 'opportunity', 'pre_signal')
    )
      and i.first_seen_at >= $1::timestamptz
    group by 1, i.first_seen_at::date
    order by day
    `,
    [since],
  );

  const signals = [
    { key: "C·申报截止预警", label: "截止预警", color: "#ef4444" },
    { key: "B·创作机会", label: "机会", color: "#10b981" },
    { key: "D·行业观察", label: "行业观察", color: "#6366f1" },
  ];

  const bySignalDay = new Map<string, number>();
  for (const row of res.rows) {
    bySignalDay.set(`${row.category}::${String(row.day).slice(0, 10)}`, Number(row.cnt));
  }

  return {
    dates: dateLabels,
    series: signals.map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      values: dateLabels.map((d) => bySignalDay.get(`${s.key}::${d}`) ?? 0),
    })),
  };
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
    else counter.set(key, { keyword: kw, category: String(row.category), count: Number(row.cnt) });
  }

  const topList = Array.from(counter.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  if (topList.length > 0) return topList;

  const res2 = await pool.query<{ keyword: string; category: string; cnt: string }>(
    `select k.keyword, k.category, count(*)::text as cnt
     from monitor_items i
     inner join monitor_keywords k on lower(i.title) like '%' || lower(k.keyword) || '%'
     where i.first_seen_at >= $1::timestamptz
     group by k.keyword, k.category
     order by cnt desc
     limit $2`,
    [since, limit],
  );
  return res2.rows.map((r) => ({ keyword: r.keyword, category: r.category, count: Number(r.cnt) }));
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
    signalTrend,
    topKeywords,
  };
}