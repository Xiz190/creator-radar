import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  ChartColumn, Construction, FlaskConical, Pencil, Rocket, Target,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Target,
    title: "项目背景与问题定义",
    content: `独立音乐创作者面临信息过载困境：政府补贴、版权政策、AI 工具更新、演出机会等关键情报分散于数十个官方网站，人工逐一翻阅效率极低，极易错过时效性强的申报截止信息。

本项目旨在回答：能否用一个轻量 AI 工具，替代创作者每天花费 1-2 小时的手动信息搜集工作？`,
  },
  {
    icon: Construction,
    title: "技术架构决策",
    content: `**Next.js 16 App Router + TypeScript**：选择 React Server Components + Client 边界分离，保证首屏速度的同时支持丰富的交互。Tailwind CSS v4 驱动视觉系统。

**PostgreSQL 数据库**：监测任务以 cron 方式定时爬取来源，条目先经关键词规则初筛，再经 LLM 创作者视角层做语义解读与价值分级。选 SQL 而非向量数据库，因为这里的"相关性"是结构化的，规则透明可调。

**纯 SVG 图表（无第三方库）**：面积图、折线图、饼图全部手写，避免 bundle size 膨胀，也作为 SVG API 的学习实践。

**CSS Variables 主题系统**：5 色主题通过 --brand 变量 + html[data-accent] 选择器驱动，Tailwind 静态类名无法动态生成，所以核心色全用 style={{ backgroundColor: "var(--brand)" }}。`,
  },
  {
    icon: Pencil,
    title: "设计决策与权衡",
    content: `**信息密度 vs 可扫描性**：收件箱采用"折叠列表 + 展开详情"模式，而非单独详情页。这减少了导航跳转，允许用户快速扫描 + 选择性精读，符合情报消费行为。

**本地优先（Local-first）**：便签、标签、稍后读、置顶、筛选方案、提醒规则全部存 localStorage，零后端依赖，保护用户隐私，离线可用。

**渐进式信息层次**：首页 → 今日必读 → 收件箱列表 → 展开条目 → 信号详情，用户可在任何层次停止，不强迫深入。

**"专注模式"设计理由**：导航栏在阅读长列表时会持续占据注意力，Alt+F 一键收缩成细条，减少认知负担，这是桌面端阅读器的常见模式。`,
  },
  {
    icon: ChartColumn,
    title: "核心功能亮点",
    content: `**16+ 轮迭代，60+ 功能模块**：从基础监测到 AI 分类信号、热力日历、批量操作、数据备份、全局搜索，每轮功能均有 TypeScript 0-error 验收。

**信号雷达分类引擎**：自定义了 5 类信号类别（AI工具更新/创作机会/申报截止预警/行业观察/版权政策），用本地关键词规则做零延迟初筛；深度解读交给 LLM 创作者视角层。两层各司其职：规则层保证快与可控，LLM 层保证语义理解与创作者视角。

**订阅命中系统**：用户可订阅关注的机构和关键词，系统自动计算"命中率"并在首页展示，实现"个性化"而不收集任何行为数据。

**周报生成器**：将本周信号按分类编排成 Markdown 周报，一键复制或下载 .md，面向创作者社群分发。`,
  },
  {
    icon: FlaskConical,
    title: "验证与反思",
    content: `**需求来源（真实，非虚构调研）**：产品需求来自三个真实来源——① **第一人称**：我本身是独立创作者（自己写歌、编曲、混音、做 MV），「AI 工具更新太快、追不动」是我自己的真实痛点；② **同行交流**：与音乐制作人同行的日常交流中，「哪些机会能变现」「这条动态对我有没有用」是反复出现的共同焦虑；③ **情境观察**：创作者社群里，大家分享情报的原始方式仍是「人肉转发链接」，缺少一个带判断的入口。据此确认「AI 工具更新」和「申报截止提醒」为最高频需求。

**局限性认知**：爬虫依赖来源网站结构，站点改版可能导致采集失效；关键词体裁分类准确率受限于规则覆盖度，边缘情况归入"其他"；LLM 视角与评级依赖 prompt 质量，需持续校准；部分源（SPA 死链、强反爬）因端到端不可用被主动排除。

**作品集定位**：本项目展示了"从 0 到 1 构建完整 AI 辅助信息产品"的能力，重点在架构决策、快速迭代、和 UX 与工程的平衡，而非算法深度。`,
  },
  {
    icon: Rocket,
    title: "技术栈总览",
    content: `- **框架**：Next.js 16 (App Router), React 19, TypeScript 5
- **样式**：Tailwind CSS v4, CSS Variables 主题系统
- **数据库**：PostgreSQL (pg), 自建 monitor_sources / monitor_items / monitor_runs 表
- **状态管理**：React Context (PrefsProvider), useState + useRef + useCallback + useMemo
- **图表**：纯 SVG（面积图、折线图、饼图、热力日历）
- **AI 集成**：DeepSeek（LLM）创作者视角层 + 价值分级；本地关键词规则做零延迟初筛
- **PWA**：manifest.json, Apple Web App meta, Service Worker（离线缓存规划中）
- **无障碍**：ARIA labels, 键盘导航 (j/k/r/s), 高对比度模式, 减少动画`,
  },
];

export default function CaseStudyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800">首页</Link>
          <span>/</span>
          <span>Case Study</span>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 mb-4">
            作品集案例 · 2026
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            创作者雷达
          </h1>
          <p className="mt-3 text-lg text-slate-600 leading-relaxed">
            一款为独立音乐创作者设计的 AI 辅助情报平台，自动监测政策、机会与行业动态，将每日 2 小时的信息搜集工作压缩到 5 分钟。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Next.js 15", "TypeScript", "PostgreSQL", "Tailwind CSS v4", "AI 分类引擎", "PWA"].map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "16+", label: "功能迭代轮次" },
            { value: "60+", label: "功能模块" },
            { value: "5 类", label: "信号分类" },
            { value: "0 error", label: "TypeScript 严格验收" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{m.value}</div>
              <div className="mt-1 text-[11px] text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                <s.icon className="h-4 w-4 text-slate-400" aria-hidden />
                <span>{s.title}</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                {s.content.split("\n\n").map((para, i) => (
                  <p key={i} className={para.startsWith("**") ? "font-medium" : ""}>
                    {para.split(/(\*\*[^*]+\*\*)/).map((chunk, j) =>
                      chunk.startsWith("**") && chunk.endsWith("**")
                        ? <strong key={j}>{chunk.slice(2, -2)}</strong>
                        : chunk
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center">
          <div className="text-sm font-medium text-violet-800 mb-1">探索实际功能</div>
          <p className="text-xs text-violet-600 mb-4">本页面描述的所有功能均在当前版本中可用</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/inbox"
              className="rounded-full px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand)" }}
            >
              进入收件箱 →
            </Link>
            <Link
              href="/signals"
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              信号雷达
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
