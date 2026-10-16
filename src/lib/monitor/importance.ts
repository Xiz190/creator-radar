// 价值档位的唯一规则：关键词打分 × LLM 判断 → 最终档位（importance_level）。
//
// 两套判断各存一列，最终档位每次都由这两列重新算出，不再「谁最后写入算谁」：
//   - keyword_level：关键词打分给的档位（scanner 写）。能识别「工具名 × 发布动词 × 版本号」这类重大发布，
//     但看不懂内容，跟创作无关的泛 AI 新闻也会拿高分。
//   - llm_value_level：LLM 生成创作者视角时给的「高 / 中 / 低」（backfill-lens 写）。能看懂内容，但只有三档。
//
// 规则（2026-10-16 定，方案 B）：
//   - 以 LLM 为准：高→重点、中→中等、低→普通
//   - 关键词判「核心」时：LLM 高→核心；LLM 中→重点（重大发布不被压到中等）；LLM 低→普通（无关新闻照样降下去）
//   - 还没有 LLM 判断时，用关键词档位

export type ImportanceLevel = "核心关注" | "重点内容" | "中等重点" | "普通内容";
export type LlmValueLevel = "高" | "中" | "低";

export function combineImportance(
  keywordLevel: string | null | undefined,
  llmValue: string | null | undefined,
): ImportanceLevel {
  const kwCore = keywordLevel === "核心关注";
  if (llmValue === "高") return kwCore ? "核心关注" : "重点内容";
  if (llmValue === "中") return kwCore ? "重点内容" : "中等重点";
  if (llmValue === "低") return "普通内容";
  return isImportanceLevel(keywordLevel) ? keywordLevel : "普通内容";
}

function isImportanceLevel(v: string | null | undefined): v is ImportanceLevel {
  return v === "核心关注" || v === "重点内容" || v === "中等重点" || v === "普通内容";
}
