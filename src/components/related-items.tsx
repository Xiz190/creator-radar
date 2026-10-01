"use client";

import { useState } from "react";
import { usePrefs } from "@/contexts/prefs-context";
import { useT } from "@/lib/i18n";
import { ImportanceBadge } from "@/components/importance-badge";
import {
  Link, Paperclip, Tag,
} from "lucide-react";

export type RelatedContentItem = {
  sourceId: string;
  url: string;
  title: string;
  departmentName: string;
  listPublishedAt: string;
  keywordScore: number;
  importanceLevel: string;
  relationType: "sameTopic" | "sameDept" | "cited";
  similarityScore?: number;
};

export type RelatedItemsData = {
  sameTopic: RelatedContentItem[];
  sameDept: RelatedContentItem[];
  cited: RelatedContentItem[];
};

type RelatedItemsProps = {
  data: RelatedItemsData;
};

const TAB_CONFIG = [
  { key: "sameTopic", labelKey: "related.same-topic", icon: Tag, descKey: "related.same-topic-desc" },
  { key: "sameDept", labelKey: "related.same-source", icon: Tag, descKey: "related.same-source-desc" },
  { key: "cited", labelKey: "related.cited", icon: Link, descKey: "related.cited-desc" },
] as const;

function getImportanceBadge(level: string) {
  if (level.includes("核心")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (level.includes("重点") || level.includes("加急")) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  if (level.includes("关注")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export function RelatedItems({ data }: RelatedItemsProps) {
  const t = useT(usePrefs().language);
  // 默认打开第一个有内容的标签，免得一进来停在「同主题 (0) · 暂无」而旁边其实有内容
  const [activeTab, setActiveTab] = useState<"sameTopic" | "sameDept" | "cited">(() =>
    data.sameTopic.length > 0 ? "sameTopic" : data.sameDept.length > 0 ? "sameDept" : data.cited.length > 0 ? "cited" : "sameTopic",
  );

  const items = data[activeTab];

  const totalCount =
    data.sameTopic.length + data.sameDept.length + data.cited.length;

  if (totalCount === 0) return null;

  function handleCompareAll() {
    try {
      const key = "compare_items";
      const raw = window.localStorage.getItem(key);
      let existingItems: Array<{ sourceId: string; url: string; title: string }> = [];
      if (raw) {
        try {
          existingItems = JSON.parse(raw);
        } catch {
          existingItems = [];
        }
      }
      const toAdd = items.slice(0, 5).filter(
        (it) => !existingItems.some((e) => e.sourceId === it.sourceId && e.url === it.url)
      );
      const merged = [...existingItems, ...toAdd.map((it) => ({ sourceId: it.sourceId, url: it.url, title: it.title }))].slice(0, 10);
      window.localStorage.setItem(key, JSON.stringify(merged));
    } catch {
      // localStorage 不可用时忽略
    }
  }

  const displayCount = Math.min(items.length, 5);
  const hasCompareButton = items.length >= 2;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" aria-hidden />
          <h2 className="text-base font-semibold text-slate-900">{t("related.title")}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            {t("inbox.count", { n: totalCount })}
          </span>
        </div>
        {hasCompareButton && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCompareAll}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-violet-600 px-3 text-xs font-medium text-white transition hover:bg-violet-700"
            >
              <span>⇄</span>
              <span>{t("related.compare-top", { n: displayCount })}</span>
            </button>
            <a
              href="/compare"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <span>→</span>
              <span>{t("qa.btn.go-compare")}</span>
            </a>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-1 border-b border-slate-200">
        {TAB_CONFIG.map((tab) => {
          const count = data[tab.key as keyof typeof data].length;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`relative px-3 py-2 text-xs font-medium transition ${
                isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              } ${count === 0 ? "opacity-40" : ""}`}
              disabled={count === 0}
            >
              <span className="inline-flex items-center gap-1"><tab.icon className="h-3.5 w-3.5" aria-hidden />{t(tab.labelKey)}</span>
              <span className="ml-1 text-[11px]">({count})</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.slice(0, 8).map((item, idx) => (
              <a
                key={idx}
                href={`/items/${item.sourceId}?sourceId=${item.sourceId}&url=${encodeURIComponent(item.url)}`}
                className="block rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{item.departmentName}</span>
                      <span>·</span>
                      <span>{item.listPublishedAt}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ImportanceBadge level={item.importanceLevel} keywordScore={item.keywordScore} className="text-[11px]" />
                  </div>
                </div>
              </a>
            ))}
            {items.length > 8 && (
              <div className="text-center text-xs text-slate-400">
                {t("related.more", { n: items.length - 8 })}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            {t("related.empty")}
          </div>
        )}
      </div>
    </section>
  );
}
