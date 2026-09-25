// 本地智能问答引擎：关键词匹配 + 信号识别

export interface SearchResultItem {
  sourceId: string;
  url: string;
  title: string;
  summary?: string;
  listPublishedAt?: string;
  departmentName: string;
  channelName: string;
  keywordScore?: number;
  signals: string[];
  forecastHigh?: string;
  forecastMidHigh?: string;
  forecastMid?: string;
  forecastLow?: string;
  topCategories?: Array<{ category: string; score: number }>;
  hitParagraphs?: Array<{ idx: number; snippet: string }>;
}

export interface SearchResult {
  items: SearchResultItem[];
  matchedSignals: string[];
  totalCount: number;
}

export interface SignalAnalysisResult {
  hasFunding: boolean;
  hasProcurement: boolean;
  hasPilot: boolean;
  hasStandards: boolean;
  hasAnySignal: boolean;
  matchedKeywords: string[];
  summary: string;
}

// 机会信号关键词库（创作者雷达 · 领域化）
// 说明：字段名 funding/procurement/pilot/standards 沿袭政策版外壳未改，语义已换为音乐人的四类机会信号：
//   资金/资助 · 征集/投递 · 演出/曝光 · 平台/版权
const SIGNAL_KEYWORDS: Record<string, string[]> = {
  funding: [
    "资助", "奖金", "奖补", "补贴", "创作基金", "扶持计划",
    "经费", "拨款", "奖学金", "资金支持", "基金申报", "资助申请",
  ],
  procurement: [
    "征集", "招募", "投稿", "投递", "报名", "申报", "申请",
    "海选", "入围", "征稿", "开放申请", "接受投稿", "招新",
  ],
  pilot: [
    "演出", "巡演", "音乐会", "音乐节", "展演", "Showcase",
    "首演", "现场", "Livehouse", "音乐季", "音乐周",
  ],
  standards: [
    "版权", "平台政策", "分成", "版税", "授权", "上架",
    "发行", "收益分成", "流媒体政策", "内容政策", "下架", "曲库",
  ],
};

// 领域/分类关键词（用于从提问推断关心的音乐情报主题，标签对齐 content-meta 的分类）
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "A·AI工具更新": ["AI工具", "工具更新", "新版本", "Suno", "Udio", "Runway", "HeyGen", "Stable Audio", "定价"],
  "B·创作机会": ["征集", "招募", "比赛", "音乐节", "演出", "投稿", "驻留", "资助", "报名", "机会"],
  "D·行业观察": ["行业报告", "市场", "趋势", "数据", "报告", "流媒体", "榜单", "观察"],
  "平台政策/版权": ["版权", "平台政策", "分成", "版税", "授权", "发行", "规则"],
  "海外市场/国际": ["国际", "海外", "全球", "出海", "欧美", "日韩", "东南亚"],
};

export class ChatEngine {
  async searchAndAnalyze(query: string): Promise<SearchResult> {
    // 1. 调用后端 API 搜索数据库
    const searchResults = await this.searchDatabase(query);

    // 2. 对搜索结果进行信号分析
    const analyzedItems = searchResults.map((item) => {
      const analysis = this.analyzeContent(item.title, item.summary || "");
      return {
        ...item,
        signals: this.mapSignals(analysis),
      } as SearchResultItem;
    });

    // 3. 按关键词匹配度排序
    const sortedItems = analyzedItems
      .map((item) => ({
        item,
        score: this.calculateMatchScore(query, item),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    return {
      items: sortedItems,
      matchedSignals: this.extractSignals(query),
      totalCount: sortedItems.length,
    };
  }

  private async searchDatabase(query: string): Promise<SearchResultItem[]> {
    try {
      const response = await fetch(`/api/chat/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await response.json()) as { ok?: boolean; items?: unknown[] };
      if (data.ok && Array.isArray(data.items)) {
        return data.items as SearchResultItem[];
      }
      return [];
    } catch (err) {
      console.warn("[chatbot] 搜索接口调用失败：",
        err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  // ============ 多文档 RAG：用检索到的 items 作为上下文，调用 LLM，失败时回落规则版
  async askAnswer(question: string, items: SearchResultItem[], lang: "zh" | "en" = "zh"): Promise<{
    answer: string;
    source: "llm" | "rule";
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/chat/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, items, lang }),
      });
      const data = await response.json();
      if (data.ok) {
          return { answer: data.answer, source: data.source || "rule", error: data.error };
      }
      console.warn("[chatbot] askAnswer 接口返回 ok=false，回退规则版：", data.message);
      return { answer: this.fallbackRule(question, items), source: "rule", error: data.message };
    } catch (e) {
      console.warn("[chatbot] askAnswer 接口调用异常，回退规则版：",
        e instanceof Error ? e.message : String(e));
      return { answer: this.fallbackRule(question, items), source: "rule", error: e instanceof Error ? e.message : String(e) };
    }
  }

  private fallbackRule(question: string, items: SearchResultItem[]): string {
    const top = (items || []).slice(0, 3);
    if (top.length === 0) return `未找到匹配内容；建议尝试更具体的关键词（如「资金」「试点」「标准」）。`;
    const lines: string[] = [`围绕「${question}」，在动态资讯中找到 ${top.length} 篇可能相关的内容：`];
    for (let i = 0; i < top.length; i++) {
      const it = top[i];
      lines.push("");
      lines.push(`${i + 1}.《${it.title}》`);
      const meta = [it.departmentName, it.channelName].filter(Boolean).join(" · ");
      if (meta) lines.push(`   · 来源：${meta}`);
      const paras = (it.hitParagraphs || []).slice(0, 2);
      if (paras.length > 0) for (const p of paras) lines.push(`   · ${p.snippet}`);
      else if (it.summary) lines.push(`   · ${String(it.summary).slice(0, 180)}`);
    }
    return lines.join("\n");
  }

  analyzeContent(title: string, content: string): SignalAnalysisResult {
    const fullText = `${title} ${content}`.toLowerCase();

    const matched: Record<string, boolean> = {
      funding: false,
      procurement: false,
      pilot: false,
      standards: false,
    };

    const allMatchedKeywords: string[] = [];

    for (const [signalType, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword.toLowerCase())) {
          matched[signalType] = true;
          if (!allMatchedKeywords.includes(keyword)) {
            allMatchedKeywords.push(keyword);
          }
        }
      }
    }

    const hasAnySignal = Object.values(matched).some(Boolean);

    // 生成简要摘要
    let summary = "";
    if (hasAnySignal) {
      const detected: string[] = [];
      if (matched.funding) detected.push("资金/资助");
      if (matched.procurement) detected.push("征集/投递");
      if (matched.pilot) detected.push("演出/曝光");
      if (matched.standards) detected.push("平台/版权");
      summary = `检测到${detected.length}类创作者机会信号：${detected.join("、")}`;
    } else {
      summary = "内容中未发现明显的机会/信号关键词。";
    }

    return {
      hasFunding: matched.funding,
      hasProcurement: matched.procurement,
      hasPilot: matched.pilot,
      hasStandards: matched.standards,
      hasAnySignal,
      matchedKeywords: allMatchedKeywords,
      summary,
    };
  }

  private mapSignals(analysis: SignalAnalysisResult): string[] {
    const signals: string[] = [];
    if (analysis.hasFunding) signals.push("资金/资助");
    if (analysis.hasProcurement) signals.push("征集/投递");
    if (analysis.hasPilot) signals.push("演出/曝光");
    if (analysis.hasStandards) signals.push("平台/版权");
    return signals;
  }

  private calculateMatchScore(query: string, item: SearchResultItem): number {
    const queryLower = query.toLowerCase();
    const titleLower = item.title.toLowerCase();
    const summaryLower = (item.summary || "").toLowerCase();
    let score = 0;

    // 关键词匹配
    const queryWords = queryLower.split(/[\s，,。.!?！？、；;]+/).filter(Boolean);
    for (const word of queryWords) {
      if (titleLower.includes(word)) score += 10;
      if (summaryLower.includes(word)) score += 5;
    }

    // 按时间新鲜度加分（越新越高）
    if (item.listPublishedAt) {
      try {
        const date = new Date(item.listPublishedAt);
        const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo < 30) score += 20;
        else if (daysAgo < 90) score += 10;
        else if (daysAgo < 180) score += 5;
      } catch {
        // ignore
      }
    }

    // 有预估判断的加分
    if (item.forecastHigh || item.forecastMidHigh) score += 15;

    // 信号数量加分
    score += item.signals.length * 3;

    return score;
  }

  private extractSignals(query: string): string[] {
    const lower = query.toLowerCase();
    const signals: string[] = [];

    // 检查行业关键词
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          signals.push(this.mapCategoryLabel(category));
          break;
        }
      }
    }

    // 检查信号关键词
    if (SIGNAL_KEYWORDS.funding.some((k) => lower.includes(k))) signals.push("资金/资助");
    if (SIGNAL_KEYWORDS.procurement.some((k) => lower.includes(k))) signals.push("征集/投递");
    if (SIGNAL_KEYWORDS.pilot.some((k) => lower.includes(k))) signals.push("演出/曝光");
    if (SIGNAL_KEYWORDS.standards.some((k) => lower.includes(k))) signals.push("平台/版权");

    return signals;
  }

  private mapCategoryLabel(category: string): string {
    // CATEGORY_KEYWORDS 的 key 已直接用 content-meta 的中文标签，无需再映射
    return category;
  }
}