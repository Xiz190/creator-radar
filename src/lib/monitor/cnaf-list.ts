import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * 国家艺术基金（cnaf.cn）机会/公告抓取器
 *
 * 静态 HTML 站。首页汇总了各栏目的带日期公告：
 *   /guide_detail/<id>.html        申报指南（★真机会：如"2027年度舞台艺术创作资助项目申报指南"）
 *   /work_notice_detail/<id>.html  工作通知
 *   /fund_work_detail/<id>.html    工作动态
 *   /news_detail/<id>.html         新闻
 * 每条形如 <a href="/xxx_detail/N.html">标题</a> ... 2026.08.20
 *
 * 用法：runner.ts 注册 type = "cnaf"，listUrl = https://www.cnaf.cn
 * 面向音乐人情报台的"创作机会/申报征集"信号（艺术泛领域，音乐项目可申报）。
 */

// 只取机会/公告/动态类，排除常青政策（章程/办法）
const DETAIL_CATS = "(?:guide_detail|work_notice_detail|fund_work_detail|news_detail)";

function normalizeDate(raw: string): string | null {
  const m = raw.match(/(20\d\d)[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
}

export async function fetchCnafLatest(listUrl: string, limit: number): Promise<MonitorListItem[]> {
  const response = await fetch(listUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`cnaf 抓取失败: ${response.status}`);
  }

  const html = await response.text();
  const base = new URL(listUrl);

  const re = new RegExp(
    `<a[^>]+href="(/${DETAIL_CATS}/\\d+\\.html)"[^>]*>\\s*([^<]{8,80})\\s*</a>[\\s\\S]{0,120}?(20\\d\\d[-/年.]\\d{1,2}[-/月.]\\d{1,2})`,
    "g",
  );

  const items: MonitorListItem[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    const title = m[2].replace(/\s+/g, " ").trim();
    const date = normalizeDate(m[3]);
    if (!title || !date) continue;

    let url: string;
    try {
      url = new URL(path, base).toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);

    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }

  return items;
}
