// 收件箱专用：把来源的原始栏目名归并为少量内容大类。
// 此文件只影响收件箱筛选逻辑。

export type ChannelGroupKey =
  | "ai_tools"
  | "opportunity"
  | "deadline"
  | "industry"
  | "other";

export type ChannelGroup = {
  key: ChannelGroupKey;
  label: string;
  description: string;
};

export const CHANNEL_GROUPS: ChannelGroup[] = [
  {
    key: "ai_tools",
    label: "AI工具动态",
    description: "Suno / Runway / HeyGen / Pika / Udio 等AI创作工具的功能更新、定价变化、版本发布",
  },
  {
    key: "opportunity",
    label: "创作机会",
    description: "音乐比赛、厂牌招募、驻留项目、资助申请、演出征集等对独立音乐人有实质价值的机会",
  },
  {
    key: "deadline",
    label: "截止预警",
    description: "比赛报名、项目申请、投稿截止日期临近提醒",
  },
  {
    key: "industry",
    label: "行业动态",
    description: "流媒体平台动态、版权政策、音乐行业新闻、发行平台更新等",
  },
  {
    key: "other",
    label: "其他",
    description: "无法归入以上大类的内容",
  },
];

export const CHANNEL_GROUP_LABELS: Record<ChannelGroupKey, string> = CHANNEL_GROUPS.reduce(
  (acc, g) => {
    acc[g.key] = g.label;
    return acc;
  },
  {} as Record<ChannelGroupKey, string>,
);

// —— 精确匹配表 ——
const EXACT_MAP: Record<string, ChannelGroupKey> = {
  // AI 工具
  "Suno Blog": "ai_tools",
  "Suno Updates": "ai_tools",
  "Runway Blog": "ai_tools",
  "HeyGen Blog": "ai_tools",
  "Pika Blog": "ai_tools",
  "Udio Updates": "ai_tools",
  "Midjourney Updates": "ai_tools",
  "Stable Audio": "ai_tools",
  "AI工具更新": "ai_tools",
  "工具动态": "ai_tools",
  // 创作机会
  "音乐比赛": "opportunity",
  "作品征集": "opportunity",
  "厂牌招募": "opportunity",
  "驻留项目": "opportunity",
  "资助申请": "opportunity",
  "演出征集": "opportunity",
  "创作机会": "opportunity",
  // 截止预警
  "截止预警": "deadline",
  "报名截止": "deadline",
  // 行业动态
  "行业动态": "industry",
  "流媒体动态": "industry",
  "版权资讯": "industry",
  "发行平台": "industry",
};

// —— 关键词兜底 ——
const KEYWORD_RULES: Array<{ keywords: string[]; group: ChannelGroupKey }> = [
  {
    keywords: ["suno", "runway", "heygen", "pika", "udio", "midjourney", "stable audio",
               "AI工具", "工具更新", "版本发布", "新功能", "定价", "changelog", "updates"],
    group: "ai_tools",
  },
  {
    keywords: ["比赛", "大赛", "征集", "招募", "投稿", "驻留", "资助", "基金", "奖金",
               "演出", "展演", "机会", "申请", "competition", "grant", "residency", "submission"],
    group: "opportunity",
  },
  {
    keywords: ["截止", "deadline", "倒计时", "最后", "last day", "closing"],
    group: "deadline",
  },
  {
    keywords: ["spotify", "apple music", "youtube music", "distrokid", "tunecore",
               "版权", "流媒体", "播放量", "分发", "发行", "billboard", "行业"],
    group: "industry",
  },
];

export function classifyChannelGroup(channelName: string | null | undefined): ChannelGroupKey {
  if (!channelName) return "other";
  const key = String(channelName).trim();
  if (!key) return "other";
  if (EXACT_MAP[key]) return EXACT_MAP[key];
  const lower = key.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return rule.group;
  }
  return "other";
}

export function groupChannelCounts(
  channels: Array<{ channelName: string; count: number }>,
): Array<{ group: ChannelGroupKey; label: string; count: number }> {
  const totals = new Map<ChannelGroupKey, number>();
  for (const c of channels) {
    const g = classifyChannelGroup(c.channelName);
    totals.set(g, (totals.get(g) ?? 0) + Math.max(0, Number(c.count) || 0));
  }
  return CHANNEL_GROUPS.map((g) => ({
    group: g.key,
    label: g.label,
    count: totals.get(g.key) ?? 0,
  }));
}

export function expandGroupsToChannelNames(
  groups: Iterable<ChannelGroupKey>,
  allChannelNames: Iterable<string>,
): Set<string> {
  const want = new Set<ChannelGroupKey>(groups);
  const result = new Set<string>();
  for (const name of allChannelNames) {
    if (want.has(classifyChannelGroup(name))) result.add(name);
  }
  return result;
}
