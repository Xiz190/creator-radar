import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * Luma AI（lumalabs.ai/news）列表抓取器
 *
 * Luma 的 /news 是服务端渲染的静态 HTML，每张卡片结构固定：
 *   <span class="typo-body-s text-secondary">Aug 19, 2026</span></div>
 *   <h3 class="typo-h4"><a class="card-link" href="/news/<slug>">标题</a></h3>
 *
 * 用法：runner.ts 注册 type = "luma"，listUrl 填 https://lumalabs.ai/news
 * 面向「独立创作者 AI 情报台」的视频 AI 层——Luma（Dream Machine）内容大量
 * 聚焦运镜 / image-to-video / 分镜 prompt，正对「做 MV / 转场 / 镜头配歌」视角。
 */

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

// "Aug 19, 2026" → "2026-08-19"
function normalizeEnglishDate(raw: string): string | null {
  const m = raw.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/,
  );
  if (!m) return null;
  const mo = MONTHS[m[1].slice(0, 3)];
  if (!mo) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (day < 1 || day > 31) return null;
  return `${year}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function fetchLumaNews(listUrl: string, limit: number): Promise<MonitorListItem[]> {
  const response = await fetch(listUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,*/*;q=0.9",
      "accept-language": "en-US,en;q=0.9",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(40000),
  });

  if (!response.ok) {
    throw new Error(`luma 新闻抓取失败: ${response.status}`);
  }

  const html = await response.text();
  const base = new URL(listUrl);

  // 卡片内日期与标题顺序固定：text-secondary">日期</span> ... <a class="card-link" href="/news/slug">标题</a>
  const cardPattern =
    /text-secondary">([^<]+)<\/span><\/div><h3[^>]*><a class="card-link" href="(\/news\/[a-z0-9-]+)">([\s\S]*?)<\/a>/gi;

  const items: MonitorListItem[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = cardPattern.exec(html)) !== null) {
    const date = normalizeEnglishDate(m[1]);
    const path = m[2];
    const rawTitle = m[3];

    const url = new URL(path, base).toString();
    if (seen.has(url)) continue;

    const title = decodeEntities(rawTitle.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());

    if (!title || !date) continue;

    seen.add(url);
    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }

  return items;
}
