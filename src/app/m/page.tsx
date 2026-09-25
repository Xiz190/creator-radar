"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Settings, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { ContentItem } from "@/hooks/use-item-list";
import { pickRanked, summarize } from "@/lib/companion/today";
import { pickLens, pickSourceName } from "@/lib/localized-fields";
import { formatCompanionDate } from "@/lib/companion/format";
import { CompanionHeader } from "@/components/companion/companion-header";

export default function CompanionTodayPage() {
  // 伴侣版界面固定英文（设计决策 D9）
  const t = useT("en");

  const [rankedItems, setRankedItems] = useState<ContentItem[]>([]);
  const [statItems, setStatItems] = useState<ContentItem[]>([]);
  const [recentCount, setRecentCount] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // ⚠️ 日期必须**挂载后**才算，不能写成 useMemo(() => formatCompanionDate(new Date()), [])。
  // /m 是构建时预渲染的静态路由：渲染期调用会把**构建当天**的日期烤进产物 HTML，
  // 之后任何一天的访问，客户端算出的字符串都与服务端发来的对不上 → 水合不一致。
  // 与下面的 recentCount 用同一个模式：服务端渲染空白，客户端挂载后填。
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setDateLabel(formatCompanionDate(new Date()));
  }, []);

  // 「Recently viewed」入口：读桌面端 inbox 页写入的 localStorage（形状见
  // src/app/inbox/page.tsx）。只在非空时显示，与桌面首页的空态处理一致。
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("inbox_recent_items") ?? "[]") as unknown;
      setRecentCount(Array.isArray(stored) ? stored.length : 0);
    } catch {
      setRecentCount(0);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const fetchJson = (url: string) =>
      fetch(url, { cache: "no-store", signal: ac.signal }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      );

    // 这里必须是两个请求，而不是"拉最近 N 条再本地过滤"：
    // "Ranked for you" 只关心有 creator_lens 的条目，而 lens 是分批手动补的、
    // 常落后抓取 ~15 天。若拉"最近 60 条"再过滤，lens 一旦落后就整屏空掉。
    // 所以 ranked 直接向 API 要"有 lens 的条目"；stat 那行统计关心全部
    // 最近动态，保持不过滤的查询。两者共用一个 AbortController 与 cleanup。
    //
    // ranked 故意不带 sort：服务器默认排序就是按重要性
    // importance_level → is_starred → keyword_score → first_seen_at，直接取前 4。
    // 若带 sort=published_at，服务器会先按发布时间截出"最近 4 条"再交给 pickRanked 重排，
    // 稍旧但更重要的条目就永远进不了列表。别"好心"把 sort=published_at 加回来。
    const rankedReq = fetchJson("/api/monitor/items?view=list&limit=4&hasLens=1");
    const statReq = fetchJson("/api/monitor/items?view=list&limit=60&sort=published_at");

    Promise.all([rankedReq, statReq])
      .then(([rankedData, statData]) => {
        setRankedItems((rankedData as { items: ContentItem[] }).items ?? []);
        setStatItems((statData as { items: ContentItem[] }).items ?? []);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setState("error");
      });
    return () => ac.abort();
  }, []);

  const ranked = useMemo(() => pickRanked(rankedItems), [rankedItems]);
  const stat = useMemo(() => summarize(statItems), [statItems]);

  return (
    <main>
      {/* 日期在挂载后才算（原因见上）；未挂载时用不换行空格占位，
          否则 CompanionHeader 会因 subtitle 为空而少渲染一行，填充时整块内容下移。 */}
      <CompanionHeader
        title={t("companion.brand")}
        subtitle={dateLabel || " "}
        left={
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[var(--brand)] text-[12px] font-bold text-white">
            CR
          </span>
        }
        right={
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-slate-200">
            <Settings className="h-4 w-4 text-slate-700" aria-hidden />
          </span>
        }
      />

      <div className="px-5 pb-24 pt-1.5">
        {state === "loading" ? (
          <p className="pt-6 text-[13.5px] text-slate-500">{t("companion.loading")}</p>
        ) : state === "error" ? (
          <p className="pt-6 text-[13.5px] text-slate-500">{t("companion.error")}</p>
        ) : (
          <>
            <div className="mt-[22px] font-mono text-[13.5px] text-slate-700">
              <b className="font-semibold text-slate-900">{stat.unread}</b> unread ·{" "}
              <b className="font-semibold text-slate-900">{stat.key}</b> key today
            </div>

            <div className="mb-2 mt-[26px] text-[12px] font-bold text-slate-900">
              {t("companion.today.ranked")}
            </div>

            {ranked.length === 0 ? (
              <p className="py-5 text-[13.5px] text-slate-500">{t("companion.empty")}</p>
            ) : (
              ranked.map((item) => (
                <Link
                  key={item.url}
                  href={`/m/item/${encodeURIComponent(item.sourceId)}?url=${encodeURIComponent(item.url)}`}
                  className="flex gap-[9px] border-b border-slate-200 px-0.5 py-4"
                >
                  <Sparkles
                    className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--brand)]"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-[15.5px] font-medium leading-[1.42] text-[var(--brand-ink)]">
                      {pickLens(item, "en")}
                    </div>
                    <div className="mt-[7px] truncate text-[11.5px] text-slate-500">
                      <span className="font-semibold text-slate-700">{pickSourceName(item, "en")}</span>
                      {" · "}
                      {item.title}
                    </div>
                  </div>
                </Link>
              ))
            )}

            <Link
              href="/m/feed"
              className="mt-[18px] inline-flex items-center gap-[5px] text-[13px] font-semibold text-[var(--brand-ink)]"
            >
              {t("companion.today.seeAll")}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>

            {/* Recently viewed 入口：只有本地有记录才显示（与桌面首页空态一致）。
                样式对齐 mockup 的 .continue（全宽、lbl + ttl + chevron）。 */}
            {recentCount > 0 ? (
              <Link
                href="/m/recent"
                className="mt-4 flex w-full items-center gap-[9px] rounded-[13px] border border-slate-200 bg-white px-[13px] py-[11px] text-left"
              >
                <span className="flex-none text-[12.5px] font-semibold text-slate-700">
                  {t("companion.today.recentlyViewed")}
                </span>
                <span className="flex-1 truncate text-[12.5px] text-slate-500">
                  {t("companion.today.recentCount", { n: recentCount })}
                </span>
                <ChevronRight className="h-4 w-4 flex-none text-slate-500" aria-hidden />
              </Link>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
