"use client";

// 日报邮件预览：和定时发信脚本（scripts/send-daily-summary.ts）共用取数和模板，看到的就是邮箱里收到的。
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { usePrefs } from "@/contexts/prefs-context";

type DigestResponse = { ok: boolean; date?: string; subject?: string; html?: string; items?: unknown[] };

export default function DigestPage() {
  const en = usePrefs().language === "en";
  const L = (zh: string, enText: string) => (en ? enText : zh);
  const lang = en ? "en" : "zh";
  const [data, setData] = useState<{ lang: string; res: DigestResponse } | null>(null);
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/monitor/digest?lang=${lang}`, { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((res: DigestResponse) => setData({ lang, res }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setData({ lang, res: { ok: false } });
      });
    return () => ctrl.abort();
  }, [lang]);

  const current = data?.lang === lang ? data.res : null;
  const html = current?.html ?? "";

  function copyHtml() {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-800">{L("首页", "Home")}</Link>
              <span>/</span>
              <span>{L("日报邮件", "Daily email")}</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{L("日报邮件预览", "Daily email preview")}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {current?.subject ?? "…"}
              <br />
              {L("每天北京时间 8:40 自动发到你的邮箱，内容是近 24 小时的重点条目。", "Sent to your inbox every day at 08:40 Beijing time, covering the key items from the last 24 hours.")}
            </p>
          </div>
          <button
            type="button"
            onClick={copyHtml}
            disabled={!html}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {copied ? L("✓ 已复制", "✓ Copied") : L("复制 HTML", "Copy HTML")}
          </button>
        </div>

        <div className="mb-4 flex gap-1 border-b border-slate-200">
          {(["preview", "html"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition ${tab === t ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t === "preview" ? L("预览", "Preview") : L("HTML 源码", "HTML source")}
            </button>
          ))}
        </div>

        {!current ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" aria-hidden /> {L("正在加载…", "Loading…")}
          </div>
        ) : !current.ok ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
            {L("加载失败，刷新再试一次。", "Couldn't load the preview. Try refreshing.")}
          </div>
        ) : tab === "preview" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <iframe
              srcDoc={html}
              title={L("邮件预览", "Email preview")}
              className="block w-full"
              style={{ height: "760px", border: "none", colorScheme: "light", background: "#f7f6f3" }}
              sandbox=""
            />
          </div>
        ) : (
          <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 text-[11px] leading-relaxed text-slate-700">{html}</pre>
        )}
      </div>
    </main>
  );
}
