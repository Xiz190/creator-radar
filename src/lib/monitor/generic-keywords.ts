// 通用词停用表：这些词在 AI 工具 / 音乐科技资讯里几乎每条都有。
// 放进「关键词热度」会霸榜，放进正文高亮会把一篇文章涂满黄色（实测「模型」一篇高亮 25 次），
// 两种情况都不提供信息。看板统计、桌面与伴侣版的正文高亮共用这一份，保证口径一致。
export const GENERIC_KEYWORDS = new Set([
  "introducing", "introduce", "release", "released", "releases", "launch", "launches", "launched",
  "new", "update", "updates", "updated", "announces", "announcing", "announced", "available", "now",
  "guide", "review", "reviews", "how", "tutorial", "beta", "feature", "features", "tool", "tools",
  "model", "models", "ai", "version", "unveiled", "unveils", "launching", "debut", "debuts",
  "发布", "上线", "推出", "更新", "模型", "新品", "版本", "正式", "功能", "工具", "教程", "评测",
]);

export function isGenericKeyword(keyword: string): boolean {
  return GENERIC_KEYWORDS.has(keyword.trim().toLowerCase());
}
