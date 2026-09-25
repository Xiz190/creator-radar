"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone, X } from "lucide-react";
import { usePrefs } from "@/contexts/prefs-context";
import { useT } from "@/lib/i18n";
import { isCompanionPath } from "@/lib/companion/nav";

type Handoff = { id: number; sourceId: string; url: string; title: string; createdAt: string };

const POLL_MS = 8000;

/**
 * 手机 → 桌面 的「交接」接收端。
 *
 * 伴侣版（手机）工具栏的 On desktop 会往 handoffs 表里排一条；这个组件挂在
 * 桌面站的根布局上，轮询到就弹一个提示条。
 *
 * ⚠️ **这是轮询，不是 Web Push。** 桌面标签页关着就不会弹；浏览器完全退出更不会。
 * 之所以这么做：真推送要 VAPID 密钥 + 推送服务，且 iOS Safari 要求站点先装到
 * 主屏——另一个量级的工作。**别把它讲成"随时送达的系统通知"。**
 *
 * 为什么不用 SSE / WebSocket：单用户、每 8 秒问一次的开销可以忽略，
 * 而长连接在 serverless 部署上是麻烦（Vercel 有超时）。轮询是这里最省的选择。
 */
export function HandoffListener() {
  const pathname = usePathname();
  const { language } = usePrefs();
  const t = useT(language);
  const [pending, setPending] = useState<Handoff | null>(null);
  const ackedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // 伴侣版自己不需要这个（推的是"到桌面去做"）
    if (isCompanionPath(pathname)) return;

    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/monitor/handoff", { cache: "no-store" });
        if (!res.ok) return;
        const json: { handoffs?: Handoff[] } = await res.json();
        const next = (json.handoffs ?? []).find((h) => !ackedRef.current.has(h.id));
        if (!cancelled && next) setPending(next);
      } catch {
        // 轮询失败静默重试——不要因为一次网络抖动弹错误给用户
      }
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname]);

  if (isCompanionPath(pathname) || !pending) return null;

  // 展示过就 ack（不是取的时候 ack：那样一次渲染失败这条就丢了）
  function ack() {
    const id = pending?.id;
    if (!id) return;
    ackedRef.current.add(id);
    setPending(null);
    void fetch("/api/monitor/handoff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ack: id }),
    }).catch(() => {});
  }

  const href = `/items/${encodeURIComponent(pending.sourceId)}?sourceId=${encodeURIComponent(pending.sourceId)}&url=${encodeURIComponent(pending.url)}`;

  return (
    <div className="fixed bottom-24 right-4 z-[60] w-[300px] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg sm:right-6">
      <div className="flex items-start gap-2.5">
        <Smartphone className="mt-0.5 h-4 w-4 flex-none text-[var(--brand)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-slate-500">{t("handoff.arrived")}</div>
          <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">
            {pending.title}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Link
              href={href}
              onClick={ack}
              className="text-[12.5px] font-semibold text-[var(--brand)]"
            >
              {t("handoff.open")}
            </Link>
            <button
              type="button"
              onClick={ack}
              className="text-[12.5px] font-semibold text-slate-500"
            >
              {t("handoff.dismiss")}
            </button>
          </div>
        </div>
        <button type="button" onClick={ack} aria-label={t("handoff.dismiss")}>
          <X className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        </button>
      </div>
    </div>
  );
}
