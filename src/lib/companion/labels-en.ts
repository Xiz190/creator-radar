import { getCategoryStyle } from "@/lib/monitor/content-meta";

/**
 * 分类英文名。与 content-meta 的 CATEGORY_STYLE 一一对应，
 * 但单独放这里——不改动 content-meta 的既有导出，
 * 免得动到断言「13 个 key」「displayLabel !== label」的现有测试。
 *
 * 用词：A/B/C/D 四个信号层分类沿用 screens.html 里已出现的英文
 * （AI Tool Update / Creative Opportunity / Deadline Alert / Industry Watch），
 * 其余 mockup 未展示，按同一「名词短语、首字母大写、无缩写」的语域补齐。
 */
export const CATEGORY_LABEL_EN: Record<string, string> = {
  "A·AI工具更新": "AI Tool Update",
  "B·创作机会": "Creative Opportunity",
  "C·申报截止预警": "Deadline Alert",
  "D·行业观察": "Industry Watch",
  "平台政策/版权": "Policy & Rights",
  "AI音乐生成工具": "Music Generation",
  "视频/视觉AI工具": "Video & Visual",
  "流媒体/发行平台": "Streaming & Distribution",
  "音乐比赛/节庆": "Competitions & Festivals",
  "版权/法律": "Copyright & Legal",
  "海外市场/国际": "Global Market",
  "地方/省级/区域": "Regional",
  "噪音词汇": "Noise",
};

/**
 * 取分类的英文名。
 * 先经 getCategoryStyle 归一（它会处理 legacyMap 里的英文 key），
 * 归一后查不到就回退为归一结果本身。
 */
export function categoryLabelEn(category: string): string {
  if (!category) return "";
  const normalized = getCategoryStyle(category).label;
  // 两道防护，缺一不可：
  // 1) getCategoryStyle 内部的 legacyMap 也是无保护的裸查表，分类名若是原型属性名
  //    （constructor / toString / valueOf / __proto__ 等），命中的是 Object.prototype
  //    上的成员而非 undefined，`?? category` 不会回退，normalized 会原样透传成函数
  //    或对象。这里先拦一道：非字符串一律回退为输入原值。
  if (typeof normalized !== "string") return category;
  // 2) 本文件的 CATEGORY_LABEL_EN 同样是对象字面量，用 hasOwnProperty 查表，
  //    避免字符串 key 命中 Object.prototype 成员而绕过回退。
  return Object.prototype.hasOwnProperty.call(CATEGORY_LABEL_EN, normalized)
    ? CATEGORY_LABEL_EN[normalized]
    : normalized;
}
