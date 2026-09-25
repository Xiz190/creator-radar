// 关键词分类 → 显示标签与样式映射
// 此文件不带 "use client"，Server Component 与 Client Component 都可以直接 import
import { getImportanceBadgeMeta } from "./priority-levels";
import {
  AlarmClock, Bot, ChartColumn, Circle, Clapperboard, ClipboardList, Globe, MapPin,
  Music, RadioTower, Scale, Target, Trophy, type LucideIcon,
} from "lucide-react";

export type CategoryStyle = {
  label: string;
  displayLabel: string;
  tooltip: string;
  description: string;
  value: string;
  icon: LucideIcon;
  chip: string; // 胶囊标签
  highlight: string; // 正文内高亮 mark
  bar: string; // 进度条 / 小条颜色
};

export type CategoryGroupType = "signal" | "topic" | "region" | "noise" | "unknown";

export const CATEGORY_GROUP_LABELS: Record<CategoryGroupType, string> = {
  signal: "动态信号",
  topic: "涉及领域",
  region: "区域相关",
  noise: "其他",
  unknown: "未分类",
};

// 关键词分类 → 显示标签与样式映射
// 分类体系与 db.ts 的 seedDefaultKeywordsIfEmpty / role-analysis.ts 的 ROLE_FOCUS_LIST 一致：
//   信号层（A/B/C/D + 落地）：signal_exec / signal_support / signal_risk / signal_explore / signal_launch
//   主题层（topic_*）：       topic_ai / topic_computing / topic_data / topic_industry / topic_gov / topic_regulation
//   区域 / 降噪：              region_general / negative

export const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  // —— A 类：AI工具更新（最高优先级，紫色系）
  "A·AI工具更新": {
    label: "A·AI工具更新",
    displayLabel: "AI工具更新",
    tooltip: "Suno / Runway / HeyGen / Pika 新功能、定价变化、版本发布",
    description: "涵盖Suno、Udio等AI音乐生成工具，Runway、Pika等AI视频工具，HeyGen等AI形象工具的功能更新、定价调整、重大版本发布等动态。",
    value: "直接影响创作工具选择和创作流程，是独立音乐人最需要第一时间掌握的信息。",
    icon: Bot,
    chip: "bg-purple-50 text-purple-700 border border-purple-200",
    highlight: "bg-purple-100 text-purple-900 ring-1 ring-purple-200 rounded px-1 py-0.5",
    bar: "bg-purple-500",
  },
  // —— B 类：创作机会（绿色系）
  "B·创作机会": {
    label: "B·创作机会",
    displayLabel: "创作机会",
    tooltip: "音乐比赛、驻留项目、厂牌招募、资助申请",
    description: "包含国内外音乐比赛报名、唱片厂牌投递招募、艺术家驻留项目、音乐类资助基金申请等对独立音乐人有实质价值的机会资讯。",
    value: "直接关系到曝光、资金和合作机会，是模块B的核心内容。截止日期临近时会触发预警。",
    icon: Target,
    chip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    highlight: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 rounded px-1 py-0.5",
    bar: "bg-emerald-400",
  },
  // —— C 类：申报截止预警（红色系）
  "C·申报截止预警": {
    label: "C·申报截止预警",
    displayLabel: "截止预警",
    tooltip: "报名截止、投递截止、申请截止日期临近警示",
    description: "对各类音乐比赛、资助申请、驻留项目的报名截止时间进行追踪，在截止日期前7天、3天、1天触发不同级别预警。",
    value: "防止错过重要机会，是创作者雷达的核心差异化功能之一。",
    icon: AlarmClock,
    chip: "bg-rose-50 text-rose-700 border border-rose-200",
    highlight: "bg-rose-100 text-rose-900 ring-1 ring-rose-200 rounded px-1 py-0.5",
    bar: "bg-rose-400",
  },
  // —— D 类：行业观察（浅灰色系）
  "D·行业观察": {
    label: "D·行业观察",
    displayLabel: "行业观察",
    tooltip: "流媒体数据、市场报告、AI音乐行业趋势",
    description: "包含Spotify、Apple Music等流媒体平台的算法变化、数据报告，AI音乐版权争议、独立音乐人发行趋势、产业市场动态等宏观信息。",
    value: "帮助独立音乐人把握行业走向，为创作和发行策略提供参考。",
    icon: ChartColumn,
    chip: "bg-zinc-50 text-zinc-600 border border-zinc-200",
    highlight: "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200 rounded px-1 py-0.5",
    bar: "bg-zinc-400",
  },
  // —— 平台政策/版权（蓝色系）
  "平台政策/版权": {
    label: "平台政策/版权",
    displayLabel: "版权与平台政策",
    tooltip: "流媒体平台规则变化、AI生成内容版权政策、收益分成调整",
    description: "涉及Spotify、YouTube、TikTok等平台的内容政策、AI生成音乐版权规定、流媒体收益分成规则调整，以及各国/地区AI版权立法动态。",
    value: "直接影响作品发行策略和收益，对使用AI工具创作的音乐人尤其重要。",
    icon: ClipboardList,
    chip: "bg-sky-50 text-sky-700 border border-sky-200",
    highlight: "bg-sky-100 text-sky-900 ring-1 ring-sky-200 rounded px-1 py-0.5",
    bar: "bg-sky-400",
  },

  // —— 主题层
  "AI音乐生成工具": {
    label: "AI音乐生成工具",
    displayLabel: "AI音乐工具",
    tooltip: "Suno、Udio、Stable Audio等AI音乐生成平台",
    description: "涵盖Suno、Udio、Stable Audio、MusicLM等AI音乐生成工具的功能测评、使用技巧、与DAW结合工作流等内容。",
    value: "是独立音乐人最核心的工具类信息，直接影响创作效率和作品质量。",
    icon: Music,
    chip: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200",
    highlight: "bg-fuchsia-100 text-fuchsia-900 ring-1 ring-fuchsia-200 rounded px-1 py-0.5",
    bar: "bg-fuchsia-500",
  },
  "视频/视觉AI工具": {
    label: "视频/视觉AI工具",
    displayLabel: "视频AI工具",
    tooltip: "Runway、Pika、HeyGen、Midjourney等视觉创作AI",
    description: "包含Runway Gen-3、Pika、HeyGen、Midjourney、DALL-E等用于MV制作、封面设计、宣传素材生成的AI工具动态。",
    value: "独立音乐人制作MV和宣传物料的核心工具链，直接影响视觉内容产出效率。",
    icon: Clapperboard,
    chip: "bg-teal-50 text-teal-700 border border-teal-200",
    highlight: "bg-teal-100 text-teal-900 ring-1 ring-teal-200 rounded px-1 py-0.5",
    bar: "bg-teal-500",
  },
  "流媒体/发行平台": {
    label: "流媒体/发行平台",
    displayLabel: "发行平台",
    tooltip: "Spotify、Apple Music、DistroKid、TuneCore等发行渠道",
    description: "涵盖Spotify、Apple Music、网易云音乐、QQ音乐等流媒体平台，以及DistroKid、TuneCore、CD Baby等独立发行服务的政策和功能变化。",
    value: "直接影响音乐发行策略和收益分配，是独立音乐人运营的核心参考。",
    icon: RadioTower,
    chip: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    highlight: "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200 rounded px-1 py-0.5",
    bar: "bg-cyan-500",
  },
  "音乐比赛/节庆": {
    label: "音乐比赛/节庆",
    displayLabel: "比赛与节庆",
    tooltip: "音乐竞赛、音乐节、展演、Showcase等机会",
    description: "包含国内外各类音乐比赛（如草莓音乐节新人奖、迷笛等）、音乐节Showcase机会、行业展会（如SXSW、Midem）等演出和曝光机会。",
    value: "核心曝光渠道，对独立音乐人建立受众和行业人脉至关重要。",
    icon: Trophy,
    chip: "bg-amber-50 text-amber-700 border border-amber-200",
    highlight: "bg-amber-100 text-amber-900 ring-1 ring-amber-200 rounded px-1 py-0.5",
    bar: "bg-amber-500",
  },
  "版权/法律": {
    label: "版权/法律",
    displayLabel: "版权法律",
    tooltip: "版权注册、授权协议、AI生成内容版权争议",
    description: "涵盖音乐版权注册流程、ISRC码申请、授权协议解读、AI生成音乐版权归属争议、各平台内容合规要求等法律层面内容。",
    value: "保护创作者权益，规避版权风险，对使用AI工具创作的音乐人尤其重要。",
    icon: Scale,
    chip: "bg-blue-50 text-blue-700 border border-blue-200",
    highlight: "bg-blue-100 text-blue-900 ring-1 ring-blue-200 rounded px-1 py-0.5",
    bar: "bg-blue-500",
  },
  "海外市场/国际": {
    label: "海外市场/国际",
    displayLabel: "海外与国际",
    tooltip: "国际音乐市场动态、海外发行机会、跨文化创作趋势",
    description: "涉及欧美、日韩、东南亚等海外音乐市场动态，国际厂牌招募、跨文化合作机会，以及华语音乐出海相关资讯。",
    value: "帮助独立音乐人把握国际市场机会，为出海策略提供参考。",
    icon: Globe,
    chip: "bg-slate-100 text-slate-700 border border-slate-300",
    highlight: "bg-slate-200 text-slate-900 ring-1 ring-slate-300 rounded px-1 py-0.5",
    bar: "bg-slate-500",
  },

  // —— 区域通用（低权重，黄色系）
  "地方/省级/区域": {
    label: "地方/省级/区域",
    displayLabel: "地方动态",
    tooltip: "各省市地方文化扶持、地方音乐活动",
    description: "各省市发布的地方性文化扶持通知、地方音乐节、地方厂牌活动等区域性内容。",
    value: "对在特定地区发展的独立音乐人有针对性参考价值。",
    icon: MapPin,
    chip: "bg-yellow-50 text-yellow-800 border border-yellow-200",
    highlight: "bg-yellow-100 text-yellow-900 ring-1 ring-yellow-200 rounded px-1 py-0.5",
    bar: "bg-yellow-400",
  },
  // —— 噪音词汇（命中扣分）
  "噪音词汇": {
    label: "噪音词汇",
    displayLabel: "其他",
    tooltip: "通用词汇，不代表具体创作者情报倾向",
    description: "这类词汇较为通用，不代表特定的创作者信号或领域倾向。",
    value: "参考价值较低，主要用于排除非实质性内容。",
    icon: Circle,
    chip: "bg-zinc-50 text-zinc-600 border border-zinc-200",
    highlight: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 rounded px-1 py-0.5",
    bar: "bg-zinc-400",
  },
};

export function getCategoryStyle(category: string): CategoryStyle {
  // 支持旧英文 key 的向后兼容（如 database 中残留的旧数据，或旧关键词体系的分类名）
  // 从最老的简单 key（ai、industry 等）到新体系（topic_*、signal_*）都覆盖
  const legacyMap: Record<string, string> = {
    // —— 当前分类体系（英文 key → 中文）——
    signal_exec: "A·AI工具更新",
    signal_support: "B·创作机会",
    signal_risk: "C·申报截止预警",
    signal_explore: "D·行业观察",
    signal_launch: "平台政策/版权",
    topic_music: "AI音乐生成工具",
    topic_craft: "视频/视觉AI工具",
    topic_site: "流媒体/发行平台",
    topic_festival: "音乐比赛/节庆",
    topic_education: "版权/法律",
    topic_unesco: "海外市场/国际",
    region_general: "地方/省级/区域",
    negative: "噪音词汇",
    // —— 旧分类体系兼容映射 ——
    "D·行业动态": "D·行业观察",
    signal_pre: "D·行业观察",
    signal_start: "A·AI工具更新",
    signal_opportunity: "B·创作机会",
    regulations: "平台政策/版权",
    innovation: "版权/法律",
    "byte-related": "AI音乐生成工具",
    ai: "AI音乐生成工具",
    data: "D·行业观察",
    platform: "流媒体/发行平台",
    security: "C·申报截止预警",
    industry: "D·行业观察",
    gov_service: "平台政策/版权",
    region_bjj: "地方/省级/区域",
    byte_related: "AI音乐生成工具",
    general: "其他",
    "topic-ai": "AI音乐生成工具",
    "topic-data": "D·行业观察",
    "topic-gov": "平台政策/版权",
    "topic-industry": "D·行业观察",
    "topic-regulation": "平台政策/版权",
    "region-bjj": "地方/省级/区域",
    "signal-risk": "C·申报截止预警",
    "signal-exec": "A·AI工具更新",
    "signal-support": "B·创作机会",
    "signal-explore": "D·行业观察",
    "signal-launch": "平台政策/版权",
  };
  const normalized = legacyMap[category] ?? category;
  const base = CATEGORY_STYLE[normalized] ?? {
    label: normalized,
    displayLabel: normalized,
    tooltip: "",
    description: "",
    value: "",
    icon: ClipboardList,
    chip: "bg-slate-50 text-slate-700 border border-slate-200",
    highlight: "bg-slate-100 text-slate-900 ring-1 ring-slate-200 rounded px-1 py-0.5",
    bar: "bg-slate-400",
  };
  // 工作台秩序：分类=分类学(taxonomy)，统一收敛为近单色 chip，不用彩色制造噪点。
  // 颜色只留在有语义处（优先级徽章）与图表区分（.bar 不动）。
  return { ...base, chip: "bg-slate-100 text-slate-600" };
}

/**
 * @deprecated 请使用 categoryDisplayLabel() 获取用户可见的展示名，
 * 或直接使用 .label 获取内部标识名（仅用于逻辑判断）。
 */
export function categoryLabel(cat: string): string {
  return getCategoryStyle(cat).label;
}

export function categoryDisplayLabel(cat: string): string {
  return getCategoryStyle(cat).displayLabel;
}

export function categoryTooltip(cat: string): string {
  return getCategoryStyle(cat).tooltip;
}

export function getCategoryGroup(category: string): CategoryGroupType {
  const normalized = getCategoryStyle(category).label;
  if (SIGNAL_CATEGORIES.has(normalized)) return "signal";
  if (TOPIC_CATEGORIES.has(normalized)) return "topic";
  if (REGION_CATEGORIES.has(normalized)) return "region";
  if (NOISE_CATEGORIES.has(normalized)) return "noise";
  return "unknown";
}

export function categoryGroupLabel(category: string): string {
  const group = getCategoryGroup(category);
  return CATEGORY_GROUP_LABELS[group];
}

// —— 分类分层常量（信号层 / 主题层 / 其他）——
// 信号层分类：A/B/C/D 类信号 + 平台政策
export const SIGNAL_CATEGORIES = new Set([
  "A·AI工具更新",
  "B·创作机会",
  "C·申报截止预警",
  "D·行业观察",
  "平台政策/版权",
]);

// 主题层分类：创作者工具与机会领域分类
export const TOPIC_CATEGORIES = new Set([
  "AI音乐生成工具",
  "视频/视觉AI工具",
  "流媒体/发行平台",
  "音乐比赛/节庆",
  "版权/法律",
  "海外市场/国际",
]);

// 区域分类
export const REGION_CATEGORIES = new Set([
  "地方/省级/区域",
]);

// 噪音词汇（扣分用，不计入主题/信号展示）
export const NOISE_CATEGORIES = new Set([
  "噪音词汇",
]);

const LOG_PREFIX = "[ContentMeta]";

const DEBUG = false;

// 判断是否为信号层分类
export function isSignalCategory(category: string): boolean {
  return SIGNAL_CATEGORIES.has(category);
}

// 判断是否为主题层分类
export function isTopicCategory(category: string): boolean {
  return TOPIC_CATEGORIES.has(category);
}

// 从分类列表中过滤出主题层分类（用于同主题匹配、政策沿革标题等）
export function filterTopicCategories(
  categories: Array<{ category: string; score?: number }>,
): Array<{ category: string; score?: number }> {
  return categories.filter((c) => isTopicCategory(c.category));
}

// 从分类列表中取第一个主题层分类（用于政策沿革标题等场景）
export function getFirstTopicCategory(
  categories: Array<{ category: string; score?: number }>,
): string | null {
  const found = categories.find((c) => isTopicCategory(c.category));
  return found ? found.category : null;
}

// category → {label, hexColor}，供 dashboard / 词云等需要 16 进制颜色的场景使用
// 颜色与上方 CATEGORY_STYLE 的主色保持一致
const CATEGORY_COLOR_HEX: Record<string, string> = {
  "A·AI工具更新": "#8b5cf6",
  "B·创作机会": "#10b981",
  "C·申报截止预警": "#ef4444",
  "D·行业观察": "#71717a",
  "平台政策/版权": "#0ea5e9",
  "AI音乐生成工具": "#d946ef",
  "视频/视觉AI工具": "#14b8a6",
  "流媒体/发行平台": "#06b6d4",
  "音乐比赛/节庆": "#f59e0b",
  "版权/法律": "#3b82f6",
  "海外市场/国际": "#64748b",
  "地方/省级/区域": "#eab308",
  "噪音词汇": "#94a3b8",
};

export function categoryMeta(cat: string): { label: string; color: string } {
  const base = getCategoryStyle(cat);
  return { label: base.displayLabel, color: CATEGORY_COLOR_HEX[base.label] ?? "#64748b" };
}

// 重要性等级 → 标签与样式（统一从 priority-levels 获取元数据）
// 显示门槛：只有「重点内容」及以上且 keyword_score ≥ 40 才返回徽章，防止虚标。
export function getImportanceBadge(
  level: string | null | undefined,
  keywordScore?: number | string | null,
): { label: string; cls: string } | null {
  const meta = getImportanceBadgeMeta(level, keywordScore);
  if (!meta) return null;
  return { label: meta.label, cls: meta.className };
}

// 正文摘要：纯文本处理工具，不依赖 React
export function pickSmartSummary(
  paragraphs: string[],
  matches: Array<{ keyword: string; category: string }>,
): string[] {
  if (!paragraphs || paragraphs.length === 0) return [];
  const keywords = Array.from(new Set(matches.map((m) => m.keyword).filter(Boolean)));
  const signalWords = [
    // AI 工具更新
    "update", "release", "launch", "新功能", "版本", "定价", "功能", "changelog",
    // 机会
    "征集", "比赛", "招募", "申请", "驻留", "资助", "投稿", "截止",
    // 行业
    "版权", "收益", "流媒体", "发行", "算法", "playlist", "playlist pitch",
    // 通用强信号词
    "deadline", "open call", "submission", "grant", "residency", "competition",
  ];
  const tokens = Array.from(new Set([...keywords, ...signalWords]));

  const scored: Array<{ sentence: string; score: number }> = [];
  for (const p of paragraphs) {
    const sentences = p
      .split(/[。！？!?\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12 && s.length <= 200);
    for (const s of sentences) {
      let score = 0;
      for (const t of tokens) if (s.includes(t)) score += 1;
      if (s.length < 20) score -= 1;
      if (s.length > 150) score -= 0.5;
      if (score > 0) scored.push({ sentence: s, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  if (top.length === 0) {
    return paragraphs.slice(0, 2).map((p) => {
      const idx = p.indexOf("。");
      return idx > 10 ? p.slice(0, idx + 1) : p;
    });
  }
  return top.map((t) => t.sentence);
}

// 从正文中提取包含关键词的句子（用于关键词命中详情的上下文展示）
export function extractKeywordContext(
  keyword: string,
  paragraphs: string[],
  maxSnippets: number = 2,
  snippetMaxLen: number = 60,
): string[] {
  if (!keyword || !paragraphs || paragraphs.length === 0) return [];
  const results: string[] = [];

  for (const para of paragraphs) {
    if (results.length >= maxSnippets) break;
    if (!para || para.length < keyword.length) continue;

    const idx = para.indexOf(keyword);
    if (idx === -1) continue;

    let sentence = para;
    const periodMatch = para.slice(idx).search(/[。！？；]/);
    if (periodMatch !== -1) {
      sentence = para.slice(0, idx + periodMatch + 1);
    }
    const beforePeriod = para.lastIndexOf("。", idx - 1);
    if (beforePeriod !== -1) {
      sentence = sentence.slice(beforePeriod + 1);
    }

    if (sentence.length > snippetMaxLen) {
      const leftPad = Math.floor((snippetMaxLen - keyword.length) / 2);
      const start = Math.max(0, idx - leftPad);
      const end = Math.min(sentence.length, start + snippetMaxLen);
      sentence = sentence.slice(start, end);
    }

    results.push(sentence.trim());
  }

  return results;
}

function getKeywordImportance(keyword: string, category: string): string {
  const style = getCategoryStyle(category);
  if (style.tooltip) return style.tooltip;
  return `命中「${keyword}」关键词，属于 ${style.displayLabel} 分类`;
}

// 从真实 item 数据构建关键词命中详情
export function buildKeywordBreakdown(
  categories: Array<{ category: string; score: number; topKeywords?: string[] }>,
  matchedKeywords: Array<{ keyword: string; category: string; weight: number }>,
  paragraphs: string[],
) {
  const categoryBreakdown = (categories || []).map((cat) => {
    const catKeywords = (matchedKeywords || [])
      .filter((kw) => kw.category === cat.category)
      .map((kw) => ({
        keyword: kw.keyword,
        category: kw.category,
        weight: kw.weight,
        importance: getKeywordImportance(kw.keyword, kw.category),
        context: extractKeywordContext(kw.keyword, paragraphs),
      }));

    const hasKeywords = catKeywords.length > 0;
    const fallbackKeywords = (cat.topKeywords || []).slice(0, 3).map((kw) => ({
      keyword: kw,
      category: cat.category,
      weight: Math.max(1, Math.round(cat.score / 3)),
      importance: getKeywordImportance(kw, cat.category),
      context: extractKeywordContext(kw, paragraphs),
    }));

    return {
      category: cat.category,
      score: cat.score,
      keywords: hasKeywords ? catKeywords : fallbackKeywords,
    };
  });

  const totalScore = categoryBreakdown.reduce((sum, c) => sum + c.score, 0);

  return {
    totalScore,
    categoryBreakdown,
  };
}
