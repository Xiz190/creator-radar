// 创作者信号：从标题/正文里认出"这条对创作者意味着什么"的五类事实。
// 对比页、信号侧栏、AI 分析的规则兜底共用这一套，避免各写各的正则。
// 只做关键词识别，不做判断——命中只说明"文中提到了"，界面上要这么表述。

export type CreatorSignalKey = "newFeature" | "pricing" | "opportunity" | "deadline" | "copyright";

export const CREATOR_SIGNAL_KEYS: CreatorSignalKey[] = ["newFeature", "pricing", "opportunity", "deadline", "copyright"];

export const CREATOR_SIGNAL_LABELS: Record<CreatorSignalKey, { zh: string; en: string }> = {
  newFeature: { zh: "新功能 / 新版本", en: "New feature or version" },
  pricing: { zh: "定价 / 额度", en: "Pricing or credits" },
  opportunity: { zh: "比赛 / 资助 / 征集", en: "Contest, grant or open call" },
  deadline: { zh: "截止日期", en: "Deadline" },
  copyright: { zh: "版权 / 授权", en: "Copyright or licensing" },
};

const PATTERNS: Record<CreatorSignalKey, RegExp> = {
  newFeature: /新功能|新版本|新模型|上线|推出|发布了|开源|open[- ]sourc|launch(?:es|ed)?\b|introduc(?:es|ing)\b|now available|new (?:model|feature|version)|\bv\d+(?:\.\d+)?\b/i,
  pricing: /定价|价格|涨价|降价|免费额度|订阅|积分|pricing|\bprice[sd]?\b|subscription|free tier|credits?\b|\$\d|\d+(?:\.\d+)?\s*元/i,
  opportunity: /比赛|大赛|征集|招募|投稿|驻留|资助|奖金|基金|competition|contest|\bgrant\b|residency|open call|submissions?\b|\bprize\b|fellowship|\bfund(?:ing)?\b/i,
  deadline: /截止|报名时间|倒计时|deadline|closing date|apply by|last day|due (?:by|on)\b/i,
  copyright: /版权|授权|侵权|诉讼|训练数据|版税|copyright|licens(?:e|ing)|lawsuit|royalt(?:y|ies)|infring|training data/i,
};

export type CreatorSignals = Record<CreatorSignalKey, boolean>;

export function detectCreatorSignals(input: {
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  deadlineDate?: string | null;
}): CreatorSignals {
  const text = [input.title, input.summary, input.content].filter(Boolean).join(" \n ");
  const out = {} as CreatorSignals;
  for (const key of CREATOR_SIGNAL_KEYS) out[key] = PATTERNS[key].test(text);
  if (input.deadlineDate) out.deadline = true;
  return out;
}

export function creatorSignalLabel(key: CreatorSignalKey, lang: "zh" | "en"): string {
  return CREATOR_SIGNAL_LABELS[key][lang];
}
