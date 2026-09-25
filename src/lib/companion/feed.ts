/**
 * 伴侣版 Feed 屏的数据逻辑。纯函数，便于单测
 * （项目 vitest 无 jsdom，渲染不了组件——同 nav.ts / today.ts / format.ts）。
 */

import { SIGNAL_CATEGORIES, getCategoryStyle } from "@/lib/monitor/content-meta";
import { categoryLabelEn } from "@/lib/companion/labels-en";
import { pickLens } from "@/lib/localized-fields";
import { localDayKey, shortDate, weekdayOf } from "@/lib/companion/format";
import type { ContentItem } from "@/hooks/use-item-list";

/** Feed 顶部的三段。 */
export type FeedView = "all" | "following" | "signals";

/** 筛选 sheet 里的分类档位，对应信号层的 5 个分类（A/B/C/D + 平台政策）。 */
export type FeedCategory = "all" | "tools" | "opportunities" | "deadlines" | "policy";

export interface FeedFilters {
  scope: "all" | "domestic" | "global";
  unreadOnly: boolean;
  keyOnly: boolean;
  category: FeedCategory;
  fromDate?: string;
  toDate?: string;
  sort: "latest" | "relevance" | "first_seen";
}

export const DEFAULT_FILTERS: FeedFilters = {
  scope: "all",
  unreadOnly: false,
  keyOnly: false,
  category: "all",
  sort: "latest",
};

/**
 * 分类档位 → content-meta 里的信号层分类名。
 * 值必须是 SIGNAL_CATEGORIES 里的原样字符串，否则后端筛选命中不了。
 */
const CATEGORY_MAP: Record<Exclude<FeedCategory, "all">, string> = {
  tools: "A·AI工具更新",
  opportunities: "B·创作机会",
  deadlines: "C·申报截止预警",
  policy: "平台政策/版权",
};

/** mockup 的 Sort 三档 → 后端 sort 参数。 */
const SORT_MAP: Record<FeedFilters["sort"], string> = {
  latest: "published_at",
  relevance: "relevance",
  first_seen: "first_seen_at",
};

/** 筛选里"已生效"的项数，用于 Filters 按钮上的角标。 */
export function activeFilterCount(f: FeedFilters): number {
  let n = 0;
  if (f.scope !== "all") n++;
  if (f.unreadOnly) n++;
  if (f.keyOnly) n++;
  if (f.category !== "all") n++;
  if (f.fromDate || f.toDate) n++;
  if (f.sort !== "latest") n++;
  return n;
}

/**
 * 拼 Feed 的请求参数。
 *
 * 关于「关注」：后端只在明确下发 subscribedDepartments/subscribedKeywords 时才按订阅做
 * 硬过滤。这是刻意设计的——桌面端踩过坑：无条件下发会让选中某来源时被"仅匹配标题"的
 * 订阅词二次过滤成 0 条（见 inbox/page.tsx buildParams 里那段注释）。
 * 所以这里也只在 view === "following" 时才下发。
 */
export function buildFeedParams(opts: {
  view: FeedView;
  filters: FeedFilters;
  subscriptions?: { departments: string[]; keywords: string[] };
  /** 搜索词。后端按标题/来源/正文段落匹配。 */
  q?: string;
  limit: number;
  offset: number;
}): URLSearchParams {
  const { view, filters, subscriptions, q, limit, offset } = opts;
  const p = new URLSearchParams();
  p.set("view", "list");
  p.set("limit", String(limit));
  p.set("offset", String(offset));

  const query = (q ?? "").trim();
  if (query) p.set("q", query);

  if (view === "following") {
    const depts = subscriptions?.departments ?? [];
    const kws = subscriptions?.keywords ?? [];
    if (depts.length > 0) p.set("subscribedDepartments", depts.join(","));
    if (kws.length > 0) p.set("subscribedKeywords", kws.join(","));
  }

  // 分类：用户显式选了档位就按档位，否则 Signals 段整体按信号层过滤。
  if (filters.category !== "all") {
    p.set("categories", CATEGORY_MAP[filters.category]);
  } else if (view === "signals") {
    p.set("categories", [...SIGNAL_CATEGORIES].join(","));
  }

  if (filters.scope !== "all") p.set("region", filters.scope);
  if (filters.unreadOnly) p.set("onlyUnread", "1");
  if (filters.keyOnly) p.set("onlyStarred", "1");
  if (filters.fromDate) {
    p.set("fromDate", filters.fromDate);
    p.set("dateField", "list_published_at");
  }
  if (filters.toDate) {
    p.set("toDate", filters.toDate);
    p.set("dateField", "list_published_at");
  }

  // Signals 段的默认排序是 relevance（与桌面 signals 页一致）；用户显式改过就听用户的。
  p.set("sort", view === "signals" && filters.sort === "latest" ? "relevance" : SORT_MAP[filters.sort]);

  return p;
}

/**
 * 该条是否有创作者视角可显示。
 *
 * 伴侣版固定英文，所以按"英文版有没有"判断——缺英文时会回退中文，
 * 仍算有（与 pickLens 同一口径，避免出现"卡片显示有星标、点进去却没内容"）。
 */
export function hasLens(item: ContentItem): boolean {
  return pickLens(item, "en") !== null;
}

/**
 * 行首显示的那个分类：取**信号层**里第一个。
 *
 * 为什么是信号层：mockup 行首写的是 "AI Tool Update" / "Creative Opportunity" /
 * "Deadline Alert" / "Industry Watch"——正是 A/B/C/D 这四类，不是主题层。
 * 主题层（如"AI音乐生成工具"）太细，不适合当行首标签。
 * 分类字段可能存的是旧英文 key（如 signal_exec），所以先经 getCategoryStyle 归一。
 */
/**
 * 只依赖 categories 这一个字段——列表项（ContentItem）与详情（MonitorItemDetail）
 * 都能喂进来，不必为了复用而伪造一个完整对象。
 */
type HasCategories = { categories?: Array<{ category: string; score?: number }> };

export function primaryCategory(item: HasCategories): string {
  for (const c of item.categories ?? []) {
    const label = getCategoryStyle(c.category).label;
    if (SIGNAL_CATEGORIES.has(label)) return label;
  }
  const first = item.categories?.[0];
  return first ? getCategoryStyle(first.category).label : "";
}

/** 行首分类的英文名。没有分类时返回空串（调用方据此不渲染该元素）。 */
export function primaryCategoryLabelEn(item: HasCategories): string {
  const cat = primaryCategory(item);
  return cat ? categoryLabelEn(cat) : "";
}

export interface DayGroup {
  /** "2026-09-17" */
  key: string;
  /** "Today" / "Yesterday" / "Wednesday" */
  label: string;
  /** "Sep 17" */
  date: string;
  items: ContentItem[];
}

/**
 * 按发布日分组，保持传入顺序（服务端已按选定 sort 排好，这里不重排）。
 * 同一天的多条归到一组。
 */
export function groupByDay(items: ContentItem[], now: Date): DayGroup[] {
  const todayKey = localDayKey(now);
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = localDayKey(y);

  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();

  for (const item of items) {
    const key = (item.listPublishedAt ?? "").slice(0, 10);
    let g = index.get(key);
    if (!g) {
      g = {
        key,
        label: key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : weekdayOf(key),
        date: shortDate(key),
        items: [],
      };
      index.set(key, g);
      groups.push(g);
    }
    g.items.push(item);
  }

  return groups;
}
