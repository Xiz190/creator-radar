import { getDoubaoClient, DoubaoChatMessage } from "./doubao";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ContentAnalyzer");

export interface ContentAnalysisResult {
  forecastHigh: string | null;
  forecastMidHigh: string | null;
  forecastMid: string | null;
  forecastLow: string | null;
  reasoning: string | null;
  confidence: number;
  keySignals: string[];
  /** 结果来源：doubao=豆包 SDK、llm=LLM_* 环境变量 HTTP、rule=关键词规则降级 */
  source: "doubao" | "llm" | "rule";
  /** 失败时的说明（前端可选择性展示） */
  errorHint?: string;
}

export interface AnalysisInput {
  title: string;
  content: string;
  summary?: string | null;
  matchedSignals?: string[];
}

/** 基于分类名 → 对应的"高确定性"推断模板 */
const HIGH_CERTAINTY_RULES: Record<string, string> = {
  "A·AI工具更新": "该 AI 工具已发布新功能/新版本，独立创作者可立即尝试，关注是否影响现有工作流程或定价。",
  "B·创作机会": "当前存在可申请的创作机会（比赛/驻留/资助），建议确认截止日期并评估是否符合申请资格。",
  "C·申报截止预警": "距离截止日期已非常近，如有意向应立即行动，准备申请材料并提交。",
  "D·行业观察": "行业动态已明确，建议关注对创作收益/发行策略的潜在影响。",
  "平台政策/版权": "平台规则或版权政策已更新，需要评估对现有发行和收益分配的影响。",
  "AI音乐生成工具": "涉及 AI 音乐生成工具，建议关注后续功能迭代和竞争格局变化。",
  "视频/视觉AI工具": "涉及 AI 视频/视觉工具，对 MV 制作和宣传物料工作流有参考价值。",
  "流媒体/发行平台": "涉及流媒体或发行平台，后续可能有算法调整、版税变化或收益政策更新。",
  "音乐比赛/节庆": "涉及比赛或演出机会，需确认参赛资格和报名截止时间。",
  "版权/法律": "涉及版权或法律事项，建议了解对 AI 生成内容商业使用的具体影响。",
};

// ============ LLM（OpenAI 兼容）调用：与 src/app/api/chat/answer 共用 LLM_* 环境变量 ============
type LlmConfig = { apiKey: string; baseUrl: string; model: string; temperature: number; maxTokens: number };

function getLlmConfig(): LlmConfig | null {
  // 同时兼容 node process.env 与 Next.js 的环境变量读取
  const env = (typeof process !== "undefined" && (process.env as Record<string, string | undefined>)) || {};
  const apiKey = (env.LLM_API_KEY || env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;
  const baseUrl = (env.LLM_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/$/, "");
  const model = (env.LLM_MODEL || "gpt-4o-mini").trim();
  const temperature = parseFloat(env.LLM_TEMPERATURE || "0.2");
  const maxTokens = parseInt(env.LLM_MAX_TOKENS || "800", 10);
  return { apiKey, baseUrl, model, temperature, maxTokens };
}

async function callLlm(system: string, user: string): Promise<string> {
  const cfg = getLlmConfig();
  if (!cfg) throw new Error("LLM 未配置（缺少 LLM_API_KEY）");
  const url = cfg.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + cfg.apiKey,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("LLM " + res.status + " " + errText.slice(0, 200));
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = (data?.choices?.[0]?.message?.content || "").trim();
  if (!raw) throw new Error("LLM 无内容返回");
  return raw;
}


export class ContentAnalyzer {
  private client: ReturnType<typeof getDoubaoClient>;

  constructor() {
    this.client = getDoubaoClient();
  }

  /** 是否走 AI 分析（true）还是关键词规则降级（false） */
  hasAI(): boolean {
    return !!this.client || !!getLlmConfig();
  }

  private buildSystemPrompt(): DoubaoChatMessage {
    return {
      role: "system",
      content: `你是一位专注于独立音乐人与 AI 创作工具的情报分析助手。你从 AI 工具博客、创作机会公告、流媒体行业新闻、版权政策文件等内容中提取对独立音乐人最有实用价值的信号，并进行前瞻性预判。

## 你的任务
基于提供的内容，从独立音乐人视角分析：这条信息对创作工具选择、创作机会把握、发行策略、版权收益有什么具体影响？接下来最可能发生什么？

## 分析框架
请按照以下四个确定性级别进行分析：

### 高确定性（forecastHigh）
- 内容中明确提到的功能上线时间、报名截止日、定价生效日期
- 已经发布的功能变化或政策调整，可以立即采取行动

### 中高确定性（forecastMidHigh）
- 根据内容可以合理推断的下一步动作（如：发布了 v4，v4.1 的功能方向可推测）
- 类似工具发布规律推断的后续更新节奏
- 已公示的比赛/资助后续环节（如：报名后的评审、公示时间）

### 中确定性（forecastMid）
- 对创作工具市场格局的潜在影响
- 版权/收益政策变化对发行策略的中期影响
- 需要持续观察的信号

### 低确定性（forecastLow）
- 行业长期趋势
- 技术方向的潜在演变
- 需要更多信息才能判断的事项

## 输出要求
1. 分析必须基于提供的内容，不要凭空编造
2. 每个级别都要有明确的依据，用独立音乐人能直接理解的语言
3. 输出格式必须为 JSON，包含以下字段：
   - forecastHigh: 高确定性预测（100字以内）
   - forecastMidHigh: 中高确定性预测（100字以内）
   - forecastMid: 中确定性预测（100字以内）
   - forecastLow: 低确定性预测（100字以内）
   - reasoning: 推理依据（200字以内）
   - confidence: 整体置信度分数（0-100）
   - keySignals: 识别到的关键信号关键词数组

请直接输出 JSON，不要附加任何 markdown 代码块或解释文字。`,
    };
  }

  private buildUserPrompt(input: AnalysisInput): string {
    const contentText =
      (input.summary && input.summary.trim().length > 0 ? input.summary : input.content || "").slice(0, 800);
    const signalsText = (input.matchedSignals && input.matchedSignals.length > 0)
      ? input.matchedSignals.slice(0, 10).join("、")
      : "无";
    return `请分析以下内容并进行预判：

【标题】
${input.title || "（无标题）"}

【识别到的信号分类】
${signalsText}

【正文（节选）】
${contentText}

请按照要求的 JSON 格式输出分析结果。`;
  }

  async analyze(input: AnalysisInput): Promise<ContentAnalysisResult> {
    // 1) 优先走豆包 SDK；2) 其次走 OpenAI 兼容的 LLM_* 环境变量；3) 都不可用则走关键词规则降级。
    // 整体包裹一层超时：单条分析最多 45 秒，超过则回退到规则版
    let finished = false;
    let fallbackTimer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<ContentAnalysisResult>((resolve) => {
      const timeout = setTimeout(() => {
        if (!finished) {
          const base = this.getRuleBasedResult(input);
          resolve({ ...base, errorHint: "单条分析超时，已回退规则版" });
        }
      }, 45000);
      fallbackTimer = timeout;
    });

    const runAnalysis = async (): Promise<ContentAnalysisResult> => {
      try {
        if (this.client) {
          try {
            const messages: DoubaoChatMessage[] = [
              this.buildSystemPrompt(),
              { role: "user", content: this.buildUserPrompt(input) },
            ];
            const response = await this.client.chatCompletion(messages, "Ernie-4.0");
            const result = this.parseJsonResponse(response);
            return { ...result, source: "doubao" };
          } catch (error) {
            logger.warn("豆包 AI 分析失败，已回退至 LLM / 关键词规则", { error });
          }
        }

        if (getLlmConfig()) {
          try {
            const system = this.buildSystemPrompt().content;
            const user = this.buildUserPrompt(input);
            const response = await callLlm(system, user);
            const result = this.parseJsonResponse(response);
            return { ...result, source: "llm" };
          } catch (error) {
            logger.warn("LLM 调用失败，已回退关键词规则", { error });
          }
        }

        return { ...this.getRuleBasedResult(input), source: "rule" };
      } catch (err) {
        logger.warn("分析异常，已回退关键词规则", { err });
        return { ...this.getRuleBasedResult(input), source: "rule" };
      }
    };

    const result = await Promise.race([runAnalysis(), timeoutPromise]);
    finished = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    return result;
  }

  /** 从大模型返回文本里尽可能宽松地解析 JSON */
  private parseJsonResponse(raw: string): ContentAnalysisResult {
    if (!raw || typeof raw !== "string") {
      throw new Error("AI 返回为空");
    }
    let text = raw.trim();

    // 去掉 ```json ... ``` / ``` ... ``` 包裹
    const codeBlock = text.match(/```(?:json)?[\s\S]*?```/i);
    if (codeBlock) {
      text = codeBlock[0].replace(/```(?:json)?/gi, "").trim();
    }

    // 取第一个 { 到最后一个 } 之间的内容
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      text = text.slice(first, last + 1);
    }

    const parsed = JSON.parse(text);
    return this.normalizeResult(parsed);
  }

  private normalizeResult(raw: Record<string, unknown>): ContentAnalysisResult {
    return {
      forecastHigh: String(raw.forecastHigh || "").trim() || null,
      forecastMidHigh: String(raw.forecastMidHigh || "").trim() || null,
      forecastMid: String(raw.forecastMid || "").trim() || null,
      forecastLow: String(raw.forecastLow || "").trim() || null,
      reasoning: String(raw.reasoning || "").trim() || null,
      confidence: typeof raw.confidence === "number" ? raw.confidence : 60,
      keySignals: Array.isArray(raw.keySignals)
        ? (raw.keySignals as unknown[]).map((s) => String(s)).filter(Boolean)
        : [],
      source: (raw.source === "doubao" || raw.source === "llm" ? raw.source : "llm"),
    };
  }

  /** 纯关键词规则的降级结果 — 依据信号分类给一份可编辑的起始建议 */
  private getRuleBasedResult(input: AnalysisInput): ContentAnalysisResult {
    const signals = input.matchedSignals || [];
    const title = input.title || "";

    // 按分类匹配高确定性推断（取前 2 个命中分类）
    const matchedCategories = signals.filter((s) => HIGH_CERTAINTY_RULES[s]);
    const highLines = matchedCategories.slice(0, 2).map((s) => HIGH_CERTAINTY_RULES[s]);

    // 文本级关键词信号检测
    const fullText = ((input.summary || "") + " " + (input.content || "")).toLowerCase();
    const hasDeadline = /截止|deadline|closing|last day|倒计时/.test(fullText) || signals.some((s) => /截止|deadline/.test(s));
    const hasOpportunity = /比赛|征集|招募|投稿|驻留|资助|奖金|competition|grant|residency/.test(fullText) || signals.some((s) => /比赛|机会|资助/.test(s));
    const hasPricing = /定价|价格|涨价|降价|免费额度|pricing|subscription/.test(fullText) || signals.some((s) => /定价|价格/.test(s));
    const hasNewFeature = /新功能|版本|更新|发布|launch|release|update/.test(fullText) || signals.some((s) => /AI工具|更新/.test(s));
    const hasTimeline = /(\d{1,2}\s*月|年内|近期|\d{4}[\s年])/.test(input.summary || input.content || "");

    const forecastHigh = highLines.length > 0
      ? highLines.join("；")
      : "内容已发布，建议立即确认是否对你的工作流或创作计划有直接影响。";

    const midHighParts: string[] = [];
    if (hasDeadline) midHighParts.push("截止日期临近，若有申请意向应立即准备材料并确认提交渠道。");
    if (hasNewFeature) midHighParts.push("新功能已上线或即将上线，建议在下次创作时测试是否适合融入工作流。");
    if (hasPricing) midHighParts.push("定价/订阅政策有变化，建议评估是否影响当前订阅计划或切换时机。");
    const forecastMidHigh = midHighParts.length > 0 ? midHighParts.join("；") : "后续可能有配套公告或跟进信息，建议订阅该来源以保持更新。";

    const midParts: string[] = [];
    if (hasOpportunity) midParts.push("该机会可能吸引较多申请者，建议提前了解评审标准并准备差异化的作品亮点。");
    if (hasTimeline) midParts.push("内容提到了明确时间节点，建议加入日历提醒以防错过。");
    const forecastMid = midParts.length > 0 ? midParts.join("；") : "具体影响和时间节奏还需观察后续跟进信息。";

    const forecastLow =
      "如果该趋势持续，长期可能影响 AI 音乐工具市场格局或独立音乐人的创作/发行方式，但当前尚无法判断具体时间与力度。";

    const reasoningParts: string[] = [];
    reasoningParts.push(`「${title.slice(0, 40)}」`);
    if (matchedCategories.length > 0) {
      reasoningParts.push(`识别到的信号分类：${matchedCategories.slice(0, 3).join("、")}。`);
    }
    const detected: string[] = [];
    if (hasDeadline) detected.push("截止日期");
    if (hasOpportunity) detected.push("创作机会");
    if (hasPricing) detected.push("定价变化");
    if (hasNewFeature) detected.push("新功能/更新");
    if (detected.length > 0) reasoningParts.push(`检测到信号：${detected.join("、")}。`);
    reasoningParts.push("以上为关键词规则自动生成，建议结合原文进一步判断。");
    const reasoning = reasoningParts.join(" ");

    const signalKeywords = matchedCategories.length > 0 ? matchedCategories : signals;

    return {
      forecastHigh,
      forecastMidHigh,
      forecastMid,
      forecastLow,
      reasoning,
      confidence: matchedCategories.length >= 2 ? 65 : matchedCategories.length >= 1 ? 55 : 40,
      keySignals: signalKeywords.slice(0, 8),
      source: "rule",
    };
  }

  async batchAnalyze(inputs: AnalysisInput[]): Promise<ContentAnalysisResult[]> {
    const results: ContentAnalysisResult[] = new Array(inputs.length);
    const concurrency = 3; // 最多并发 3 条分析
    let cursor = 0;
    // 箭头函数，捕获 this （避免 TS this 隐式 any）
    const worker = async (): Promise<void> => {
      while (true) {
        const i = cursor++;
        if (i >= inputs.length) return;
        try {
          results[i] = await this.analyze(inputs[i]);
        } catch (err) {
          logger.warn("batchAnalyze 单条失败，已回退规则", { err });
          results[i] = { ...this.getRuleBasedResult(inputs[i]), source: "rule" };
        }
      }
    };
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, inputs.length); i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    return results;
  }
}

let cachedAnalyzer: ContentAnalyzer | null = null;

export function getContentAnalyzer(): ContentAnalyzer {
  if (cachedAnalyzer) return cachedAnalyzer;
  cachedAnalyzer = new ContentAnalyzer();
  return cachedAnalyzer;
}