import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  ChartColumn, Construction, FlaskConical, Pencil, Rocket, Target,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Target,
    title: "项目背景与问题定义",
    content: `独立音乐创作者面对的信息过载：AI 工具更新、创作机会、申报截止、版权政策，散在几十个官方源与社群里，逐站翻又慢又容易错过。创作者雷达自动监测这些源，把每条动态变成一句「对我意味着什么」的创作者视角，交到一个可扫描的收件箱里。

它的姊妹实例是政策雷达（Policy Radar）：同一套流水线与 UI 壳，换成政策域的来源与分类——两个域差得越远，越说明这套方法可复用。

命题：能否用一个轻量工具，替创作者省掉每天逐站刷信息的时间，而不是替 TA 做判断。`,
  },
  {
    icon: Construction,
    title: "技术架构决策",
    content: `**Next.js 16 App Router + TypeScript**：Server/Client 边界分离，首屏与交互兼得。Tailwind CSS v4 驱动视觉。

**PostgreSQL + 两段式处理**：采集层由 GitHub Actions 定时抓取（每 6 小时一次），条目先经关键词规则初筛，再经 LLM 生成创作者视角与价值分级。选 SQL 而非向量库——这里的「相关性」是结构化的，规则透明可调。

**DeepSeek 创作者视角层**：用 OpenAI 兼容协议（LLM_* 环境变量）调 DeepSeek，给每条动态生成一句 ≤40 字的「对独立音乐人意味着什么」——受训的耳朵看混音、跨学科视角看 MV / 视觉、创作者视角问「能不能变现 / 攒名气」。

**纯 SVG 图表 + 单强调色主题**：图表手写避免 bundle 膨胀；两实例同一套 UI 系统、一个 --brand 按领域不同。`,
  },
  {
    icon: Pencil,
    title: "设计决策与权衡",
    content: `**列表扫描 + 独立详情页**：收件箱列表用于扫描，点击进独立详情页 /items/[id] 精读正文与创作者视角。

**本地优先（Local-first）**：个人处理数据（待跟进——含备注、标签、状态，标签库、筛选方案、偏好）存 localStorage。2026-11 把稍后读、置顶、便签、动态资讯标签合并成「待跟进」一套。

**渐进式信息层次**：首页 → 收件箱列表 → 详情页 → 信号雷达，任何层次可停。

**专注模式（Alt+F）**：长列表阅读时一键收起导航，减少认知负担。`,
  },
  {
    icon: ChartColumn,
    title: "核心功能亮点",
    content: `**信号雷达分类引擎（5 类）**：A·AI工具更新 / B·创作机会 / C·申报截止预警 / D·行业观察 / 平台政策版权。本地关键词规则做零延迟初筛，深度解读交给 LLM 创作者视角层——规则层保证快与可控，LLM 层保证语义与视角。

**创作者视角**：每条动态一句地道判断，用「你」的口吻给方法、方向或原因，而不是复述标题。

**关注命中**：关注机构 / 关键词 / 分类，命中自动标重点并置顶收件箱，仪表盘显示命中概览。

**日报邮件**：每天 08:40（北京时间）把当日动态编排成日报，经 Resend 发到邮箱——收件箱之外，多一条不打开网页也能扫的通道。

**手机版 /m**：移动端 feed / 详情 / 收藏 / 最近，路上快速扫。`,
  },
  {
    icon: FlaskConical,
    title: "验证与反思",
    content: `**需求来源（真实，非虚构）**：① 第一人称——我本人是独立创作者（自己写歌、编曲、混音、做 MV），「AI 工具更新太快追不动」是真实痛点；② 同行交流——「哪些机会能变现」「这条对我有没有用」是反复出现的焦虑；③ 社群观察——大家分享情报仍是「人肉转链接」，缺一个带判断的入口。据此把「AI 工具更新」「申报截止」定为最高频。

**局限（主动取舍）**：采集依赖来源结构，站点改版可能失效——已做来源健康检查，坏了标红发邮件；关键词分类准确率受规则覆盖度限制，边缘归「其他」；创作者视角依赖 prompt，需持续校准；部分源（SPA 死链、强反爬）端到端不可用已排除。

**作品集定位**：展示「从 0 到 1 构建完整 AI 辅助信息产品」的能力——重点在架构决策、快速迭代、UX 与工程平衡，而非算法深度。`,
  },
  {
    icon: Rocket,
    title: "技术栈总览",
    content: `- **框架**：Next.js 16 (App Router), React 19, TypeScript 5
- **样式**：Tailwind CSS v4, CSS Variables 单强调色主题
- **数据库**：PostgreSQL (pg), monitor_sources / monitor_items / monitor_runs
- **状态管理**：React Context (PrefsProvider) + hooks
- **图表**：纯 SVG（面积 / 折线 / 饼 / 热力日历）
- **AI**：DeepSeek（OpenAI 兼容协议）创作者视角 + 价值分级；本地关键词规则初筛
- **采集 / 邮件**：GitHub Actions（抓取 6h + 日报邮件 Resend）+ 来源健康检查
- **PWA**：manifest.json, Apple Web App meta, Service Worker
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
            一款为独立音乐创作者做的 AI 辅助情报平台：自动监测 AI 工具、创作机会、申报截止与行业动态，把每天逐站翻信息的时间省下来，交到一个带判断的订阅流里。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Next.js 16", "TypeScript", "PostgreSQL", "Tailwind CSS v4", "DeepSeek 创作者视角", "PWA"].map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "5 类", label: "信号分类" },
            { value: "6h", label: "定时采集周期" },
            { value: "每日", label: "日报邮件" },
            { value: "1 句", label: "创作者视角" },
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
