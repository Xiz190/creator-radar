// 「创作者视角」生成层：给每条动态生成一句"对独立音乐人意味着什么"。
// 用 OpenAI 兼容协议（DeepSeek），复用 LLM_* 环境变量。
//
// ★ 这里的 DEFAULT_LENS 就是"视角/口吻"的插槽 —— 用户提供她的尺子和口吻样本后，
//   替换/追加到这里即可，不动其他代码。

import fs from "node:fs";
import path from "node:path";

const DEFAULT_LENS = `你在替一个「跨学科独立创作者」读行业动态、写一句点评。她的身份和立场：
- 自己写歌写词、自己唱、也做混音编曲；用 AI 是在**自己投喂的灵感之上**加速，不是让 AI 代替创作。
- 卧室音乐人，在 Logic/Ableton 干活，受过正经混音训练（制作人视角听音：deep/analytical/critical listening、EQ、压缩、声像、gain staging、LUFS）。
- 跨学科：不只做音乐，也自己做 MV/视觉，所以 AI 生图、图生视频、脚本+音乐生视频这些也在她的活里。
- 独立、要恰饭：始终在想"这对我正在产出的东西有没有正效益、能不能变现、能不能攒名气"。

按动态类型，用**她的角度**判断，一句地道中文口语说清"对我意味着什么/怎么用/有什么坑"：

【AI 工具】三条尺子：① 能不能加速我的制作？② 它生成/混出来的质量，会不会替代"我自己写、自己混"的东西（这是她真正的焦虑）？③ 具体怎么上手用（如单乐器音色生成、分段/按秒精修这类实操点）。
　她的独家专长视角（**仅当动态涉及 AI 音乐/乐器/曲风生成时**才带上，别硬塞）：国外工具（Suno 等）在**中国乐器/戏曲**上大概率拉胯——琵琶常被当成吉他、后端多半没在中国传统音乐上深度训练过；电子/流行好生成，中国民乐、戏曲这类精准度差。**但不要停在"别指望"这种废话**——要给使用者真能用上的东西：要么点出**为什么**（训练数据缺中国民乐）、要么给**方向**（该盯哪些平台/工具后续有没有补中国乐器支持、有没有专门的中文/民乐模型可试、或用真录音替代）。
【教程/资源】关注：怎么用 prompt / 官方描述 / 技巧，精确拿到想要的效果；可以带点受过训练的耳朵的判断（别停在"很有用"）。
【机会/变现】分角色看：歌手向(比赛/涨粉→演出驻唱)、全能音乐人向(政府征集/原创作品征集/能变现的活动)、幕后向(合作项目/幕后活)。核心问：对我在产出的东西是不是机会、能不能变现或攒名气。相关性低就**如实提醒并留口子让她自己判**（如"偏传统戏曲，但要是收跨界改编，你做古风可以瞄一眼门槛"），不要替她一杆子判死、不要说"别浪费时间"这种话。

【信息不足时】如果只有标题、没有正文细节，就**保守地点一句、并说明"看不到细节，得点原文确认"**，不要凭标题硬下结论。
【视觉/AI 视频】关注：能不能用来做 MV，以及转场自然、画风匹配、镜头衔接配合歌曲情绪这些实操。

要求：
- **每句必须给"有用的东西"**：一个方法/实操点、一个该关注或该去找的方向、或一个简短的原因。**避免只有态度没有信息的废话**（如"别指望""没戏""玩玩而已"这种空否定）。
- **禁止用"别指望…"这类否定句式开头或收尾**。要表达"它替代不了人工混音"时，改成正面给做法，例如"拿它出草稿、自己 EQ 压缩收尾，混音这步靠你的耳朵把关"，而不是"别指望它替代你混音"。
- 有观点有判断、不客套、不复述标题、不空泛；像跟懂行的朋友说话，但重点是给知识不是耍嘴。
- **人称统一用"你"**（在跟另一个同行创作者说话）；不要用"我/对我这种"自述，也别混着用。
- **准确性优先**：少下具体死数字/参数（BPM、拍号、版本号这类容易记错的），重点给**判断、角度、该关注的方向**；宁可说"这类节奏能直接套进鼓组"，也别编一个可能错的具体 BPM。
- "AI 替代不了人工混音/母带"这个点**只在动态本身宣称能自动混音/母带时才提**，别每条工具都挂，避免重复。
- **长度硬性 ≤40 字**（涉及技术/局限的最多放宽到 50 字）。**只给一个最有用的点**——别把原因、方法、方向一次全塞进去，挑最值的那一个说透，其余舍掉。宁可短而准，不要长而全。
- 工具/教程类直接、短、punchy；不要每条都框在"你的 MV"或"点原文确认"上，换着说、别套路化。
- "AI 替代不了人工混音"这句话**基本别再出现了**（除非动态真宣称自动混音）——重复太多，删。`;

// 英文版的兜底（对应知识文件缺失时用）。与中文 DEFAULT_LENS 是同一把尺子，
// 但是**用英文原生写的**，不是翻译——目标是让英文读起来像母语创作者的判断，
// 而不是从中文转过来的二手句子。
const DEFAULT_LENS_EN = `You read industry news on behalf of an interdisciplinary independent creator and write one line of commentary for her. She writes her own songs, lyrics and vocals, mixes and arranges herself, works in Logic/Ableton, and makes her own MVs and visuals. She uses AI to accelerate on top of her own ideas, never to replace the writing.

Write ONE line, in English, second person ("you"), talking to a peer creator.

Rules:
- **Deliver something usable every time**: a method, a concrete action, a direction to watch, or a short reason. Never write a line that is only attitude.
- A negative judgement is allowed, but it must be followed by a way forward. ❌ "Don't expect it to replace your mixing." ✅ "Pull drafts from it, then finish EQ and compression by ear — the mix stays yours."
- About 18 words. One most-useful point only — don't cram in cause, method and direction at once.
- Don't restate the headline, don't be vague, don't be polite. Write like a knowledgeable friend, but the point is to hand over something usable.
- Only mention "AI can't replace human mixing/mastering" when the story itself claims automatic mixing.`;

// —— 三层知识加载：persona（个人层）+ objective（客观层）+ examples（样例层）
// 真源是 knowledge/lens/*.md —— 改这些文件即可调整视角，不用碰代码。
// 三个文件都读不到时，回退到上面内置的 DEFAULT_LENS，保证生成不崩。
const LENS_DIR = path.join(process.cwd(), "knowledge", "lens");
let cachedLens: string | null = null;

function readLensLayer(file: string): string {
  try {
    return fs
      .readFileSync(path.join(LENS_DIR, file), "utf8")
      .replace(/<!--[\s\S]*?-->/g, "") // 去掉 md 里的 <!-- 说明注释 -->
      .trim();
  } catch {
    return "";
  }
}

// 把三层拼成完整的 system prompt（模块级缓存：同一进程只读一次盘）
export function buildLensPrompt(): string {
  if (cachedLens) return cachedLens;
  const persona = readLensLayer("persona.md");
  const objective = readLensLayer("objective.md");
  const examples = readLensLayer("examples.md");
  // 个人层和客观层都缺 → 文件可能没部署，回退内置默认
  if (!persona && !objective) {
    cachedLens = DEFAULT_LENS;
    return cachedLens;
  }
  cachedLens = [
    persona && `## 你的身份与口吻\n${persona}`,
    objective && `## 客观知识与分析框架\n${objective}`,
    examples && `## 参考范例（照这个口吻和颗粒度写）\n${examples}`,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
  return cachedLens;
}

type LlmConfig = { apiKey: string; baseUrl: string; model: string };

function getLlm(): LlmConfig | null {
  const env = process.env;
  const apiKey = (env.LLM_API_KEY || env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;
  const baseUrl = (env.LLM_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/$/, "");
  const model = (env.LLM_MODEL || "gpt-4o-mini").trim();
  return { apiKey, baseUrl, model };
}

export function hasLlm(): boolean {
  return getLlm() !== null;
}

/**
 * 为单条动态生成"创作者视角一句话"。
 * @param title 标题
 * @param body  正文前几段（截断即可，用于给模型上下文）
 * @param lensSystemPrompt 可覆盖默认视角（用户的尺子/口吻）
 */
export type CreatorAnalysis = { lens: string; valueLevel: "高" | "中" | "低" };

export async function generateCreatorLens(
  title: string,
  body: string,
  lensSystemPrompt: string = buildLensPrompt(),
): Promise<CreatorAnalysis> {
  const cfg = getLlm();
  if (!cfg) throw new Error("LLM 未配置（缺少 LLM_API_KEY）");

  const user =
    `动态标题：${title}\n\n正文摘录：${(body || "").slice(0, 1500)}\n\n` +
    `请分两部分回答：\n` +
    `1) 第一行只输出"价值：高/中/低"——判断这条对独立创作者的价值：` +
    `大厂新模型/重大版本更新/重要创作机会或临近截止 = 高；实用教程/常规工具更新/prompt 技巧 = 中；蹭热点/边缘信息 = 低。\n` +
    `2) 第二行起，按你的口吻规则写创作者视角点评（≤40字）。`;

  const res = await fetch(cfg.baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.apiKey },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.6,
      max_tokens: 200,
      messages: [
        { role: "system", content: lensSystemPrompt },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status} ${t.slice(0, 160)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = (data?.choices?.[0]?.message?.content || "").trim();
  // 第一行解析价值等级，其余为视角句
  const levelMatch = raw.match(/价值[：:]\s*(高|中|低)/);
  const valueLevel = (levelMatch?.[1] as "高" | "中" | "低") || "中";
  const lens = raw
    .replace(/^[\s\S]*?价值[：:]\s*[高中低][^\n]*\n?/, "")
    .trim()
    .replace(/^["「]|["」]$/g, "");
  if (!lens) throw new Error("LLM 无内容返回");
  return { lens, valueLevel };
}

// —— 英文版三层知识（*.en.md）。与中文版各写各的母语，不是互为翻译。 ——
let cachedLensEn: string | null = null;

export function buildLensPromptEn(): string {
  if (cachedLensEn) return cachedLensEn;
  const persona = readLensLayer("persona.en.md");
  const objective = readLensLayer("objective.en.md");
  const examples = readLensLayer("examples.en.md");
  if (!persona && !objective) {
    cachedLensEn = DEFAULT_LENS_EN;
    return cachedLensEn;
  }
  cachedLensEn = [
    persona && `## Who you are and how you talk\n${persona}`,
    objective && `## Objective knowledge and analysis frames\n${objective}`,
    examples && `## Reference examples (match this voice and this grain)\n${examples}`,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
  return cachedLensEn;
}

/**
 * 英文版创作者视角。与 generateCreatorLens 同一套机制，只是系统提示词换成英文层、
 * 用户提示词也用英文——**不要**用它去"翻译"已有中文 lens，那样会得到翻译腔；
 * 应当和中文版一样从原始标题+正文直接生成。
 */
export async function generateCreatorLensEn(
  title: string,
  body: string,
  lensSystemPrompt: string = buildLensPromptEn(),
): Promise<CreatorAnalysis> {
  const cfg = getLlm();
  if (!cfg) throw new Error("LLM 未配置（缺少 LLM_API_KEY）");

  const user =
    `Headline: ${title}\n\nBody excerpt: ${(body || "").slice(0, 1500)}\n\n` +
    `Answer in two parts:\n` +
    `1) First line: output only "Value: high/mid/low" — how much this is worth to an independent ` +
    `creator. Major model releases, significant version updates, important opportunities or ` +
    `closing deadlines = high. Practical tutorials, routine tool updates, prompt tips = mid. ` +
    `Hype or marginal news = low.\n` +
    `2) From the second line on, write the creator-lens commentary in your voice. ` +
    `Write it in English. Around 18 words.`;

  const res = await fetch(cfg.baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.apiKey },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.6,
      max_tokens: 200,
      messages: [
        { role: "system", content: lensSystemPrompt },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status} ${t.slice(0, 160)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = (data?.choices?.[0]?.message?.content || "").trim();
  // 中英文两套价值等级标记都认，避免模型串语言时解析失败
  const levelMatch = raw.match(/Value[：:]\s*(high|mid|low)|价值[：:]\s*([高中低])/i);
  const rawLevel = (levelMatch?.[1] ?? levelMatch?.[2] ?? "").toLowerCase();
  const valueLevel: "高" | "中" | "低" =
    rawLevel === "high" || rawLevel === "高" ? "高" : rawLevel === "low" || rawLevel === "低" ? "低" : "中";
  const lens = raw
    .replace(/^[\s\S]*?(Value[：:]\s*(high|mid|low)|价值[：:]\s*[高中低])[^\n]*\n?/i, "")
    .trim()
    .replace(/^["「]|["」]$/g, "");
  if (!lens) throw new Error("LLM 无内容返回");
  return { lens, valueLevel };
}

export { DEFAULT_LENS, DEFAULT_LENS_EN };
