"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePrefs } from "@/contexts/prefs-context";
import { useT } from "@/lib/i18n";

// 详情页顶部面包屑：页面唯一的「返回」入口（原先还有正文里的返回按钮和右下角浮动返回，重复了）
export function ItemBreadcrumb({
  departmentName,
  channelName,
  title,
}: {
  departmentName?: string | null;
  channelName?: string | null;
  title: string;
}) {
  const t = useT(usePrefs().language);
  return (
    <nav className="mb-4 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500" aria-label={t("detail.breadcrumb")}>
      <Link
        href="/inbox"
        scroll={false}
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {t("inbox.title")}
      </Link>
      {departmentName && (
        <>
          <span className="text-slate-300" aria-hidden>/</span>
          <Link
            href={`/inbox?dept=${encodeURIComponent(departmentName)}`}
            scroll={false}
            className="underline-offset-2 transition hover:text-slate-800 hover:underline"
          >
            {departmentName}
          </Link>
        </>
      )}
      {channelName && (
        <>
          <span className="text-slate-300" aria-hidden>/</span>
          <span>{channelName}</span>
        </>
      )}
      <span className="text-slate-300" aria-hidden>/</span>
      <span className="min-w-0 max-w-[40ch] truncate text-slate-700" title={title}>{title}</span>
    </nav>
  );
}
