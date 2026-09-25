import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "方法说明 · 创作者雷达",
  description: "创作者雷达如何识别信号、如何给内容评分、创作者视角如何生成——后台方法的一次性说明。",
};

// 单独成页，不塞进每篇详情：这些是「后台怎么工作」的说明，
// 对日常阅读是噪音，只对想了解机制的人（含作品集评审）有用。

type Section = { title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    title: "为什么单独成页",
    body: (
      <p>
        识别、评分、权重这些是「后台怎么工作」的说明，对日常阅读一条动态没有帮助，反而是干扰。
        所以每篇详情页只保留对创作者有用的东西（正文、创作者视角、相关文章），把机制说明收在这里，讲一次。
      </p>
    ),
  },
  {
    title: "两层判断：规则层 + LLM 层",
    body: (
      <div className="space-y-2">
        <p>
          每条动态先过<strong>规则层</strong>：用关键词与信号词做零延迟初筛，判断它属于哪些分类、命中哪些机会信号。
          规则透明、可调、可解释——同样的输入永远得到同样的结果。
        </p>
        <p>
          再过 <strong>LLM 层</strong>：调 DeepSeek 为它生成一句「创作者视角」，并给出价值分级。
          语义理解交给模型，快与可控交给规则，两层各司其职。
        </p>
      </div>
    ),
  },
  {
    title: "评分与权重机制",
    body: (
      <div className="space-y-3">
        <p>
          每条动态有一个<strong>关键词基础分</strong>（命中的关键词按权重累加），再叠加几项小幅加权：
        </p>
        <ul className="space-y-1.5">
          <li className="flex gap-2"><span className="shrink-0 text-slate-400">·</span><span>命中标题结构（正式标题、明确主题）<strong> +8</strong></span></li>
          <li className="flex gap-2"><span className="shrink-0 text-slate-400">·</span><span>命中强主题（核心关注领域的高权重关键词）<strong> +5</strong></span></li>
          <li className="flex gap-2"><span className="shrink-0 text-slate-400">·</span><span>命中风险 / 时效信号（截止、征集这类需要尽快看的）<strong> +10</strong></span></li>
        </ul>
        <p>叠加后按门槛分级：</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "核心关注", th: "≥ 90" },
            { label: "重点内容", th: "≥ 50" },
            { label: "中等重点", th: "≥ 20" },
            { label: "普通内容", th: "< 20" },
          ].map((x) => (
            <div key={x.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-sm font-semibold text-slate-900">{x.label}</div>
              <div className="mt-0.5 text-xs text-slate-500">{x.th}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          两条防虚标规则：① 只有标题、没抓到正文的，不会进入「核心关注」（降一级）；
          ② 原始关键词分低于 40 的，即使算出高等级也不显示徽章——避免靠加权把弱内容抬高。
        </p>
      </div>
    ),
  },
  {
    title: "创作者视角怎么生成",
    body: (
      <div className="space-y-2">
        <p>
          「创作者视角」不是文章摘要，而是「这条<strong>对你这个创作者</strong>意味着什么／怎么用／有什么坑」。
          它由 LLM 基于三层知识库生成：个人层（你的身份与口吻）、客观层（带来源标注的分析框架）、样例层（参照的口吻与颗粒度）。
        </p>
        <p>
          模型只出草稿，<strong>判断与取舍由人把关</strong>：偏了的、抓错重点的，由我人工改准。
          这和我做音乐的方法一致——AI 加速执行，作者主导判断。所以视角有一个人工校准层，而不是全信模型。
        </p>
      </div>
    ),
  },
  {
    title: "已知局限",
    body: (
      <ul className="space-y-1.5">
        <li className="flex gap-2"><span className="shrink-0 text-slate-400">·</span><span>爬虫依赖来源网站结构，站点改版可能导致采集失效。</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400">·</span><span>分类与信号识别受规则覆盖度限制，边缘情况归入「其他」。</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400">·</span><span>创作者视角依赖 prompt 与知识库质量，需持续人工校准；只喂正文前段时可能抓偏，正在扩大上下文。</span></li>
      </ul>
    ),
  },
];

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800">首页</Link>
          <span>/</span>
          <span>方法说明</span>
        </div>

        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            后台方法
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">方法说明</h1>
          <p className="mt-3 text-lg leading-relaxed text-slate-600">
            创作者雷达如何识别信号、如何给内容评分、创作者视角如何生成。这些是后台机制，不放进每篇详情，统一在此说明一次。
          </p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">{s.title}</h2>
              <div className="mt-3 text-sm leading-7 text-slate-700">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
