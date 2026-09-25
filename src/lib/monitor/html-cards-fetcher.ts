import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * 通用「卡片式博客」列表抓取器
 *
 * 适用于服务端渲染、每篇文章是一张卡片的现代博客（Next.js / RSC 等），
 * 卡片结构各家不同，用多重回退提取标题与日期：
 *   标题：<h1-4> → 链接文字 → <img alt>
 *   日期：<time datetime="YYYY-MM-DD"> → 可见英文/ISO 日期
 *
 * 已验证可用：ElevenLabs（elevenlabs.io/blog）、Pika（pika.art/blog）。
 * 用法：runner.ts 注册 type = "html_cards"，listUrl 填博客列表页。
 * 自动识别同域 /blog|/news|/posts|/p/<slug> 链接。
 */

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function normalizeDate(block: string): string | null {
  // 1) <time datetime="2026-07-07T..."> 最可靠
  let m = block.match(/datetime="(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // 2) 英文可见日期 "Jul 7, 2026" / "August 18, 2026"
  m = block.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/,
  );
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3)];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
  }
  // 3) 裸 ISO
  m = block.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function stripTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function fetchHtmlCards(listUrl: string, limit: number): Promise<MonitorListItem[]> {
  const response = await fetch(listUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,*/*;q=0.9",
      "accept-language": "en-US,en;q=0.9",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`html_cards 抓取失败: ${response.status}`);
  }

  const html = await response.text();
  const base = new URL(listUrl);

  // 收集所有文章链接位置（同域 /blog|/news|/posts|/p/<slug>，排除 /tags/ /category）
  const hrefRe = /href="(\/(?:blog|news|posts|p|article)\/[a-z0-9][a-z0-9\-]+)"/gi;
  const hits: Array<{ pos: number; path: string }> = [];
  let hm: RegExpExecArray | null;
  while ((hm = hrefRe.exec(html)) !== null) {
    const p = hm[1];
    if (p.includes("/tags/") || p.includes("/category")) continue;
    hits.push({ pos: hm.index, path: p });
  }

  const items: MonitorListItem[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < hits.length; i++) {
    const { pos, path } = hits[i];
    if (seen.has(path)) continue;
    seen.add(path);

    // 卡片块：从链接前一点到下一个文章链接（或 +1400 上限）
    const nextPos = i + 1 < hits.length ? hits[i + 1].pos : pos + 1400;
    const block = html.slice(Math.max(0, pos - 250), Math.min(nextPos, pos + 1400));

    // 标题回退：h标签 → 链接文字 → img alt
    let title = "";
    const h = block.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
    if (h) title = stripTags(h[1]);
    if (title.length < 6) {
      const a = block.match(new RegExp(`href="${escapeRegExp(path)}"[^>]*>([^<]{6,160})</a>`, "i"));
      if (a) title = stripTags(a[1]);
    }
    if (title.length < 6) {
      const alt = block.match(/<img[^>]+alt="([^"]{6,160})"/i);
      if (alt) title = stripTags(alt[1]);
    }

    const date = normalizeDate(block);

    // 标题或日期缺失 → 跳过，保证入库干净
    if (title.length < 6 || title.length > 200 || !date) continue;

    let url: string;
    try {
      url = new URL(path, base).toString();
    } catch {
      continue;
    }

    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }

  return items;
}
