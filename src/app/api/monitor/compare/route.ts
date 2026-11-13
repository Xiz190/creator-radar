import { NextResponse } from "next/server";
import {
  ensureMonitorSchema,
  getItemDetailBySourceAndUrl,
} from "@/lib/monitor/db";
import { callLlm } from "@/lib/ai/content-analyzer";
import { isDbAvailable } from "@/lib/db";
import { sourceNameFor } from "@/lib/source-names";
import {
  buildComparePrompts,
  generateRuleBasedComparison,
  parseAiComparison,
  type CompareInput,
  type Lang,
} from "@/lib/monitor/creator-compare";

export const dynamic = "force-dynamic";

export const MAX_COMPARE_ITEMS = 5;

export function parseItemsParam(itemsStr: string): Array<{ sourceId: string; url: string }> {
  const result: Array<{ sourceId: string; url: string }> = [];
  for (const part of itemsStr.split("|")) {
    if (!part) continue;
    const idx = part.indexOf("::");
    if (idx > 0) {
      const sourceId = part.slice(0, idx);
      const url = part.slice(idx + 2);
      if (sourceId && url) result.push({ sourceId, url });
    }
  }
  return result.slice(0, MAX_COMPARE_ITEMS);
}

function langOf(v: unknown): Lang {
  return v === "en" ? "en" : "zh";
}

// GET：取几条详情，并直接附上规则版对比（不调用 AI，访客也能看）
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = langOf(url.searchParams.get("lang"));
  if (!isDbAvailable()) {
    return NextResponse.json({ ok: false, code: "no-db" }, { status: 503 });
  }
  await ensureMonitorSchema();

  const items = parseItemsParam(url.searchParams.get("items") ?? "");
  if (items.length < 2) {
    return NextResponse.json({ ok: false, code: "too-few" }, { status: 400 });
  }

  const details = (await Promise.all(items.map((it) => getItemDetailBySourceAndUrl(it.sourceId, it.url)))).filter(
    (d): d is NonNullable<typeof d> => Boolean(d),
  );
  if (details.length < 2) {
    return NextResponse.json({ ok: false, code: "missing", found: details.length }, { status: 404 });
  }

  const inputs: CompareInput[] = details.map((d) => ({
    title: d.title,
    summary: d.summary,
    department: sourceNameFor(d.departmentName, lang),
    publishedAt: d.listPublishedAt,
    deadlineDate: d.deadlineDate,
    lens: lang === "en" ? d.creatorLensEn ?? d.creatorLens : d.creatorLens,
    keywords: (d.matchedKeywords ?? []).map((k) => k.keyword),
  }));

  return NextResponse.json({
    ok: true,
    items: details,
    missing: items.length - details.length,
    rule: generateRuleBasedComparison(inputs, lang),
  });
}

// POST：AI 对比（公开站上只有作者能调用；访客由 proxy 挡掉）。AI 不可用或返回格式不对时退回规则版。
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: CompareInput[]; lang?: string };
    const lang = langOf(body.lang);
    const items = (body.items ?? []).slice(0, MAX_COMPARE_ITEMS);
    if (items.length < 2) {
      return NextResponse.json({ ok: false, code: "too-few" }, { status: 400 });
    }

    let source: "llm" | "rule" = "rule";
    let result = null;
    try {
      const { system, user } = buildComparePrompts(items, lang);
      const text = await callLlm(system, user, { maxTokens: 1500, timeoutMs: 60_000 });
      result = parseAiComparison(text, items.length);
      if (result) source = "llm";
    } catch (error) {
      console.warn("[Compare API] AI 对比失败，改用规则版:", (error as Error).message);
    }

    return NextResponse.json({ ok: true, source, result: result ?? generateRuleBasedComparison(items, lang) });
  } catch (error) {
    console.error("[Compare API] 对比出错:", error);
    return NextResponse.json({ ok: false, code: "error" }, { status: 500 });
  }
}
