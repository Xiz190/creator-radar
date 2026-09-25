import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * 中国文化传媒网（ccdy.cn）列表抓取器
 *
 * ccdy 是 Vue SPA，内容走 zcy.ccmapp.cn 的公开 JSON API（无需登录）：
 *   POST https://zcy.ccmapp.cn/gateway/terminal/pullInfoStream?token=<token>
 *     Body: { clientType, columnId, terminalId, currentPage, pageSize }
 *
 * 关键参数：
 *   token      = 6114bcf2fcd67fd0047e116e（固定公开）
 *   clientType = "api"
 *   terminalId = "fsxMu5SDg5H3g6nZ2qfTUuxFHXkSj5j1"（固定，实测多次有效）
 *   columnId   = 栏目 id（来自 URL，如 col1717747504046 时政要闻）
 *
 * 返回字段：title / source / publictime / desc / id / coverimage
 */

const CCDY_API =
  "https://zcy.ccmapp.cn/gateway/terminal/pullInfoStream?token=6114bcf2fcd67fd0047e116e";
const CCDY_CLIENT_TYPE = "api";
const CCDY_TERMINAL_ID = "fsxMu5SDg5H3g6nZ2qfTUuxFHXkSj5j1";

type CcdyNewsItem = {
  id?: string;
  title?: string | null;
  source?: string | null;
  publictime?: string | null;
  desc?: string | null;
  h5url?: string | null;
  levelUrl?: string | null;
};

function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const cn = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cn) return `${cn[1]}-${String(cn[2]).padStart(2, "0")}-${String(cn[3]).padStart(2, "0")}`;
  return null;
}

export async function fetchCcdyColumnLatest(
  columnId: string,
  limit: number,
): Promise<MonitorListItem[]> {
  const pageSize = Math.min(50, Math.max(5, limit));
  const response = await fetch(CCDY_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 SOLO monitor",
    },
    body: JSON.stringify({
      clientType: CCDY_CLIENT_TYPE,
      columnId,
      terminalId: CCDY_TERMINAL_ID,
      currentPage: 1,
      pageSize,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`ccdy 抓取失败: ${response.status}`);
  }

  const json = (await response.json()) as {
    code?: number | string;
    data?: { list?: CcdyNewsItem[] } | null;
  };
  if (String(json.code) !== "200" || !json.data?.list) {
    return [];
  }

  const items: MonitorListItem[] = [];
  for (const it of json.data.list) {
    const title = (it.title || "").trim();
    const date = normalizeDate(it.publictime);
    if (!title || !date) continue;

    // 详情 URL：优先 h5url / levelUrl，否则用 id 构造
    const url = it.h5url?.trim() || it.levelUrl?.trim() || `https://www.ccdy.cn/news/${it.id}`;
    if (items.some((x) => x.url === url)) continue;

    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }
  return items;
}
