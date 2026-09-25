import type { MonitorListItem } from "@/lib/monitor/types";

/**
 * 中国演出行业协会（CAPA）列表抓取器
 *
 * CAPA 是 Vue SPA，但数据走公开 JSON API（无需登录）：
 *   POST https://capa.com.cn/api/perform/news/list
 *     Body: { dictId: "<栏目id>", pageNum: 1, pageSize: n }
 *
 * 常用栏目（dictId）：
 *   1552487425756987393  通知公告（演出征集、起草征集、机会公告）
 *   17                   音乐人才扶持（创作机会核心）
 *   1552554113475035137  政策文件
 *
 * 返回字段：title / releaseTime / source / fileUrl（详情附件或详情页）
 */

const CAPA_API = "https://capa.com.cn/api/perform/news/list";

type CapaNewsItem = {
  id: string;
  title?: string | null;
  releaseTime?: string | null;
  fileUrl?: string | null;
  url?: string | null;
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

export async function fetchCapaLatest(
  dictId: string,
  limit: number,
): Promise<MonitorListItem[]> {
  const pageSize = Math.min(50, Math.max(5, limit));
  const response = await fetch(CAPA_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 SOLO monitor",
    },
    body: JSON.stringify({ dictId, pageNum: 1, pageSize }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`CAPA 抓取失败: ${response.status}`);
  }

  const json = (await response.json()) as {
    code?: number;
    data?: { list?: CapaNewsItem[] } | null;
  };
  if (json.code !== 200 || !json.data?.list) {
    return [];
  }

  const items: MonitorListItem[] = [];
  for (const it of json.data.list) {
    const title = (it.title || "").trim();
    const date = normalizeDate(it.releaseTime);
    if (!title || !date) continue;

    // 详情 URL：优先附件/PDF，其次原站外链（公众号等），最后用 id 构造站内标识（去重用）
    const url = it.fileUrl?.trim() || it.url?.trim() || `https://capa.com.cn/news/${it.id}`;
    if (items.some((x) => x.url === url)) continue;

    items.push({ title, url, listPublishedAt: date });
    if (items.length >= limit) break;
  }
  return items;
}
