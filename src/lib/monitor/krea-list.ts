import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * Krea 官方博客（krea.ai/blog）列表抓取器
 *
 * Krea 博客是服务端渲染（Astro）的静态 HTML，每篇文章是一张卡片：
 *   <a href="/blog/<slug>" class="post-card ..." data-category="guides">
 *     <div><img alt="..."></div>
 *     <div class="p-4">
 *       <span> guides </span>
 *       <h2 ...> 标题 </h2>
 *       <p ...> 摘要 </p>
 *       <time datetime="2026-06-23T15:00:00.000Z"> Jun 23, 2026 </time>
 *     </div>
 *   </a>
 *
 * 用法：runner.ts 注册 type = "krea"，listUrl 填 https://www.krea.ai/blog
 * 面向「独立创作者 AI 情报台」的视觉/视频 AI 层——Krea 的内容覆盖
 * 图像/视频生成的 prompt 技法、画风、模型更新（对应「做 MV / 画风 / 转场」视角）。
 * data-category="research" 多为模型/工具更新，"guides" 为 prompt 技法。
 */

// 解码列表里出现的少量 HTML 实体（标题里的 & ' 等）
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

export async function fetchKreaBlog(listUrl: string, limit: number): Promise<MonitorListItem[]> {
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
    throw new Error(`krea 博客抓取失败: ${response.status}`);
  }

  const html = await response.text();
  const base = new URL(listUrl);

  // 每张文章卡片是一个 post-card 锚点（非贪婪匹配到该锚点的 </a>）
  const cardPattern = /<a[^>]*href="(\/blog\/[a-z0-9-]+)"[^>]*class="post-card[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

  const items: MonitorListItem[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = cardPattern.exec(html)) !== null) {
    const path = m[1];
    const block = m[2];

    const url = new URL(path, base).toString();
    if (seen.has(url)) continue;

    const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h2
      ? decodeEntities(h2[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      : "";

    // <time datetime="2026-06-23T15:00:00.000Z"> —— 取 ISO 的日期部分
    const dt = block.match(/<time[^>]*datetime="([^"]+)"/i);
    const date = dt ? dt[1].slice(0, 10) : "";

    if (!title || !date) continue;

    seen.add(url);
    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }

  return items;
}
