"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePrefs } from "@/contexts/prefs-context";

type Step = {
  title: { zh: string; en: string };
  desc: { zh: string; en: string };
  tour?: string; // data-tour 值：要高亮的元素（不用 title 选，title 会随语言变）
};

const STEPS: Step[] = [
  {
    title: { zh: "搜索与 ⌘K", en: "Search and ⌘K" },
    desc: {
      zh: "点「搜索」或按 ⌘K（Windows 上是 Ctrl+K）。输入页面名可以直接跳过去，输入其他词就搜全部条目。",
      en: "Click Search or press ⌘K (Ctrl+K on Windows). Type a page name to jump there, or any other word to search every item.",
    },
    tour: "palette",
  },
  {
    title: { zh: "信号雷达", en: "Signal Radar" },
    desc: {
      zh: "信号雷达把条目分成五类：AI 工具更新、创作机会、截止预警、行业观察、版权与平台政策。",
      en: "Signal Radar sorts items into five types: AI tool updates, creative opportunities, deadlines, industry watch, and copyright & platform policy.",
    },
  },
  {
    title: { zh: "动态资讯的键盘操作", en: "Keyboard in the News Feed" },
    desc: {
      zh: "在动态资讯页，J / K 上下切换条目，R 标记已读，S 收藏。",
      en: "In the News Feed, J and K move between items, R marks one read, and S stars it.",
    },
  },
  {
    title: { zh: "生成周报", en: "Weekly brief" },
    desc: {
      zh: "在信号雷达页筛好信号后，点「生成周报」，会得到一份 Markdown 周报，可以贴进 Notion、飞书或备忘录。",
      en: "On Signal Radar, filter the signals you want and click Weekly brief. You get a Markdown summary to paste into Notion or your notes.",
    },
  },
  {
    title: { zh: "辅助功能", en: "Accessibility" },
    desc: {
      zh: "在「设置 → 辅助功能」里可以调字号、切深色模式、开高对比度、减少动画，也能切换中英文。",
      en: "Under Settings → Accessibility you can change text size, dark mode, contrast and motion, and switch between English and Chinese.",
    },
    tour: "settings",
  },
  {
    title: { zh: "关于这个项目", en: "About this project" },
    desc: {
      zh: "「设置 → 关于这个项目」里写了技术栈、数据来源和设计取舍。这是一个给独立音乐创作者用的行业情报台，也是我研究生申请作品集里的一个案例。",
      en: "Settings → About this project covers the tech stack, data sources and design trade-offs. Creator Radar is an industry radar for independent music creators, and one case study in my grad-school portfolio.",
    },
    tour: "settings",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AppTour({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const prevHighlightEl = useRef<Element | null>(null);

  const en = usePrefs().language === "en";
  const current = STEPS[step];
  const selector = current.tour ? `[data-tour="${current.tour}"]` : null;

  // Highlight target element
  useEffect(() => {
    if (!open) {
      if (prevHighlightEl.current) {
        (prevHighlightEl.current as HTMLElement).style.outline = "";
        (prevHighlightEl.current as HTMLElement).style.outlineOffset = "";
        prevHighlightEl.current = null;
      }
      return;
    }

    if (prevHighlightEl.current) {
      (prevHighlightEl.current as HTMLElement).style.outline = "";
      (prevHighlightEl.current as HTMLElement).style.outlineOffset = "";
    }

    if (selector) {
      const el = document.querySelector(selector);
      if (el) {
        (el as HTMLElement).style.outline = "3px solid var(--brand)";
        (el as HTMLElement).style.outlineOffset = "3px";
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setHighlightRect(el.getBoundingClientRect());
        prevHighlightEl.current = el;
      } else {
        setHighlightRect(null);
        prevHighlightEl.current = null;
      }
    } else {
      setHighlightRect(null);
      prevHighlightEl.current = null;
    }
  }, [open, step, selector]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (step < STEPS.length - 1) setStep((s) => s + 1);
        else onClose();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  // Reset on open
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (prevHighlightEl.current) {
      (prevHighlightEl.current as HTMLElement).style.outline = "";
    }
  }, []);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const isLast = step === STEPS.length - 1;

  return createPortal(
    <>
      {/* dim overlay — click to close */}
      <div
        className="fixed inset-0 z-[60] bg-slate-900/30"
        onClick={onClose}
      />

      {/* Tour card — fixed bottom center */}
      <div className="fixed bottom-6 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-2xl">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-900">{en ? current.title.en : current.title.zh}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{en ? current.desc.en : current.desc.zh}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-violet-500" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                    aria-label={`步骤 ${i + 1}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    {en ? "← Back" : "← 上一步"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
                  className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                >
                  {isLast ? (en ? "Done" : "完成") : (en ? "Next →" : "下一步 →")}
                </button>
              </div>
            </div>
            <div className="mt-2 text-right text-[11px] text-slate-400">
              {step + 1} / {STEPS.length} · {en ? "← → to move, Esc to close" : "按 ← → 切换，Esc 关闭"}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
