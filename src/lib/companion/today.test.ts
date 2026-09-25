import { describe, expect, it } from "vitest";
import { pickRanked, summarize } from "@/lib/companion/today";
import type { ContentItem } from "@/hooks/use-item-list";

function makeItem(over: Partial<ContentItem>): ContentItem {
  return {
    sourceId: "s1",
    departmentName: "dep",
    channelName: "ch",
    displayName: "CDM",
    url: "https://example.com/a",
    title: "Suno v5 adds stem editing",
    listPublishedAt: "2026-09-17",
    firstSeenAt: "2026-09-17T00:00:00.000Z",
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

describe("Today · Ranked for you", () => {
  it("只挑有 lens 的条目", () => {
    const items = [
      makeItem({ url: "a", creatorLens: "有视角" }),
      makeItem({ url: "b", creatorLens: null }),
      makeItem({ url: "c", creatorLens: "   " }),
    ];
    const picked = pickRanked(items);
    expect(picked.map((i) => i.url)).toEqual(["a"]);
  });

  it("按四档排序：核心关注 > 重点内容 > 中等重点 > 普通内容", () => {
    const items = [
      makeItem({ url: "d", creatorLens: "x", importanceLevel: "普通内容" }),
      makeItem({ url: "b", creatorLens: "x", importanceLevel: "重点内容" }),
      makeItem({ url: "c", creatorLens: "x", importanceLevel: "中等重点" }),
      makeItem({ url: "a", creatorLens: "x", importanceLevel: "核心关注" }),
    ];
    expect(pickRanked(items).map((i) => i.url)).toEqual(["a", "b", "c", "d"]);
  });

  it("同优先级时，收藏的排前面", () => {
    const items = [
      makeItem({ url: "a", creatorLens: "x", importanceLevel: "重点内容" }),
      makeItem({ url: "b", creatorLens: "y", importanceLevel: "重点内容", isStarred: true }),
    ];
    expect(pickRanked(items).map((i) => i.url)).toEqual(["b", "a"]);
  });

  it("最多返回 4 条", () => {
    const items = Array.from({ length: 9 }, (_, i) =>
      makeItem({ url: `u${i}`, creatorLens: `lens ${i}` }),
    );
    expect(pickRanked(items)).toHaveLength(4);
  });

  it("不足 4 条时有几条给几条，不报错", () => {
    expect(pickRanked([])).toEqual([]);
    expect(pickRanked([makeItem({ creatorLens: "x" })])).toHaveLength(1);
  });

  it("不改动传入的数组（排序不应有副作用）", () => {
    const items = [
      makeItem({ url: "a", creatorLens: "x" }),
      makeItem({ url: "b", creatorLens: "y" }),
    ];
    const before = items.map((i) => i.url);
    pickRanked(items);
    expect(items.map((i) => i.url)).toEqual(before);
  });
});

describe("Today · 计数", () => {
  it("未读数与重点数分别统计；中等重点不计入重点", () => {
    const items = [
      makeItem({ url: "a", isRead: false, importanceLevel: "核心关注" }),
      makeItem({ url: "b", isRead: true, importanceLevel: "重点内容" }),
      makeItem({ url: "c", isRead: false, importanceLevel: "中等重点" }),
      makeItem({ url: "d", isRead: false, importanceLevel: "普通内容" }),
    ];
    expect(summarize(items)).toEqual({ unread: 3, key: 2 });
  });
});
