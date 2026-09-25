import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  buildFeedParams,
  groupByDay,
  hasLens,
  primaryCategory,
  primaryCategoryLabelEn,
  type FeedFilters,
} from "@/lib/companion/feed";
import { SIGNAL_CATEGORIES } from "@/lib/monitor/content-meta";
import type { ContentItem } from "@/hooks/use-item-list";

function makeItem(over: Partial<ContentItem> = {}): ContentItem {
  return {
    sourceId: "s1",
    departmentName: "CDM",
    channelName: "ch",
    displayName: "CDM",
    url: "https://example.com/a",
    title: "Suno v5 adds stem editing",
    listPublishedAt: "2026-09-18",
    firstSeenAt: "2026-09-18T00:00:00.000Z",
    isRead: false,
    isStarred: false,
    keywordScore: 0,
    importanceLevel: "普通内容",
    categories: [],
    genres: [],
    creatorLens: null,
    ...over,
  };
}

const params = (o: Parameters<typeof buildFeedParams>[0]) => buildFeedParams(o);
const base = { filters: DEFAULT_FILTERS, limit: 30, offset: 0 };

describe("Feed · 请求参数拼装", () => {
  it("All 段不带订阅条件", () => {
    const p = params({ ...base, view: "all" });
    expect(p.get("subscribedDepartments")).toBeNull();
    expect(p.get("subscribedKeywords")).toBeNull();
    expect(p.get("categories")).toBeNull();
  });

  it("Following 段下发订阅；订阅为空时不下发", () => {
    const p = params({
      ...base,
      view: "following",
      subscriptions: { departments: ["CDM"], keywords: ["suno"] },
    });
    expect(p.get("subscribedDepartments")).toBe("CDM");
    expect(p.get("subscribedKeywords")).toBe("suno");

    const empty = params({ ...base, view: "following", subscriptions: { departments: [], keywords: [] } });
    expect(empty.get("subscribedDepartments")).toBeNull();
    expect(empty.get("subscribedKeywords")).toBeNull();
  });

  it("Signals 段按信号层五个分类过滤，且默认按 relevance 排", () => {
    const p = params({ ...base, view: "signals" });
    expect(p.get("categories")).toBe([...SIGNAL_CATEGORIES].join(","));
    expect(p.get("sort")).toBe("relevance");
  });

  it("用户显式选了分类档位时，覆盖 Signals 的整层过滤", () => {
    const filters: FeedFilters = { ...DEFAULT_FILTERS, category: "deadlines" };
    const p = params({ ...base, view: "signals", filters });
    expect(p.get("categories")).toBe("C·申报截止预警");
    expect(p.get("categories")).not.toContain("A·AI工具更新");
  });

  it("用户显式改过排序时以用户为准（Signals 不再强制 relevance）", () => {
    const filters: FeedFilters = { ...DEFAULT_FILTERS, sort: "latest" };
    // latest 是默认值，仍走 Signals 的 relevance
    expect(params({ ...base, view: "signals", filters }).get("sort")).toBe("relevance");
    // 显式选了别的档位就听用户的
    expect(
      params({ ...base, view: "signals", filters: { ...filters, sort: "first_seen" } }).get("sort"),
    ).toBe("first_seen_at");
  });

  it("排序三档映射到后端参数", () => {
    expect(params({ ...base, view: "all", filters: { ...DEFAULT_FILTERS, sort: "latest" } }).get("sort")).toBe("published_at");
    expect(params({ ...base, view: "all", filters: { ...DEFAULT_FILTERS, sort: "relevance" } }).get("sort")).toBe("relevance");
    expect(params({ ...base, view: "all", filters: { ...DEFAULT_FILTERS, sort: "first_seen" } }).get("sort")).toBe("first_seen_at");
  });

  it("未读 / 重点 / 地区 开关", () => {
    const p = params({
      ...base,
      view: "all",
      filters: { ...DEFAULT_FILTERS, unreadOnly: true, keyOnly: true, scope: "global" },
    });
    expect(p.get("onlyUnread")).toBe("1");
    expect(p.get("onlyStarred")).toBe("1");
    expect(p.get("region")).toBe("global");
  });

  it("日期范围带了才下发 dateField（避免无谓地改变后端默认）", () => {
    expect(params({ ...base, view: "all" }).get("dateField")).toBeNull();
    const p = params({
      ...base,
      view: "all",
      filters: { ...DEFAULT_FILTERS, fromDate: "2026-09-01", toDate: "2026-09-18" },
    });
    expect(p.get("fromDate")).toBe("2026-09-01");
    expect(p.get("toDate")).toBe("2026-09-18");
    expect(p.get("dateField")).toBe("list_published_at");
  });

  it("分页参数照传", () => {
    const p = params({ view: "all", filters: DEFAULT_FILTERS, limit: 30, offset: 60 });
    expect(p.get("limit")).toBe("30");
    expect(p.get("offset")).toBe("60");
  });

  it("搜索词带了才下发，纯空白不下发", () => {
    expect(params({ ...base, view: "all", q: "  suno  " }).get("q")).toBe("suno");
    expect(params({ ...base, view: "all", q: "   " }).get("q")).toBeNull();
    expect(params({ ...base, view: "all" }).get("q")).toBeNull();
  });
});

describe("Feed · Filters 角标计数", () => {
  it("默认筛选为 0", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  it("每开一项加一，日期范围整体算一项", () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, unreadOnly: true })).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, scope: "domestic", keyOnly: true })).toBe(2);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, fromDate: "2026-09-01", toDate: "2026-09-18" })).toBe(1);
    expect(
      activeFilterCount({
        ...DEFAULT_FILTERS,
        scope: "global",
        unreadOnly: true,
        keyOnly: true,
        category: "tools",
        fromDate: "2026-09-01",
        sort: "relevance",
      }),
    ).toBe(6);
  });
});

describe("Feed · 是否有创作者视角", () => {
  it("空串与纯空白都算没有（与服务端 hasLens 的 trim 口径一致）", () => {
    expect(hasLens(makeItem({ creatorLens: "有" }))).toBe(true);
    expect(hasLens(makeItem({ creatorLens: "" }))).toBe(false);
    expect(hasLens(makeItem({ creatorLens: "   " }))).toBe(false);
    expect(hasLens(makeItem({ creatorLens: null }))).toBe(false);
  });
});

describe("Feed · 行首分类", () => {
  it("优先取信号层分类，跳过主题层", () => {
    const item = makeItem({
      categories: [
        { category: "AI音乐生成工具", score: 2 },
        { category: "D·行业观察", score: 1 },
      ],
    });
    expect(primaryCategory(item)).toBe("D·行业观察");
    expect(primaryCategoryLabelEn(item)).toBe("Industry Watch");
  });

  it("旧英文 key 也能归一后命中信号层", () => {
    // signal_exec 经 getCategoryStyle 的 legacyMap 归一为 A·AI工具更新
    expect(primaryCategory(makeItem({ categories: [{ category: "signal_exec", score: 3 }] }))).toBe("A·AI工具更新");
    expect(primaryCategoryLabelEn(makeItem({ categories: [{ category: "signal_exec", score: 3 }] }))).toBe("AI Tool Update");
  });

  it("没有信号层分类时退回第一个分类；完全没分类时返回空串", () => {
    expect(primaryCategory(makeItem({ categories: [{ category: "AI音乐生成工具", score: 2 }] }))).toBe("AI音乐生成工具");
    expect(primaryCategory(makeItem({ categories: [] }))).toBe("");
    expect(primaryCategoryLabelEn(makeItem({ categories: [] }))).toBe("");
  });
});

describe("Feed · 按天分组", () => {
  const now = new Date(2026, 8, 18, 15, 0, 0); // 2026-09-18 本地

  it("同一天的归到一组，保持传入顺序", () => {
    const items = [
      makeItem({ url: "a", listPublishedAt: "2026-09-18" }),
      makeItem({ url: "b", listPublishedAt: "2026-09-18" }),
      makeItem({ url: "c", listPublishedAt: "2026-09-17" }),
    ];
    const groups = groupByDay(items, now);
    expect(groups.map((g) => g.key)).toEqual(["2026-09-18", "2026-09-17"]);
    expect(groups[0].items.map((i) => i.url)).toEqual(["a", "b"]);
    expect(groups[1].items.map((i) => i.url)).toEqual(["c"]);
  });

  it("今天/昨天用 Today / Yesterday，更早用星期名", () => {
    const groups = groupByDay(
      [
        makeItem({ url: "a", listPublishedAt: "2026-09-18" }),
        makeItem({ url: "b", listPublishedAt: "2026-09-17" }),
        makeItem({ url: "c", listPublishedAt: "2026-09-15" }),
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Tuesday"]);
  });

  it("每组都带可显示的短日期", () => {
    const groups = groupByDay([makeItem({ listPublishedAt: "2026-09-15" })], now);
    expect(groups[0].date).toBe("Sep 15");
  });

  it("空输入返回空数组", () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
