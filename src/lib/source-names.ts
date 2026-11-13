// 来源名里只有这几个是中文；英文界面显示 monitor_sources.display_name_en 里的英文名。
// 只换显示文字，筛选/链接仍用原始中文名，保证查询不变。前后端共用。
const SOURCE_NAME_EN: Record<string, string> = {
  "量子位": "QbitAI",
  "国家艺术基金": "China National Arts Fund",
  "中国演出行业协会": "China Performing Arts Association",
};

export function sourceNameFor(name: string | null | undefined, lang: "zh" | "en"): string {
  if (!name) return "";
  return lang === "en" ? SOURCE_NAME_EN[name] ?? name : name;
}

// 栏目名：大多本来就是英文（Blog / RSS / News），只有国家艺术基金的「公告」是中文
const CHANNEL_NAME_EN: Record<string, string> = {
  "公告": "Announcements",
  "通知公告": "Announcements",
  "申报公告": "Calls",
};

export function channelNameFor(name: string | null | undefined, lang: "zh" | "en"): string {
  if (!name) return "";
  return lang === "en" ? CHANNEL_NAME_EN[name] ?? name : name;
}

/** 「N 个栏目」：英文单复数分开 */
export function channelCount(n: number, lang: "zh" | "en"): string {
  return lang === "en" ? `${n} ${n === 1 ? "channel" : "channels"}` : `${n} 个栏目`;
}
