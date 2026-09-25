import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * Runway（runwayml.com）新闻抓取器 —— 走 sitemap.xml
 *
 * Runway 的 /news 列表页是 RSC 流式渲染、无 RSS、无可解析的 JSON 数据块，
 * 但 sitemap.xml 里带全部 /news/<slug> 的 loc + lastmod 日期，足以做监测。
 * 标题 sitemap 里没有，用 slug 转可读标题（详情抓取会补真实页面标题）。
 *
 * 用法：runner.ts 注册 type = "runway_sitemap"，listUrl = https://runwayml.com/sitemap.xml
 */

// /news/ 下的分类/栏目页（非文章），排除
const CATEGORY_SLUGS = new Set([
  "customers", "research", "publications", "company", "product",
  "safety", "engineering", "developers", "company-news", "careers", "news",
]);

// 少数常见缩写，让 slug 标题好看点
const ACRONYMS: Record<string, string> = {
  hq: "HQ", ai: "AI", api: "API", nyu: "NYU", hd: "HD", gwm: "GWM", us: "US",
};

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => ACRONYMS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchRunwaySitemap(listUrl: string, limit: number): Promise<MonitorListItem[]> {
  const response = await fetch(listUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept": "application/xml,text/xml,*/*",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`runway sitemap 抓取失败: ${response.status}`);
  }

  const xml = await response.text();
  const base = new URL(listUrl);

  const entries = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]*)<\/lastmod>)?/gi)];

  const items: MonitorListItem[] = [];
  const seen = new Set<string>();

  for (const m of entries) {
    const loc = m[1].trim();
    const lastmod = (m[2] || "").trim();
    if (!loc.includes("/news/")) continue;

    const slug = loc.replace(/\/+$/, "").split("/news/")[1] ?? "";
    // 排除多级路径与分类页
    if (!slug || slug.includes("/") || CATEGORY_SLUGS.has(slug)) continue;

    const date = lastmod.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    let url: string;
    try {
      url = new URL(loc, base).toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);

    items.push({ title: slugToTitle(slug), url, listPublishedAt: date });
  }

  // 按日期倒序，取最新 limit 条
  items.sort((a, b) => (b.listPublishedAt ?? "").localeCompare(a.listPublishedAt ?? ""));
  return items.slice(0, limit);
}
