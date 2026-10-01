"use client";

import Link from "next/link";
import { usePrefs } from "@/contexts/prefs-context";

// 方法说明正文：放在客户端组件里才能跟随语言设置（页面本身是服务端组件，要导出 metadata）。
// 单独成页，不塞进每篇详情：这些是「后台怎么工作」的说明，
// 对日常阅读是噪音，只对想了解机制的人（含作品集评审）有用。

type Section = { title: string; body: React.ReactNode };

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2"><span className="shrink-0 text-slate-400">·</span><span>{children}</span></li>
);

const TIERS = [
  { zh: "核心关注", en: "Core", th: "≥ 90" },
  { zh: "重点内容", en: "Key", th: "≥ 50" },
  { zh: "中等重点", en: "Medium", th: "≥ 20" },
  { zh: "普通内容", en: "Normal", th: "< 20" },
];

function TierGrid({ en }: { en: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TIERS.map((x) => (
        <div key={x.zh} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <div className="text-sm font-semibold text-slate-900">{en ? x.en : x.zh}</div>
          <div className="mt-0.5 text-xs text-slate-500">{x.th}</div>
        </div>
      ))}
    </div>
  );
}

const SECTIONS_ZH: Section[] = [
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
          <Bullet>命中标题结构（正式标题、明确主题）<strong> +8</strong></Bullet>
          <Bullet>命中强主题（核心关注领域的高权重关键词）<strong> +5</strong></Bullet>
          <Bullet>命中风险 / 时效信号（截止、征集这类需要尽快看的）<strong> +10</strong></Bullet>
        </ul>
        <p>叠加后按门槛分级：</p>
        <TierGrid en={false} />
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
        <Bullet>爬虫依赖来源网站结构，站点改版可能导致采集失效。</Bullet>
        <Bullet>分类与信号识别受规则覆盖度限制，边缘情况归入「其他」。</Bullet>
        <Bullet>创作者视角依赖 prompt 与知识库质量，需持续人工校准；只喂正文前段时可能抓偏，正在扩大上下文。</Bullet>
      </ul>
    ),
  },
];

const SECTIONS_EN: Section[] = [
  {
    title: "Why this lives on its own page",
    body: (
      <p>
        Detection, scoring and weights describe how the back end works. They don&apos;t help you read an item —
        they get in the way. So each item page keeps only what a creator needs (the text, the creator lens,
        related items), and the mechanics are explained once, here.
      </p>
    ),
  },
  {
    title: "Two layers: rules, then an LLM",
    body: (
      <div className="space-y-2">
        <p>
          Every item first goes through a <strong>rules layer</strong>: keywords and signal terms give an instant
          first pass — which categories it belongs to and which opportunity signals it hits. The rules are
          transparent, tunable and explainable: the same input always gives the same result.
        </p>
        <p>
          Then the <strong>LLM layer</strong> (DeepSeek) writes a one-line creator lens and a value rating.
          Meaning goes to the model; speed and control stay with the rules.
        </p>
      </div>
    ),
  },
  {
    title: "Scoring and weights",
    body: (
      <div className="space-y-3">
        <p>
          Each item gets a <strong>keyword base score</strong> (weighted sum of the keywords it matches),
          plus a few small boosts:
        </p>
        <ul className="space-y-1.5">
          <Bullet>Title structure (a formal title with a clear subject)<strong> +8</strong></Bullet>
          <Bullet>Strong topic (a high-weight keyword in a core area)<strong> +5</strong></Bullet>
          <Bullet>Risk or time signal (deadlines, open calls — things to read soon)<strong> +10</strong></Bullet>
        </ul>
        <p>The total is then bucketed by threshold:</p>
        <TierGrid en />
        <p className="text-sm text-slate-600">
          Two guards against inflated ratings: ① an item with only a title and no captured text can&apos;t reach
          Core (it drops one tier); ② if the raw keyword score is under 40, no badge is shown even if the boosts
          push the tier up — boosts shouldn&apos;t make weak items look important.
        </p>
      </div>
    ),
  },
  {
    title: "How the creator lens is written",
    body: (
      <div className="space-y-2">
        <p>
          The creator lens isn&apos;t a summary. It answers: what does this mean <strong>for you as a creator</strong>,
          how would you use it, and what&apos;s the catch. The LLM writes it from a three-layer knowledge base:
          a personal layer (who you are and how you talk), an objective layer (analysis frameworks with cited
          sources) and an examples layer (reference tone and level of detail).
        </p>
        <p>
          The model only drafts; <strong>a person makes the call</strong>. When a lens misses the point, I fix it by
          hand. It&apos;s the same way I make music — AI speeds up the execution, the author owns the judgment. So
          there&apos;s a human calibration layer instead of trusting the model outright.
        </p>
      </div>
    ),
  },
  {
    title: "Known limitations",
    body: (
      <ul className="space-y-1.5">
        <Bullet>The crawlers depend on each source&apos;s page structure; a redesign can break collection.</Bullet>
        <Bullet>Categories and signals are only as good as the rules&apos; coverage; edge cases fall into &ldquo;Other&rdquo;.</Bullet>
        <Bullet>
          The lens depends on the prompt and the knowledge base and needs ongoing calibration. When it only sees the
          start of an article it can miss the point — I&apos;m widening the context.
        </Bullet>
      </ul>
    ),
  },
];

export function MethodContent() {
  const { language } = usePrefs();
  const en = language === "en";
  const sections = en ? SECTIONS_EN : SECTIONS_ZH;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-8">
      <div className="mb-8 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800">{en ? "Home" : "首页"}</Link>
        <span>/</span>
        <span>{en ? "How it works" : "方法说明"}</span>
      </div>

      <div className="mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {en ? "Under the hood" : "后台方法"}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{en ? "How it works" : "方法说明"}</h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">
          {en
            ? "How Creator Radar detects signals, scores items and writes the creator lens. These are back-end mechanics, so they're explained once here rather than on every item."
            : "创作者雷达如何识别信号、如何给内容评分、创作者视角如何生成。这些是后台机制，不放进每篇详情，统一在此说明一次。"}
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((s) => (
          <section key={s.title} className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">{s.title}</h2>
            <div className="mt-3 text-sm leading-7 text-slate-700">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
