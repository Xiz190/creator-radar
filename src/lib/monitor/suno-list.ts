import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * Suno 官方博客（suno.com/blog）列表抓取器
 *
 * Suno 博客无 RSS，但列表页是服务端渲染的 HTML，每篇文章是一张卡片：
 *   <a class="group flex flex-col gap-0" href="/blog/<slug>">
 *     ...<h2 ...>标题</h2>
 *     <p ...><span>By 作者</span><span>·</span><span>Mar 26, 2026</span></p>...
 *   </a>
 *
 * 用法：runner.ts 注册 type = "suno"，listUrl 填 https://suno.com/blog
 * 内容为英文（AI 音乐工具更新 / 版本发布 / 政策变化），面向音乐人情报台的
 * "AI工具更新" 信号层。
 */

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

// 把 "Mar 26, 2026" / "Aug 5, 2026" 归一化为 YYYY-MM-DD
function normalizeEnglishDate(block: string): string | null {
  const m = block.match(
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

// 解码列表里出现的少量 HTML 实体（标题里的 ' & 等）
function decodeEntities(text: string): string {
  return text
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export async function fetchSunoBlog(listUrl: string, limit: number): Promise<MonitorListItem[]> {
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
    throw new Error(`suno 博客抓取失败: ${response.status}`);
  }

  const html = await response.text();
  const base = new URL(listUrl);

  // 只认博客卡片锚点（class 以 "group flex flex-col" 开头），排除首图 hero / 分页 / 导航
  const cardPattern =
    /<a class="group flex flex-col[^"]*"\s+href="(\/blog\/[a-z0-9-]+)"([\s\S]*?)<\/a>/gi;

  const items: MonitorListItem[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = cardPattern.exec(html)) !== null) {
    const path = m[1];
    const block = m[2];
    const slug = path.replace("/blog/", "");
    if (slug.startsWith("page-") || slug === "opengraph-image") continue;

    const url = new URL(path, base).toString();
    if (seen.has(url)) continue;

    const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h2
      ? decodeEntities(h2[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      : "";
    const date = normalizeEnglishDate(block);

    // 标题或日期缺失的卡片跳过（保证入库数据干净）
    if (!title || !date) continue;

    seen.add(url);
    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }

  return items;
}
