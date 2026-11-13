"use client";

// 创作者版对比：几条内容放在一起，回答"哪条值得动手、哪条留意、哪条可以跳过"。
// 打开页面就有规则版结论（GET 里算好，不调用 AI，访客也能看）；作者可以再用 AI 比一次。
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { ImportanceBadge } from "@/components/importance-badge";
import { SourceName } from "@/components/source-name";
import { sourceNameFor } from "@/lib/source-names";
import { usePrefs } from "@/contexts/prefs-context";
import { categoryDisplayLabel, getCategoryGroup } from "@/lib/monitor/content-meta";
import { CREATOR_SIGNAL_KEYS, creatorSignalLabel, detectCreatorSignals } from "@/lib/monitor/creator-signals";
import type { CompareAction, CompareInput, CreatorComparison } from "@/lib/monitor/creator-compare";

type CompareItem = {
  sourceId: string;
  url: string;
  title: string;
  summary: string | null;
  departmentName: string;
  listPublishedAt: string | null;
  deadlineDate: string | null;
  importanceLevel: string;
  keywordScore: number;
  matchedKeywords?: Array<{ keyword: string; category: string }>;
  categories?: Array<{ category: string; score: number }>;
  creatorLens: string | null;
  creatorLensEn: string | null;
};

type Ref = { sourceId: string; url: string };

const STORAGE_KEY = "compare_items";

function parseRefs(param: string): Ref[] {
  const out: Ref[] = [];
  for (const part of param.split("|")) {
    const i = part.indexOf("::");
    if (i > 0 && part.slice(i + 2)) out.push({ sourceId: part.slice(0, i), url: part.slice(i + 2) });
  }
  return out.slice(0, 5);
}

const toParam = (refs: Ref[]) => refs.map((r) => `${r.sourceId}::${r.url}`).join("|");

function shortDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}

const ACTION_TEXT: Record<CompareAction, { zh: string; en: string; cls: string }> = {
  act: { zh: "值得动手", en: "Act on it", cls: "bg-[var(--brand-tint)] text-[var(--brand)]" },
  watch: { zh: "留意", en: "Watch", cls: "border border-[var(--brand-border)] text-[var(--brand)]" },
  skip: { zh: "可跳过", en: "Skip", cls: "border border-slate-200 text-slate-500" },
};

export function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const en = usePrefs().language === "en";
  const lang = en ? "en" : "zh";
  const L = (zh: string, enText: string) => (en ? enText : zh);

  const refs = useMemo(() => parseRefs(searchParams.get("items") || ""), [searchParams]);
  // 结果都记上"哪组条目、哪种语言"；参数一变旧结果自然作废，不用在 effect 里清空
  const reqKey = `${toParam(refs)}|${lang}`;
  const [loaded, setLoaded] = useState<{ key: string; ok: boolean; items: CompareItem[]; rule: CreatorComparison | null } | null>(null);
  const [aiRun, setAiRun] = useState<{ key: string; state: "loading" | "failed" | "done"; result?: CreatorComparison; source?: "llm" | "rule" } | null>(null);
  const fresh = loaded?.key === reqKey ? loaded : null;
  const state: "loading" | "ready" | "error" = !fresh ? "loading" : fresh.ok ? "ready" : "error";
  const items = useMemo(() => fresh?.items ?? [], [fresh]);
  const rule = fresh?.rule ?? null;
  const aiCur = aiRun?.key === reqKey ? aiRun : null;
  const ai = aiCur?.state === "done" && aiCur.result ? { result: aiCur.result, source: aiCur.source ?? "rule" } : null;
  const aiState = aiCur?.state === "loading" ? "loading" : aiCur?.state === "failed" ? "failed" : "idle";

  // 没带参数时，从「加入对比」存下的清单补上
  useEffect(() => {
    if (refs.length > 0) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Ref[];
      if (saved.length > 0) router.replace(`/compare?items=${encodeURIComponent(toParam(saved))}`);
    } catch {
      // localStorage 不可用时忽略
    }
  }, [refs.length, router]);

  useEffect(() => {
    if (refs.length < 2) return;
    const ctrl = new AbortController();
    const key = reqKey;
    fetch(`/api/monitor/compare?lang=${lang}&items=${encodeURIComponent(toParam(refs))}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok: boolean; items?: CompareItem[]; rule?: CreatorComparison }) => {
        if (!d.ok || !d.items || d.items.length < 2) throw new Error("bad");
        setLoaded({ key, ok: true, items: d.items, rule: d.rule ?? null });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setLoaded({ key, ok: false, items: [], rule: null });
      });
    return () => ctrl.abort();
  }, [refs, lang, reqKey]);

  const removeItem = useCallback(
    (ref: Ref) => {
      const next = refs.filter((r) => !(r.sourceId === ref.sourceId && r.url === ref.url));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      router.replace(next.length ? `/compare?items=${encodeURIComponent(toParam(next))}` : "/compare");
    },
    [refs, router],
  );

  const runAi = useCallback(async () => {
    const key = reqKey;
    setAiRun({ key, state: "loading" });
    const payload: CompareInput[] = items.map((it) => ({
      title: it.title,
      summary: it.summary,
      department: sourceNameFor(it.departmentName, lang),
      publishedAt: it.listPublishedAt,
      deadlineDate: it.deadlineDate,
      lens: en ? it.creatorLensEn ?? it.creatorLens : it.creatorLens,
    }));
    try {
      const res = await fetch("/api/monitor/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: payload, lang }),
      });
      const d = (await res.json()) as { ok: boolean; result?: CreatorComparison; source?: "llm" | "rule" };
      if (!d.ok || !d.result) throw new Error("bad");
      setAiRun({ key, state: "done", result: d.result, source: d.source ?? "rule" });
    } catch {
      setAiRun({ key, state: "failed" });
    }
  }, [items, en, lang, reqKey]);

  const verdict = ai?.result ?? rule;
  const verdictFromAi = ai?.source === "llm";
  const signals = useMemo(
    () => items.map((it) => detectCreatorSignals({ title: it.title, summary: it.summary, deadlineDate: it.deadlineDate })),
    [items],
  );
  const kwSets = useMemo(() => items.map((it) => new Set((it.matchedKeywords ?? []).map((k) => k.keyword))), [items]);
  const sharedKw = useMemo(
    () => (kwSets.length ? [...kwSets[0]].filter((k) => kwSets.every((s) => s.has(k))) : []),
    [kwSets],
  );

  const tooFew = refs.length < 2;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <BackButton />
        </div>
        <section className="mb-6 border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{L("对比", "Compare")}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {L("把几条放在一起看：哪条值得动手，哪条留意，哪条可以跳过。", "Line items up side by side: which to act on, which to watch, which to skip.")}
          </p>
        </section>

        {tooFew ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">{L("至少要选 2 条才能对比", "Pick at least 2 items to compare")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {L("在动态资讯里点每条右侧的", "In the News Feed, click")}{" "}
              <ArrowLeftRight className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden />{" "}
              {L("加入对比，最多 5 条。", "on any item to add it here. Up to 5.")}
            </p>
            <Link href="/inbox" prefetch={false} className="mt-4 inline-block text-sm font-medium text-[var(--brand)] underline-offset-4 hover:underline">
              {L("去动态资讯 →", "Open the News Feed →")}
            </Link>
          </div>
        ) : state === "error" ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
            {L("加载失败，可能有条目已被移除。刷新再试一次。", "Couldn't load these items. Some may have been removed. Try refreshing.")}
          </div>
        ) : state !== "ready" ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 结论 */}
            {verdict && (
              <section>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-lg text-slate-900">{L("结论", "Verdict")}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{verdictFromAi ? L("AI 分析", "AI analysis") : L("关键词规则", "Keyword rules")}</span>
                    <button
                      type="button"
                      data-owner-only
                      onClick={runAi}
                      disabled={aiState === "loading"}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300 disabled:cursor-wait disabled:opacity-60"
                    >
                      {aiState === "loading" ? L("AI 对比中…", "Comparing…") : L("用 AI 再比一次", "Compare with AI")}
                    </button>
                  </div>
                </div>
                {aiState === "failed" && <p className="mt-2 text-xs text-red-700">{L("AI 对比没成功，下面仍是规则版结论。", "AI comparison failed. The rule-based verdict is still shown.")}</p>}
                <p className="mt-3 font-serif text-[17px] leading-relaxed text-slate-900">{verdict.overallSummary}</p>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{L("共同点", "In common")}</h3>
                    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
                      {verdict.similarities.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{L("不同点", "Differences")}</h3>
                    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
                      {verdict.differences.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
                {verdict.keyFindings && <p className="mt-4 text-xs leading-relaxed text-slate-500">{verdict.keyFindings}</p>}
              </section>
            )}

            {/* 逐条 */}
            <section className={`grid gap-4 ${items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {items.map((it, i) => {
                const v = verdict?.perItem.find((p) => p.index === i);
                const lens = en ? it.creatorLensEn ?? it.creatorLens : it.creatorLens;
                return (
                  <article key={it.url} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3 text-xs text-slate-500">
                      <span>
                        #{i + 1} · <SourceName name={it.departmentName} /> · {shortDate(it.listPublishedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(it)}
                        className="-m-1 rounded p-1 text-slate-400 transition hover:text-slate-700"
                        aria-label={L("移出对比", "Remove from comparison")}
                        title={L("移出对比", "Remove from comparison")}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <Link
                      href={`/items/${encodeURIComponent(it.sourceId)}?url=${encodeURIComponent(it.url)}`}
                      prefetch={false}
                      className="mt-2 text-[15px] font-medium leading-snug text-slate-900 underline-offset-4 hover:underline"
                    >
                      {it.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ImportanceBadge level={it.importanceLevel} keywordScore={it.keywordScore} className="text-xs" />
                      {v && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_TEXT[v.action].cls}`}>
                          {ACTION_TEXT[v.action][lang]}
                        </span>
                      )}
                    </div>
                    {v?.reason && <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.reason}</p>}
                    {lens && <p className="mt-3 border-t border-slate-100 pt-3 font-serif text-[15px] leading-snug text-[var(--brand)]">{lens}</p>}
                  </article>
                );
              })}
            </section>

            {/* 一览表 */}
            <section>
              <h2 className="text-lg text-slate-900">{L("一览", "At a glance")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {L("✓ 表示原文里提到了，不代表判断；截止一行有日期时显示日期。", "✓ means the source mentions it. It is not a judgement. The deadline row shows the date when one is known.")}
              </p>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="w-44 px-4 py-2.5 font-medium" scope="col"><span className="sr-only">{L("项目", "Field")}</span></th>
                      {items.map((_, i) => (
                        <th key={i} className="px-4 py-2.5 font-medium" scope="col">#{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <Row label={L("来源", "Source")}>
                      {items.map((it, i) => <td key={i} className="px-4 py-2.5"><SourceName name={it.departmentName} /></td>)}
                    </Row>
                    <Row label={L("发布", "Published")}>
                      {items.map((it, i) => <td key={i} className="px-4 py-2.5 tabular-nums">{shortDate(it.listPublishedAt)}</td>)}
                    </Row>
                    <Row label={L("信号类型", "Signal type")}>
                      {items.map((it, i) => {
                        const cats = (it.categories ?? []).filter((c) => getCategoryGroup(c.category) === "signal").map((c) => categoryDisplayLabel(c.category, lang));
                        return <td key={i} className="px-4 py-2.5 text-slate-700">{cats.length ? [...new Set(cats)].join(en ? ", " : "、") : "—"}</td>;
                      })}
                    </Row>
                    {CREATOR_SIGNAL_KEYS.map((key) => (
                      <Row key={key} label={creatorSignalLabel(key, lang)}>
                        {signals.map((s, i) => (
                          <td key={i} className={`px-4 py-2.5 tabular-nums ${s[key] ? "font-medium text-[var(--brand)]" : "text-slate-300"}`}>
                            {key === "deadline" && items[i].deadlineDate ? shortDate(items[i].deadlineDate) : s[key] ? "✓" : "—"}
                          </td>
                        ))}
                      </Row>
                    ))}
                    <Row label={L("关键词", "Keywords")}>
                      {items.map((it, i) => {
                        const own = [...kwSets[i]].filter((k) => !sharedKw.includes(k));
                        return (
                          <td key={i} className="px-4 py-2.5 text-xs leading-relaxed text-slate-600">
                            {sharedKw.length > 0 && <span className="text-slate-900">{sharedKw.join(", ")}</span>}
                            {sharedKw.length > 0 && own.length > 0 && <span className="text-slate-300"> · </span>}
                            {own.slice(0, 6).join(", ") || (sharedKw.length ? "" : "—")}
                          </td>
                        );
                      })}
                    </Row>
                  </tbody>
                </table>
              </div>
              {sharedKw.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">{L("关键词一行里，黑色的是几条共同命中的。", "In the keyword row, the dark words are shared by every item.")}</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-2.5 text-xs font-medium text-slate-500">{label}</th>
      {children}
    </tr>
  );
}
