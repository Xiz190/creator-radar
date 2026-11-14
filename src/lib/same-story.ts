// 判断两条标题是不是同一件事（同一新闻被不同来源各报一次）。
// 只看「关键识别词」：大写开头的品牌/产品词和版本号（v6、v5.5）。共享 2 个以上就算同一件事。
// 用在首页「今日必读」：前三条里同一件事只留一条。
const COMMON = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "its", "it", "how", "what",
  "why", "you", "your", "here", "this", "that", "new", "now", "introducing", "announces", "launches",
  "explained", "best", "guide", "after", "from", "by", "at", "as", "are", "be", "all", "more", "get",
]);

export function storyKeys(title: string): Set<string> {
  const keys = new Set<string>();
  for (const raw of title.split(/[\s,:;!?()"'“”‘’|/]+/)) {
    const w = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.]+$/g, "");
    if (!w) continue;
    const lower = w.toLowerCase();
    if (COMMON.has(lower)) continue;
    if (/^v\d+(\.\d+)?/i.test(w) || /^[A-Z][A-Za-z0-9]+/.test(w)) keys.add(lower.replace(/\.$/, ""));
  }
  return keys;
}

export function isSameStory(a: string, b: string): boolean {
  const ka = storyKeys(a);
  const kb = storyKeys(b);
  let shared = 0;
  for (const k of ka) if (kb.has(k)) shared++;
  return shared >= 2;
}

/**
 * 按原顺序挑 n 条，跳过和已选中的是同一件事的。
 * 来源名也算进识别词：Suno 官方博客的「Introducing v6」标题里没有 Suno，但它和别家写的 Suno v6 是同一件事。
 */
export function pickDistinctStories<T extends { title: string; departmentName?: string | null }>(items: T[], n: number): T[] {
  const text = (i: T) => `${i.title} ${i.departmentName ?? ""}`;
  const out: T[] = [];
  for (const it of items) {
    if (out.length >= n) break;
    if (out.some((o) => isSameStory(text(o), text(it)))) continue;
    out.push(it);
  }
  return out;
}
