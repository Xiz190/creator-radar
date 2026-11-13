// 创作者版对比：几条内容放在一起，回答"哪条值得我动手、哪条留意、哪条可以跳过"。
// 规则版（不调用 AI）给访客和 AI 失败时兜底；AI 版的提示词也在这里，两者输出同一个结构。
import { detectCreatorSignals, CREATOR_SIGNAL_KEYS, creatorSignalLabel, type CreatorSignals } from "./creator-signals";

export type Lang = "zh" | "en";

export type CompareInput = {
  title: string;
  summary?: string | null;
  content?: string | null;
  department?: string | null;
  publishedAt?: string | null;
  deadlineDate?: string | null;
  lens?: string | null;
  keywords?: string[];
};

export type CompareAction = "act" | "watch" | "skip";

export type CreatorComparison = {
  overallSummary: string;
  similarities: string[];
  differences: string[];
  perItem: Array<{ index: number; action: CompareAction; reason: string }>;
  keyFindings: string;
};

const ACTION_ORDER: Record<CompareAction, number> = { act: 0, watch: 1, skip: 2 };

function itemRef(i: number, lang: Lang): string {
  return lang === "en" ? `#${i + 1}` : `第 ${i + 1} 条`;
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:，。；：、]+$/, "") + "…";
}

function listRefs(idx: number[], lang: Lang): string {
  return idx.map((i) => itemRef(i, lang)).join(lang === "en" ? ", " : "、");
}

function decideAction(s: CreatorSignals, lang: Lang): { action: CompareAction; reason: string } {
  const zh = lang === "zh";
  if (s.opportunity || s.deadline) {
    return {
      action: "act",
      reason: zh ? "提到比赛、资助或截止日期：先确认资格和截止时间。" : "Mentions a contest, grant or deadline. Check eligibility and the closing date first.",
    };
  }
  if (s.newFeature) {
    return {
      action: "act",
      reason: zh ? "有新功能或新版本：下次做东西时可以拿一小段试试。" : "A new feature or version. Try it on a short piece next time you make something.",
    };
  }
  if (s.pricing || s.copyright) {
    const what = [s.pricing && (zh ? "定价" : "pricing"), s.copyright && (zh ? "版权/授权" : "copyright or licensing")].filter(Boolean).join(zh ? "和" : " and ");
    return {
      action: "watch",
      reason: zh ? `涉及${what}：先留意，等影响到你用的工具或发行时再处理。` : `Touches on ${what}. Keep an eye on it until it affects a tool you use or how you release.`,
    };
  }
  return {
    action: "skip",
    reason: zh ? "没提到新功能、定价、机会或版权，当背景了解即可。" : "No new feature, pricing, opportunity or copyright angle. Background reading.",
  };
}

function daysBetween(a: string, b: string): number | null {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round(Math.abs(ta - tb) / 86_400_000);
}

export function generateRuleBasedComparison(items: CompareInput[], lang: Lang = "zh"): CreatorComparison {
  const zh = lang === "zh";
  const n = items.length;
  const signals = items.map((it) =>
    detectCreatorSignals({ title: it.title, summary: it.summary, content: it.content, deadlineDate: it.deadlineDate }),
  );

  const similarities: string[] = [];
  const differences: string[] = [];

  // 信号：全有 → 共同点；部分有 → 差异点
  for (const key of CREATOR_SIGNAL_KEYS) {
    const hit = signals.map((s, i) => (s[key] ? i : -1)).filter((i) => i >= 0);
    const label = creatorSignalLabel(key, lang);
    if (hit.length === n) similarities.push(zh ? `都提到了「${label}」。` : `All of them mention: ${label.toLowerCase()}.`);
    else if (hit.length > 0) differences.push(zh ? `只有${listRefs(hit, lang)}提到「${label}」。` : `Only ${listRefs(hit, lang)} ${hit.length === 1 ? "mentions" : "mention"} ${label.toLowerCase()}.`);
  }

  // 来源
  const sources = [...new Set(items.map((it) => (it.department || "").trim()).filter(Boolean))];
  if (sources.length === 1 && n > 1) similarities.push(zh ? `都来自 ${sources[0]}。` : `All from ${sources[0]}.`);
  else if (sources.length > 1) differences.push(zh ? `来自 ${sources.length} 个不同来源：${sources.join("、")}。` : `From ${sources.length} different sources: ${sources.join(", ")}.`);

  // 关键词
  const kwSets = items.map((it) => new Set((it.keywords ?? []).map((k) => k.toLowerCase())));
  if (kwSets.every((s) => s.size > 0)) {
    const shared = [...kwSets[0]].filter((k) => kwSets.every((s) => s.has(k)));
    if (shared.length > 0) similarities.push(zh ? `共同命中的关键词：${shared.slice(0, 5).join("、")}。` : `Shared keywords: ${shared.slice(0, 5).join(", ")}.`);
  }

  // 时间
  const dates = items.map((it) => it.publishedAt).filter((d): d is string => !!d);
  if (dates.length >= 2) {
    const sorted = [...dates].sort();
    const span = daysBetween(sorted[0], sorted[sorted.length - 1]);
    if (span !== null && span > 0) differences.push(zh ? `发布时间前后相差 ${span} 天。` : `Published ${span} days apart.`);
  }

  if (similarities.length === 0) similarities.push(zh ? "这几条没有共同的信号、来源或关键词。" : "They share no signal, source or keyword.");
  if (differences.length === 0) differences.push(zh ? "按规则看不出明显差别，需要读原文判断。" : "The rules find no clear difference. Read the originals to judge.");

  const perItem = signals.map((s, index) => ({ index, ...decideAction(s, lang) }));
  const count = (a: CompareAction) => perItem.filter((p) => p.action === a).length;
  const first = [...perItem].sort((a, b) => ACTION_ORDER[a.action] - ACTION_ORDER[b.action] || a.index - b.index)[0];

  const overallSummary = zh
    ? `${n} 条里，${count("act")} 条可以动手，${count("watch")} 条值得留意，${count("skip")} 条可以跳过。` +
      (first && first.action !== "skip" ? `先看${itemRef(first.index, lang)}「${clip(items[first.index].title, 40)}」。` : "")
    : `Of ${n} items, ${count("act")} are worth acting on, ${count("watch")} worth watching, ${count("skip")} skippable.` +
      (first && first.action !== "skip" ? ` Start with ${itemRef(first.index, lang)}: "${clip(items[first.index].title, 80)}"` : "");

  return {
    overallSummary,
    similarities: similarities.slice(0, 6),
    differences: differences.slice(0, 6),
    perItem,
    keyFindings: zh
      ? "以上由关键词规则生成，只说明原文里提到了什么；要不要做、怎么做，由你判断。"
      : "Generated from keyword rules. It only says what each source mentions; whether to act is your call.",
  };
}

export function buildComparePrompts(items: CompareInput[], lang: Lang): { system: string; user: string } {
  const zh = lang === "zh";
  const system = zh
    ? `你在帮一位独立音乐创作者（自己编曲、唱歌、做 MV，也用 AI 工具）比较几条行业动态。
只根据给出的内容判断，不要编造。回答这几个问题：
1. 这几条有什么共同点、有什么不同（工具、定价、授权/版权、机会、截止时间）？
2. 对创作者的工作流各有什么实际影响？
3. 每一条：act（值得动手试或去申请）、watch（先留意）、skip（可以跳过），并给一句理由。
只输出 JSON，字段：
- overallSummary：总体结论，120 字以内
- similarities：共同点数组，3–5 条，每条 60 字以内
- differences：不同点数组，3–5 条，每条 60 字以内
- perItem：数组，每项 { index（从 0 开始）, action: "act"|"watch"|"skip", reason（40 字以内）}
- keyFindings：给创作者的一句建议，80 字以内
全部用简体中文。`
    : `You are helping an independent music creator (who arranges, sings, makes music videos and uses AI tools) compare a few industry items.
Judge only from the text given; do not invent facts. Answer:
1. What do these items share, and how do they differ (tools, pricing, licensing/copyright, opportunities, deadlines)?
2. What does each change in practice for a creator's workflow?
3. For each item: act (worth trying or applying), watch (keep an eye on it) or skip, with a one-line reason.
Output JSON only, with fields:
- overallSummary: overall verdict, under 60 words
- similarities: 3–5 short strings
- differences: 3–5 short strings
- perItem: array of { index (0-based), action: "act"|"watch"|"skip", reason (under 25 words) }
- keyFindings: one piece of advice for the creator, under 40 words
Write everything in plain English.`;

  const user = items
    .map((it, i) => {
      const body = (it.summary && it.summary.trim() ? it.summary : it.content || "").slice(0, 600);
      return zh
        ? `【第 ${i + 1} 条，index=${i}】\n标题：${it.title}\n来源：${it.department || "未知"}\n发布：${it.publishedAt || "未知"}${it.deadlineDate ? `\n截止：${it.deadlineDate}` : ""}${it.lens ? `\n已有的创作者视角：${it.lens}` : ""}\n正文节选：${body}`
        : `[Item ${i + 1}, index=${i}]\nTitle: ${it.title}\nSource: ${it.department || "unknown"}\nPublished: ${it.publishedAt || "unknown"}${it.deadlineDate ? `\nDeadline: ${it.deadlineDate}` : ""}${it.lens ? `\nExisting creator lens: ${it.lens}` : ""}\nExcerpt: ${body}`;
    })
    .join("\n\n");
  return { system, user };
}

/** 校验并清洗 AI 返回的 JSON；结构不对就返回 null，由调用方退回规则版 */
export function parseAiComparison(text: string, n: number): CreatorComparison | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 6) : []);
  if (typeof r.overallSummary !== "string") return null;
  const perItem = Array.isArray(r.perItem)
    ? (r.perItem as Array<Record<string, unknown>>)
        .filter((p) => typeof p.index === "number" && p.index >= 0 && p.index < n && ["act", "watch", "skip"].includes(String(p.action)))
        .map((p) => ({ index: p.index as number, action: p.action as CompareAction, reason: String(p.reason ?? "") }))
    : [];
  return {
    overallSummary: r.overallSummary,
    similarities: strArr(r.similarities),
    differences: strArr(r.differences),
    perItem,
    keyFindings: typeof r.keyFindings === "string" ? r.keyFindings : "",
  };
}
