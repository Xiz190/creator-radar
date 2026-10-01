"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { usePrefs } from "@/contexts/prefs-context";

// 里程碑式的真实迭代记录（2026-09-30 重写）。
// 旧版是 8 月 6–7 日两天里的 25 轮功能清单，停在 8 月 7 日，且列着不少后来删掉的功能；
// 这里只记真正改变产品的节点，每条都能在提交历史里找到对应。

type Milestone = {
  when: { zh: string; en: string };
  title: { zh: string; en: string };
  points: Array<{ zh: string; en: string }>;
};

const MILESTONES: Milestone[] = [
  {
    when: { zh: "2026 年 6–8 月", en: "Jun – Aug 2026" },
    title: { zh: "从一套政策情报框架里分出来", en: "Forked from a policy-intelligence framework" },
    points: [
      { zh: "复用政策雷达的抓取、评分、收件箱骨架，换成面向独立创作者的分类与信号", en: "Reused Policy Radar's crawler, scoring and inbox skeleton, re-cut for independent creators" },
      { zh: "8 月初的原型期两天里加了几十个小功能，其中不少后来被删掉——这一阶段学到的是「少而准」", en: "In early August the prototype gained dozens of small features in two days; many were later removed. The lesson: fewer, sharper features" },
      { zh: "8 月 28 日起接入真实来源：Suno、ElevenLabs、Pika、Runway、Stability AI 等工具官方动态，加上 Music Ally、CDM、量子位等中英文媒体", en: "From Aug 28, real sources: official news from Suno, ElevenLabs, Pika, Runway, Stability AI and others, plus Music Ally, CDM, QbitAI and more" },
    ],
  },
  {
    when: { zh: "9 月 2–4 日", en: "Sep 2–4" },
    title: { zh: "编辑台设计系统", en: "An editorial design system" },
    points: [
      { zh: "衬线标题 + 无衬线正文、暖纸底、近单色加一个强调色；首页与详情页按它重构", en: "Serif headlines, sans body, warm paper background, near-monochrome with one accent; home and detail rebuilt on it" },
      { zh: "站内正文检索可用（此前接口一直报错）；删掉 7 个没人用的组件", en: "Full-text search works (the endpoint had been failing); seven unused components deleted" },
    ],
  },
  {
    when: { zh: "9 月 8 日", en: "Sep 8" },
    title: { zh: "创作者视角与方法透明", en: "The creator lens, and showing the method" },
    points: [
      { zh: "每条动态配一句「这对你这个创作者意味着什么」，由大模型基于三层知识库（个人 / 客观 / 样例）起草，判断由人把关", en: "Each item gets one line on what it means for you as a creator, drafted by an LLM from a three-layer knowledge base (personal / objective / examples) and checked by a person" },
      { zh: "方法说明页：数据从哪来、怎么打分、哪些做不到", en: "A How-it-works page: where the data comes from, how it's scored, what it can't do" },
    ],
  },
  {
    when: { zh: "9 月 17 日", en: "Sep 17" },
    title: { zh: "做减法与打磨", en: "Subtraction and polish" },
    points: [
      { zh: "全站 emoji 换成统一的矢量图标", en: "Every emoji replaced with a consistent icon set" },
      { zh: "修掉命令面板背景滚动、暗色模式黑底黑字、来源健康度被全部误判为异常等问题", en: "Fixed background scrolling behind the command palette, dark-mode contrast, and a health check that flagged every source as failing" },
      { zh: "评估过但放弃的来源写进数据源说明，作为主动取舍", en: "Sources that were evaluated and dropped are documented as deliberate trade-offs" },
    ],
  },
  {
    when: { zh: "9 月 18–19 日", en: "Sep 18–19" },
    title: { zh: "手机伴侣版", en: "Phone companion" },
    points: [
      { zh: "/m 下的今日、动态、详情、收藏几屏；手机只做接收与速读，重操作留给桌面", en: "Today, Feed, Detail and Saved screens under /m. The phone is for catching up; heavy work stays on desktop" },
      { zh: "手机上点「在桌面打开」会真的把条目交给桌面；创作者视角有了英文版", en: "\"On desktop\" really hands the item over to your desktop; the creator lens now has an English version" },
    ],
  },
  {
    when: { zh: "9 月 25 日", en: "Sep 25" },
    title: { zh: "上线准备与「会说谎的数字」", en: "Getting ready to ship — and numbers that lied" },
    points: [
      { zh: "公开演示模式（访客只读、作者口令登录）与定时抓取；每次抓取后自动补齐中英文创作者视角", en: "Public demo mode (read-only for visitors, passphrase for the owner) and scheduled crawling; every crawl fills in the creator lens in both languages" },
      { zh: "修掉几个会误导人的数字：如「相似度 %」其实是按列表位置编的、「本周新增 0」是日期键错位", en: "Fixed misleading numbers — e.g. a \"similarity %\" made up from list position, and \"0 this week\" caused by a date-key bug" },
      { zh: "收件箱减负：撤掉深色横幅与各类提示条，工具收进一行", en: "Slimmed the feed: removed the dark banner and nudge bars, one toolbar row" },
    ],
  },
  {
    when: { zh: "9 月 30 日", en: "Sep 30" },
    title: { zh: "英文模式补齐与上线前体检", en: "English everywhere, and a pre-launch check-up" },
    points: [
      { zh: "评审常会点开的页面都有了英文；信号雷达补上创作者视角", en: "The pages reviewers are likely to open now have English; Signal Radar shows the creator lens" },
      { zh: "修掉数据库字段被二次解析而恒为空、正文提取漏出网页代码、离线缓存一直返回旧页面等问题", en: "Fixed fields that were always empty from double-parsing, page code leaking into article text, and an offline cache that kept serving stale pages" },
    ],
  },
];

export default function ChangelogPage() {
  const { language } = usePrefs();
  const en = language === "en";
  const L = (x: { zh: string; en: string }) => (en ? x.en : x.zh);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">{en ? "Home" : "首页"}</Link>
            <span>/</span>
            <span>{en ? "Changelog" : "更新日志"}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{en ? "Changelog" : "更新日志"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {en
              ? "The milestones that actually changed the product. Small fixes live in the commit history."
              : "只记真正改变了产品的节点；零碎修复见提交历史。"}
          </p>
        </div>

        <ol className="relative border-l border-slate-200">
          {MILESTONES.map((m) => (
            <li key={m.title.zh} className="relative pb-9 pl-6 last:pb-0">
              <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--brand)] bg-white" aria-hidden />
              <div className="text-xs font-medium text-slate-500">{L(m.when)}</div>
              <h2 className="mt-1 text-base font-semibold text-slate-900">{L(m.title)}</h2>
              <ul className="mt-2 space-y-1.5">
                {m.points.map((p) => (
                  <li key={p.zh} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                    <span className="mt-0.5 shrink-0 text-slate-300">·</span>
                    <span>{L(p)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
