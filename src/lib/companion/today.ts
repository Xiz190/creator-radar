import { pickLens } from "@/lib/localized-fields";
import type { ContentItem } from "@/hooks/use-item-list";

/**
 * importance_level 的档位顺序，数值越大越重要。
 * 取值来自库里的真实分布（2026-09-18 实测 713 条）：
 *   普通内容 625 / 中等重点 59 / 重点内容 28 / 核心关注 1
 */
const LEVEL_ORDER: Record<string, number> = {
  核心关注: 4,
  重点内容: 3,
  中等重点: 2,
  普通内容: 1,
};

/** 「重点」的门槛：核心关注 + 重点内容（对齐桌面端 inbox 的 urgent+highlight 口径） */
const KEY_THRESHOLD = 3;

function levelRank(item: ContentItem): number {
  return LEVEL_ORDER[item.importanceLevel] ?? 0;
}

/**
 * Today 的 "Ranked for you"。
 *
 * 只取有 lens 的条目——Today 的卖点就是那句"对创作者意味着什么"，
 * 没有 lens 就退化成普通标题列表，跟 Feed 重复了。
 * 排序：重要性档位 → 是否收藏 → 关键词分 → 越新越前。
 *
 * 不改动入参数组（用展开副本再排序）。
 */
export function pickRanked(items: ContentItem[], limit = 4): ContentItem[] {
  return [...items]
    // 伴侣版固定英文，所以按"英文版有没有"来筛（缺英文会回退中文，仍算有）
    .filter((i) => pickLens(i, "en") !== null)
    .sort((a, b) => {
      const byLevel = levelRank(b) - levelRank(a);
      if (byLevel !== 0) return byLevel;
      const byStar = Number(b.isStarred) - Number(a.isStarred);
      if (byStar !== 0) return byStar;
      const byScore = (b.keywordScore ?? 0) - (a.keywordScore ?? 0);
      if (byScore !== 0) return byScore;
      return (b.listPublishedAt ?? "").localeCompare(a.listPublishedAt ?? "");
    })
    .slice(0, limit);
}

/** Today 顶部的 "N unread · M key today" */
export function summarize(items: ContentItem[]): { unread: number; key: number } {
  let unread = 0;
  let key = 0;
  for (const i of items) {
    if (!i.isRead) unread++;
    if (levelRank(i) >= KEY_THRESHOLD) key++;
  }
  return { unread, key };
}
