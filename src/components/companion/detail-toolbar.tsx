"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Monitor, Star } from "lucide-react";
import { useT } from "@/lib/i18n";
import { NoteSheet } from "@/components/companion/note-sheet";

/**
 * 详情页底部工具栏（mockup 的 .toolbar）+ Save 触发的备注 sheet。
 *
 * ⚠️ 备注 sheet 是**从详情页的 Save 弹出的**——mockup 那张图的图注就是
 * "Detail · save + note"（详情在背后、sheet 在上面）。所以 Save 不只是
 * 打星：**开启收藏时顺带问一句"要不要写点什么"**，这正是"快速捕获"的动作。
 * （第一版我漏了这一步，只在 Saved 屏接了备注，用户点 Save 什么都没有。）
 *
 * On desktop 是「重操作剥回桌面」的落点，做成真链接指向桌面端同名条目——
 * 一个点下去没反应的控件比没有更糟（同 Feed 的搜索图标）。
 */
export function DetailToolbar({
  sourceId,
  url,
  title,
  sourceAbbrText,
  initialStarred,
  initialRead,
  initialNote,
}: {
  sourceId: string;
  url: string;
  title: string;
  sourceAbbrText: string;
  initialStarred: boolean;
  initialRead: boolean;
  initialNote: string;
}) {
  const t = useT("en");
  // 详情页是 Server Component，所以备注写完后用它刷新服务端渲染，
  // 让页面上那块备注立刻更新。不能用回调把状态传回去——
  // Server Component 不能把函数传给 Client Component。
  const router = useRouter();
  const [starred, setStarred] = useState(initialStarred);
  const [read, setRead] = useState(initialRead);
  const [noteOpen, setNoteOpen] = useState(false);
  // 「发到桌面」的反馈。发送后停在 sent/failed，不自动复位——复位了用户
  // 就分不清"刚才那下成功了没"。
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  // 乐观更新 + 失败回滚。桌面站的收件箱有同样的做法，这里保持一致。
  // 顺带一提：这个写操作就是 D4 说的"跨端证据"——在手机上收藏/标已读/写备注，
  // 桌面站的同一条会立刻是同一状态，因为读写的是同一行数据。
  async function patch(body: Record<string, unknown>, rollback: () => void) {
    try {
      const res = await fetch(`/api/monitor/items/${encodeURIComponent(sourceId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, ...body }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed");
      return true;
    } catch {
      rollback();
      return false;
    }
  }

  const btn = "flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold";

  return (
    <>
      <div className="fixed bottom-0 left-1/2 z-40 flex h-[78px] w-full max-w-[480px] -translate-x-1/2 gap-1.5 border-t border-slate-200 bg-slate-50/94 px-3.5 pb-[24px] pt-2.5 backdrop-blur-md">
        <button
          type="button"
          aria-pressed={starred}
          onClick={() => {
            const next = !starred;
            setStarred(next);
            void patch({ isStarred: next }, () => setStarred(!next));
            // 采集时顺带问一句要不要写点什么（mockup: "Detail · save + note"）
            if (next) setNoteOpen(true);
          }}
          className={`${btn} ${starred ? "text-[var(--brand)]" : "text-slate-700"}`}
        >
          <Star className="h-5 w-5" fill={starred ? "currentColor" : "none"} aria-hidden />
          {starred ? t("companion.detail.saved") : t("companion.detail.save")}
        </button>

        <button
          type="button"
          aria-pressed={read}
          onClick={() => {
            const next = !read;
            setRead(next);
            void patch({ isRead: next }, () => setRead(!next));
          }}
          className={`${btn} ${read ? "text-[var(--brand)]" : "text-slate-700"}`}
        >
          <Check className="h-5 w-5" aria-hidden />
          {read ? t("companion.detail.markUnread") : t("companion.detail.markRead")}
        </button>

        <button
          type="button"
          disabled={sendState !== "idle"}
          onClick={() => {
            if (sendState !== "idle") return;
            setSendState("sending");
            fetch("/api/monitor/handoff", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ sourceId, url, title }),
            })
              .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
              .then((j: { ok?: boolean }) => {
                setSendState(j.ok ? "sent" : "failed");
              })
              .catch(() => setSendState("failed"));
          }}
          className={`${btn} ${
            sendState === "sent"
              ? "text-[var(--brand)]"
              : sendState === "failed"
                ? "text-rose-600"
                : "text-slate-700"
          }`}
        >
          <Monitor className="h-5 w-5" aria-hidden />
          {sendState === "sent"
            ? t("companion.detail.sent")
            : sendState === "failed"
              ? t("companion.detail.sendFailed")
              : t("companion.detail.onDesktop")}
        </button>
      </div>

      <NoteSheet
        open={noteOpen}
        title={title}
        sourceAbbr={sourceAbbrText}
        initialNote={initialNote}
        onSave={(note) => {
          setNoteOpen(false);
          void patch({ userNote: note }, () => {}).then((ok) => {
            if (ok) router.refresh();
          });
        }}
        onClose={() => setNoteOpen(false)}
      />
    </>
  );
}
