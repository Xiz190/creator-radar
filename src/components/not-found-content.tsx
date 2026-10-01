"use client";

import Link from "next/link";
import { usePrefs } from "@/contexts/prefs-context";
import {
  ChartColumn, ClipboardList, House, Inbox, RadioTower, Settings, Sparkles,
} from "lucide-react";

// 404 正文放在客户端组件里，才能跟随语言设置（not-found 本身是服务端组件）
export function NotFoundContent() {
  const { language } = usePrefs();
  const en = language === "en";

  return (
    <div className="w-full max-w-lg text-center">
      <div className="relative mx-auto w-40 h-40 sm:w-48 sm:h-48">
        <div className="absolute inset-0 rounded-full bg-[var(--brand)]/10 blur-2xl" />
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="text-6xl sm:text-7xl font-black tracking-tight">
            <span className="text-slate-800">
              404
            </span>
          </div>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {en ? "Page not found" : "页面走丢了"}
      </h1>
      <p className="mt-3 text-sm text-slate-500 sm:text-base">
        {en
          ? "This page may have been removed, renamed, or is temporarily unavailable"
          : "你访问的页面可能已被移除、重命名，或者暂时不可用"}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
        >
          <House className="h-5 w-5" aria-hidden />
          <span>{en ? "Back to home" : "返回首页"}</span>
        </Link>
        <Link
          href="/inbox"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
        >
          <Inbox className="h-5 w-5" aria-hidden />
          <span>{en ? "Browse News Feed" : "浏览动态资讯"}</span>
        </Link>
      </div>

      <div className="mt-12">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-400">
          {en ? "Or try these" : "或者试试这些"}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: ChartColumn, label: en ? "Insights" : "数据洞察", href: "/dashboard" },
            { icon: Sparkles, label: en ? "Forecast" : "预估中心", href: "/forecast" },
            { icon: ClipboardList, label: en ? "Research" : "我的研究", href: "/research" },
            { icon: Settings, label: en ? "Subscriptions" : "关注设置", href: "/subscribe" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-4 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            >
              <span className="transition group-hover:scale-110">
                <item.icon className="h-5 w-5 text-slate-400" aria-hidden />
              </span>
              <span className="text-xs font-medium text-slate-600">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
        <RadioTower className="h-5 w-5" aria-hidden />
        <span>{en ? "Creator Radar" : "创作者雷达"}</span>
      </div>
    </div>
  );
}
