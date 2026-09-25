"use client";

import { useEffect, useRef, useState } from "react";
import { HBarChart, StatGrid } from "@/components/insight-charts";
import { fetchSubscriptions, groupSubscriptions } from "@/lib/subscription-utils";

// 全量语料统计（来自 /api/monitor/corpus-stats）——讲内容规模/来源结构，
// 与"今日新增/阅读行为"无关，快照部署后也永远有内容，不会空。
type CorpusStats = {
  scale: { total: number; displayable: number; sources: number; yearLabel: string };
  sourceRoles: Array<{ label: string; value: number }>;
  topSources: Array<{ label: string; value: number }>;
  timeline: Array<{ label: string; value: number }>;
};

// 关键词热度（来自 /api/monitor/dashboard）——把「数据洞察」里的关键词命中
// 也搬到首页情报速览，有订阅时优先展示「我关注的关键词命中」。
type DashboardStats = {
  topKeywords: Array<{ keyword: string; category: string; count: number }>;
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

/**
 * 首页右栏「情报速览」滑动卡：一个槽里收多张真·可视化情报图，
 * 箭头 / 圆点 / 左右滑 / 键盘 ←→ 切换，切换时淡入。
 * 数据为全量语料统计（源角色分布 / 内容时间线 / 规模总览）。
 */
export function HomeInsightCarousel() {
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [followedKeywords, setFollowedKeywords] = useState<Array<{ label: string; value: number }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/monitor/corpus-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: CorpusStats) => { if (alive) { setStats(d); setLoaded(true); } })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  // 关键词热度 +（若已订阅）我关注的关键词命中
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dashRes, subs] = await Promise.all([
          fetch("/api/monitor/dashboard?days=30&topN=20", { cache: "no-store" }).then((r) => r.json()),
          fetchSubscriptions().catch(() => []),
        ]);
        if (!alive) return;
        const dash = dashRes as DashboardStats;
        setDashboard(dash);
        const kws = groupSubscriptions(subs).keywords.map((k) => k.target.toLowerCase());
        if (kws.length > 0 && Array.isArray(dash?.topKeywords)) {
          const matched = dash.topKeywords
            .filter((k) => kws.includes(k.keyword.toLowerCase()))
            .slice(0, 8)
            .map((k) => ({ label: k.keyword, value: k.count }));
          setFollowedKeywords(matched);
        }
      } catch {
        // 静默：没有该数据时该 slide 不出现即可
      }
    })();
    return () => { alive = false; };
  }, []);

  const slides: Array<{ title: string; body: React.ReactNode }> = [];
  if (followedKeywords.length > 0) {
    slides.push({ title: "我关注的关键词命中", body: <HBarChart rows={followedKeywords} /> });
  }
  if (dashboard && Array.isArray(dashboard.topKeywords) && dashboard.topKeywords.length > 0) {
    slides.push({
      title: "关键词热度 Top",
      body: <HBarChart rows={dashboard.topKeywords.slice(0, 8).map((k) => ({ label: k.keyword, value: k.count }))} />,
    });
  }
  if (stats) {
    if (stats.sourceRoles.length > 0) {
      slides.push({ title: "源角色分布", body: <HBarChart rows={stats.sourceRoles} /> });
    }
    if (stats.topSources.length > 0) {
      slides.push({ title: "活跃来源 Top", body: <HBarChart rows={stats.topSources} /> });
    }
    slides.push({
      title: "规模总览",
      body: (
        <StatGrid
          cells={[
            { label: "真实数据", value: stats.scale.total, spark: stats.timeline.map((t) => t.value) },
            { label: "正文可展示", value: stats.scale.displayable },
            { label: "数据源", value: stats.scale.sources },
            { label: "内容年份", value: stats.scale.yearLabel },
          ]}
        />
      ),
    });
  }

  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = slides.length;
  const go = (d: number) => setIdx((p) => (n === 0 ? 0 : (p + d + n) % n));
  const safeIdx = n === 0 ? 0 : idx % n;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5"
      tabIndex={0}
      role="group"
      aria-roledescription="情报图轮播"
      aria-label="情报速览"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3.5 w-1 rounded-sm bg-[var(--brand)]" aria-hidden />
          <span className="font-serif text-sm font-semibold text-slate-900">情报速览</span>
          {n > 0 && <span className="truncate text-[11px] text-slate-400">· {slides[safeIdx].title}</span>}
        </div>
        {n > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => go(-1)} aria-label="上一张" className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <Chevron dir="left" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="下一张" className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <Chevron dir="right" />
            </button>
          </div>
        )}
      </div>

      <div key={safeIdx} className="radar-fade flex min-h-[210px] items-center justify-center">
        {n > 0 ? (
          slides[safeIdx].body
        ) : (
          <p className="text-xs text-slate-400">{loaded ? "暂无情报数据" : "情报速览加载中…"}</p>
        )}
      </div>

      {n > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={s.title}
              aria-current={i === safeIdx}
              className={`h-1.5 rounded-full transition-all ${i === safeIdx ? "w-4 bg-[var(--brand)]" : "w-1.5 bg-slate-200 hover:bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
