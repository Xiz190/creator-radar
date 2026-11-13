"use client";

import { useEffect, useRef } from "react";
import {
  Accessibility, RadioTower, Search, Sparkles, type LucideIcon,
} from "lucide-react";
import { usePrefs } from "@/contexts/prefs-context";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Bi = { zh: string; en: string };

const STACK: Array<{ label: Bi; value: Bi }> = [
  { label: { zh: "框架", en: "Framework" }, value: { zh: "Next.js 16 · React 19 · TypeScript · Tailwind CSS v4", en: "Next.js 16 · React 19 · TypeScript · Tailwind CSS v4" } },
  { label: { zh: "数据库", en: "Database" }, value: { zh: "PostgreSQL（Neon）", en: "PostgreSQL (Neon)" } },
  { label: { zh: "抓取", en: "Crawler" }, value: { zh: "自己写的抓取器，读 RSS 和网页列表；GitHub Actions 每 6 小时跑一次", en: "My own crawler for RSS and HTML list pages, run by GitHub Actions every 6 hours" } },
  { label: { zh: "AI", en: "AI" }, value: { zh: "DeepSeek：写创作者视角、回答助手提问；换成其他兼容 OpenAI 接口的模型只改配置", en: "DeepSeek writes the creator lens and answers the assistant. Any OpenAI-compatible model can be swapped in through config." } },
  { label: { zh: "优先级", en: "Priority" }, value: { zh: "关键词得分 + 命中的信号类型", en: "Keyword score plus the signal types an item hits" } },
];

const SOURCES: Array<{ label: Bi; desc: Bi }> = [
  { label: { zh: "AI 工具官方", en: "AI tool blogs" }, desc: { zh: "Suno、Splice、ElevenLabs、Mubert、Runway、Pika、Luma、Krea、Stability", en: "Suno, Splice, ElevenLabs, Mubert, Runway, Pika, Luma, Krea, Stability" } },
  { label: { zh: "音乐科技与行业媒体", en: "Music tech & industry" }, desc: { zh: "CDM、Synthtopia、Music Ally、PetaPixel", en: "CDM, Synthtopia, Music Ally, PetaPixel" } },
  { label: { zh: "中文 AI 媒体", en: "Chinese AI media" }, desc: { zh: "量子位", en: "QbitAI" } },
  { label: { zh: "资助与机会", en: "Funding & opportunities" }, desc: { zh: "国家艺术基金", en: "China National Arts Fund" } },
];

const DECISIONS: Array<{ icon: LucideIcon; title: Bi; desc: Bi }> = [
  { icon: Search, title: { zh: "先分信号，再看资讯", en: "Signals before news" }, desc: { zh: "每条按信号类型归类：工具更新、创作机会、截止预警、行业观察、版权政策。重要的排在前面。", en: "Every item is tagged by signal type: tool updates, opportunities, deadlines, industry watch, copyright & policy. Important ones go first." } },
  { icon: Sparkles, title: { zh: "创作者视角", en: "Creator lens" }, desc: { zh: "重要条目配一句话，说明它对你自己的创作意味着什么。AI 只给看法，用不用由你定。", en: "Key items get one line on what they mean for your own work. The AI comments; you decide." } },
  { icon: Accessibility, title: { zh: "辅助功能", en: "Accessibility" }, desc: { zh: "字号、深色模式、高对比度、减少动画，中英文界面。", en: "Text size, dark mode, high contrast, reduced motion, English and Chinese." } },
  { icon: RadioTower, title: { zh: "来源健康检查", en: "Source health checks" }, desc: { zh: "某个来源抓不到内容时，那次运行会标红并发邮件提醒，不会悄悄变空。", en: "If a source stops returning items, that run fails and sends an email, so a feed never goes quietly empty." } },
];

export function AboutModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const en = usePrefs().language === "en";
  const L = (b: Bi) => (en ? b.en : b.zh);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
      className="m-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      {open && (
        <>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-base text-white" style={{ backgroundColor: "var(--brand)" }}>{en ? "CR" : "创"}</span>
              <div>
                <div className="text-base font-semibold text-slate-900">{en ? "Creator Radar" : "创作者雷达"}</div>
                <div className="text-xs text-slate-500">Xingchen Zhou · 2026</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <span aria-hidden>✕</span>
              <span className="sr-only">{en ? "Close" : "关闭"}</span>
            </button>
          </div>

          <div className="space-y-6 px-6 py-5">
            <p className="text-sm leading-7 text-slate-600">
              {en
                ? "An industry radar for independent music creators. It follows AI music and video tools, music-tech media and funding calls, and adds one line to each key item on what it means for your own work."
                : "给独立音乐创作者用的行业情报台。跟踪 AI 音乐和视频工具、音乐科技媒体和资助机会，给每条重要内容配一句「这对你的创作意味着什么」。"}
            </p>

            <section>
              <h3 className="mb-3 text-xs font-semibold text-slate-500">{en ? "Tech stack" : "技术栈"}</h3>
              <div className="space-y-2">
                {STACK.map((item) => (
                  <div key={item.label.en} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-2.5">
                    <span className="shrink-0 text-xs font-medium text-slate-500 w-20">{L(item.label)}</span>
                    <span className="text-xs text-slate-700">{L(item.value)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold text-slate-500">{en ? "Sources (15)" : "数据来源（15 个）"}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {SOURCES.map((s) => (
                  <div key={s.label.en} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-800">{L(s.label)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{L(s.desc)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold text-slate-500">{en ? "Design decisions" : "设计决策"}</h3>
              <div className="space-y-2">
                {DECISIONS.map((d) => (
                  <div key={d.title.en} className="flex items-start gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                    <d.icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{L(d.title)}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{L(d.desc)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
              {en
                ? "Built as a case study for my graduate-school portfolio. Every item comes from a real source's public page; the data on this site updates on its own."
                : "这是我研究生申请作品集里的一个案例。每条内容都来自真实来源的公开页面，站上的数据会自己更新。"}
            </p>
          </div>
        </>
      )}
    </dialog>
  );
}
