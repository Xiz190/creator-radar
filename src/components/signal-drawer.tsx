"use client";

// 信号侧栏（创作者版）：这条命中了哪些信号、原文提到了哪几类创作者相关的事、创作者视角怎么说。
// AI 分析只给作者用（data-owner-only，公开站上访客点了会看到只读提示）。
import { useEffect, useState } from "react";
import Link from "next/link";
import { RadioTower, X } from "lucide-react";
import { categoryDisplayLabel, categoryTooltip, getCategoryGroup } from "@/lib/monitor/content-meta";
import { CREATOR_SIGNAL_KEYS, creatorSignalLabel, detectCreatorSignals } from "@/lib/monitor/creator-signals";
import { formatDateShortSlash } from "@/lib/date-utils";
import { ImportanceBadge } from "@/components/importance-badge";
import { SourceName } from "@/components/source-name";
import { usePrefs } from "@/contexts/prefs-context";
import type { ContentItem } from "@/hooks/use-item-list";

interface AIAnalysisResult {
  forecastHigh: string;
  forecastMidHigh: string;
  forecastMid: string;
  forecastLow: string;
  reasoning: string;
  source?: "doubao" | "llm" | "rule";
}

type SignalDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  item: ContentItem | null;
  detail?: Record<string, unknown>;
};

// 四档确定性，换成创作者读得懂的说法
const LEVELS: Array<{ key: keyof AIAnalysisResult; zh: string; en: string }> = [
  { key: "forecastHigh", zh: "原文写明", en: "Stated in the source" },
  { key: "forecastMidHigh", zh: "很可能", en: "Likely" },
  { key: "forecastMid", zh: "有可能", en: "Possible" },
  { key: "forecastLow", zh: "推测", en: "Speculative" },
];

export function SignalDrawer({ isOpen, onClose, item, detail }: SignalDrawerProps) {
  const { language } = usePrefs();
  const en = language === "en";
  const L = (zh: string, enText: string) => (en ? enText : zh);
  // 分析结果记上"属于哪条、哪种语言"；换条目或换语言后自然作废，不用在 effect 里清空
  const runKey = `${item?.url ?? ""}|${language}`;
  const [aiRun, setAiRun] = useState<{ key: string; state: "loading" | "failed" | "done"; result?: AIAnalysisResult } | null>(null);
  const current = aiRun?.key === runKey ? aiRun : null;
  const ai = current?.state === "done" ? current.result ?? null : null;
  const aiState = current?.state === "loading" ? "loading" : current?.state === "failed" ? "failed" : "idle";

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const summary = typeof detail?.summary === "string" ? detail.summary : null;
  const lens = en ? item.creatorLensEn ?? item.creatorLens : item.creatorLens;
  const signalCats = [...new Set(item.categories.filter((c) => getCategoryGroup(c.category) === "signal").map((c) => c.category))];
  const cs = detectCreatorSignals({ title: item.title, summary, deadlineDate: item.deadlineDate });

  async function analyze() {
    if (!item) return;
    const key = runKey;
    setAiRun({ key, state: "loading" });
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "analyze-item",
          title: item.title,
          content: summary || item.title,
          summary,
          matchedSignals: item.categories.map((c) => c.category),
          language,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; result?: AIAnalysisResult };
      if (!data.ok || !data.result) throw new Error("bad");
      setAiRun({ key, state: "done", result: data.result });
    } catch {
      setAiRun({ key, state: "failed" });
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/20" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={L("信号分析", "Signal analysis")}
        className="absolute bottom-0 right-0 top-0 flex w-full max-w-lg flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <RadioTower className="h-4 w-4" aria-hidden />
            {L("信号分析", "Signal analysis")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={L("关闭", "Close")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <div className="text-xs text-slate-500">
              <SourceName name={item.departmentName} /> · {formatDateShortSlash(item.listPublishedAt)}
            </div>
            <h3 className="mt-1.5 text-[15px] font-medium leading-snug text-slate-900">{item.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <ImportanceBadge level={item.importanceLevel} keywordScore={item.keywordScore} />
              {item.keywordScore > 0 && <span className="tabular-nums text-slate-500">{L("关键词得分", "Keyword score")} {item.keywordScore}</span>}
            </div>
            {lens && <p className="mt-3 font-serif text-[15px] leading-snug text-[var(--brand)]">{lens}</p>}
          </section>

          {signalCats.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-slate-500">{L("信号类型", "Signal type")}</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {signalCats.map((c) => (
                  <span key={c} title={categoryTooltip(c, language)} className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
                    {categoryDisplayLabel(c, language)}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold text-slate-500">{L("原文提到了", "The source mentions")}</h4>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {CREATOR_SIGNAL_KEYS.map((key) => (
                <li key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-slate-700">{creatorSignalLabel(key, language)}</span>
                  <span className={`tabular-nums ${cs[key] ? "font-medium text-[var(--brand)]" : "text-slate-300"}`}>
                    {key === "deadline" && item.deadlineDate ? item.deadlineDate.slice(0, 10) : cs[key] ? "✓" : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-slate-500">{L("按关键词识别，只说明原文提到了，不代表判断。", "Found by keywords. It shows what the text mentions, not a judgement.")}</p>
          </section>

          {summary && (
            <section>
              <h4 className="text-xs font-semibold text-slate-500">{L("摘要", "Summary")}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{summary}</p>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold text-slate-500">
                {ai ? (ai.source === "rule" ? L("关键词规则判断", "Keyword-rule reading") : L("AI 分析", "AI analysis")) : L("接下来会怎样", "What happens next")}
              </h4>
              <button
                type="button"
                data-owner-only
                onClick={analyze}
                disabled={aiState === "loading"}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 transition hover:border-slate-300 disabled:cursor-wait disabled:opacity-60"
              >
                {aiState === "loading" ? L("分析中…", "Analysing…") : ai ? L("重新分析", "Run again") : L("AI 分析", "Analyse with AI")}
              </button>
            </div>
            {aiState === "failed" && <p className="mt-2 text-xs text-red-700">{L("分析没成功，稍后再试。", "Analysis failed. Try again later.")}</p>}
            {ai ? (
              <dl className="mt-3 space-y-3">
                {LEVELS.filter((lv) => ai[lv.key]).map((lv) => (
                  <div key={lv.key}>
                    <dt className="text-xs font-medium text-slate-500">{en ? lv.en : lv.zh}</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-slate-700">{String(ai[lv.key])}</dd>
                  </div>
                ))}
                {ai.reasoning && <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">{ai.reasoning}</p>}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                {L("按确定性从高到低，推测这条之后可能的走向。", "A read on where this goes next, from what the source states to what is speculation.")}
              </p>
            )}
          </section>
        </div>

        <div className="flex gap-2 border-t border-slate-200 px-5 py-3">
          <Link
            href={`/items/${encodeURIComponent(item.sourceId)}?url=${encodeURIComponent(item.url)}`}
            prefetch={false}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-center text-sm text-slate-700 transition hover:bg-slate-50"
          >
            {L("查看详情", "Open details")}
          </Link>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-center text-sm text-white transition hover:bg-slate-700"
          >
            {L("打开原文 ↗", "Open original ↗")}
          </a>
        </div>
      </aside>
    </div>
  );
}
