import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * Suno 官方博客（suno.com/blog）列表抓取器
 *
 * Suno 博客无 RSS，但列表页是服务端渲染的 HTML，每篇文章是一个 <article>：
 *   <article ...>
 *     <a class="group flex flex-col" href="/blog/<slug>">...<h3>标题</h3></a>
 *     <div><p>...<time dateTime="2026-10-01T20:35:00.000Z">Oct 1, 2026</time></p></div>
 *   </article>
 * 顶部 Featured 那篇同样是 <article>，标题在 <h2> 里。
 *
 * 2026-11 改版前标题是 <h2>、日期是 <a> 里的纯文本；改版后旧正则一张都匹配不上，
 * 却不报错（卡片被当成"不完整"跳过），日志里长期显示"扫描 0"。所以现在按整个
 * <article> 解析、h2/h3 都认、日期优先读 dateTime，并在页面有文章却一条没解析出来时抛错。
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
  const items = parseSunoBlogList(html, listUrl, limit);

  // 页面上有文章链接却一条都没解析出来 = 页面结构又变了，报错让抓取日志能看出来
  if (items.length === 0 && /href="\/blog\/[a-z0-9-]+"/i.test(html)) {
    throw new Error("suno 博客页面结构可能已变化：有文章链接但未解析出任何条目");
  }

  return items;
}

// 从 <article> 块里取 ISO 日期：优先 <time dateTime>，否则退回英文日期文本
function extractDate(block: string): string | null {
  const iso = block.match(/<time[^>]*dateTime="(\d{4}-\d{2}-\d{2})/i);
  if (iso) return iso[1];
  return normalizeEnglishDate(block.replace(/<[^>]+>/g, " "));
}

export function parseSunoBlogList(html: string, listUrl: string, limit: number): MonitorListItem[] {
  const base = new URL(listUrl);
  const articlePattern = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;

  const items: MonitorListItem[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = articlePattern.exec(html)) !== null) {
    const block = m[1];

    // 文章链接：排除分类 / 分页 / 全部列表等非文章路径
    const hrefs = [...block.matchAll(/href="(\/blog\/[a-z0-9-]+)"/gi)].map((h) => h[1]);
    const path = hrefs.find((h) => {
      const slug = h.replace("/blog/", "");
      return !slug.startsWith("page-") && slug !== "opengraph-image" && slug !== "all";
    });
    if (!path) continue;

    const url = new URL(path, base).toString();
    if (seen.has(url)) continue;

    const heading = block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
    const title = heading
      ? decodeEntities(heading[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      : "";
    const date = extractDate(block);

    // 标题或日期缺失的卡片跳过（保证入库数据干净）
    if (!title || !date) continue;

    seen.add(url);
    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }

  return items;
}
