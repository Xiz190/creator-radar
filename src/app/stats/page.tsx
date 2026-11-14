"use client";

import { usePrefs } from "@/contexts/prefs-context";
import { SourceName } from "@/components/source-name";
import { getAllPersonalResearch } from "@/lib/personal-research";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  BarChart3, Inbox, Key, Landmark, Save,
} from "lucide-react";

type DashData = {
  counts: { total: number; unread: number; starred: number; urgent: number; highlight: number };
  departmentStats: { departmentName: string; total: number; todayCount: number }[];
  topKeywords: { keyword: string; category: string; count: number }[];
  periodDays: number;
};

type LocalStats = {
  notes: number;
  tags: number;
  taggedItems: number;
  followUps: number;
  savedPresets: number;
};

function StatBlock({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export default function StatsPage() {
  const en = usePrefs().language === "en";
  const L = (zh: string, enText: string) => (en ? enText : zh);
  const [dash, setDash] = useState<DashData | null>(null);
  const [local, setLocal] = useState<LocalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load localStorage stats
    try {
      // 2026-11 起个人处理只有「待跟进」一套（稍后读、置顶已并入）
      const research = getAllPersonalResearch();
      const presets = JSON.parse(localStorage.getItem("inbox_saved_presets") ?? "[]");
      const allTags = new Set<string>();
      for (const r of research) for (const tag of r.tags) allTags.add(tag);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载后才能读浏览器数据（本地存储/窗口/当前时间），服务端读不到；放进渲染会造成水合不一致
      setLocal({
        notes: research.filter((r) => r.note.trim()).length,
        tags: allTags.size,
        taggedItems: research.filter((r) => r.tags.length > 0).length,
        followUps: research.filter((r) => r.followUpStatus !== "none").length,
        savedPresets: presets.length,
      });
    } catch {}

    // Fetch dashboard data
    fetch("/api/monitor/dashboard?days=30&topN=10", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setDash(d as DashData); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const readPct = dash ? Math.round(((dash.counts.total - dash.counts.unread) / Math.max(1, dash.counts.total)) * 100) : 0;
  const engagementPct = dash ? Math.round(((dash.counts.starred + dash.counts.urgent) / Math.max(1, dash.counts.total)) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">

        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">{L("首页", "Home")}</Link>
            <span>/</span>
            <span>{L("个人统计", "My stats")}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900"><BarChart3 className="mr-1 inline h-4 w-4" aria-hidden />{L("个人阅读统计", "My reading stats")}</h1>
          <p className="mt-1 text-sm text-slate-500">{L("用这台浏览器里的记录和近 30 天的数据算出来，不上传任何个人信息。", "Built from this browser's records and the last 30 days of data. Nothing personal is uploaded.")}</p>
        </div>

        {/* API-based stats */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5">
                <div className="h-3 w-16 rounded bg-slate-100" />
                <div className="mt-2 h-7 w-12 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : dash ? (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-700"><Inbox className="mr-1 inline h-3.5 w-3.5" aria-hidden />{en ? `News Feed, last ${dash.periodDays} days` : `动态资讯概览（近 ${dash.periodDays} 天）`}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBlock label={L("入库条目", "Items in")} value={dash.counts.total} sub={L("总量", "total")} />
                <StatBlock label={L("已读", "Read")} value={dash.counts.total - dash.counts.unread} sub={en ? `${readPct}% read` : `完成率 ${readPct}%`} accent="var(--brand)" />
                <StatBlock label={L("标星/核心", "Starred or core")} value={dash.counts.starred + dash.counts.urgent} sub={en ? `${engagementPct}% of items` : `参与率 ${engagementPct}%`} />
                <StatBlock label={L("未读", "Unread")} value={dash.counts.unread} sub={L("待处理", "to go")} />
              </div>
            </section>

            {/* Reading rate bar */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{L("阅读完成率", "Read rate")}</span>
                <span className="text-slate-500">{readPct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${readPct}%`, backgroundColor: readPct >= 80 ? "#10b981" : readPct >= 50 ? "#f59e0b" : "var(--brand)" }}
                />
              </div>
            </div>

            {/* Top departments */}
            {dash.departmentStats.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-sm font-semibold text-slate-700"><Landmark className="mr-1 inline h-3.5 w-3.5" aria-hidden />{L("最活跃的 5 个来源", "Top 5 sources")}</h2>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="space-y-3">
                    {dash.departmentStats.slice(0, 5).map((d, i) => {
                      const max = dash.departmentStats[0]?.total || 1;
                      return (
                        <div key={d.departmentName} className="flex items-center gap-3">
                          <span className="w-4 text-center text-xs text-slate-400">{i + 1}</span>
                          <span className="w-28 truncate text-xs text-slate-700"><SourceName name={d.departmentName} /></span>
                          <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-2">
                            <div className="h-full rounded-full" style={{ width: `${(d.total / max) * 100}%`, backgroundColor: "var(--brand)", opacity: 0.7 }} />
                          </div>
                          <span className="w-8 text-right text-xs text-slate-500">{d.total}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Top keywords */}
            {dash.topKeywords.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-sm font-semibold text-slate-700"><Key className="mr-1 inline h-3.5 w-3.5" aria-hidden />{L("高频关键词", "Top keywords")}</h2>
                <div className="flex flex-wrap gap-2">
                  {dash.topKeywords.slice(0, 15).map((kw) => (
                    <Link
                      key={kw.keyword}
                      href={`/inbox?q=${encodeURIComponent(kw.keyword)}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      style={{ fontSize: `${Math.min(14, 10 + kw.count / 5)}px` }}
                    >
                      {kw.keyword} <span className="text-slate-400">{kw.count}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}

        {/* Local stats */}
        {local && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-700"><Save className="mr-1 inline h-3.5 w-3.5" aria-hidden />{L("这台浏览器里的数据", "Saved in this browser")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBlock label={L("便签", "Notes")} value={local.notes} />
              <StatBlock label={L("已打标签条目", "Tagged items")} value={local.taggedItems} sub={en ? `${local.tags} tags` : `${local.tags} 种标签`} />
              <StatBlock label={L("待跟进", "Follow-ups")} value={local.followUps} />
              <StatBlock label={L("已保存的筛选", "Saved filters")} value={local.savedPresets} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
