"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { ContentItem } from "@/hooks/use-item-list";
import { primaryCategoryLabelEn } from "@/lib/companion/feed";
import { shortAgo, sourceAbbr } from "@/lib/companion/format";
import { pickSourceName } from "@/lib/localized-fields";
import { CompanionHeader } from "@/components/companion/companion-header";
import { NoteMark, NoteSheet } from "@/components/companion/note-sheet";

/**
 * Saved 屏。**这一屏的身份是「收藏 + 你自己写的话」**——
 * mockup 里四条有两条带备注、两条挂 Add note 按钮（设计决策 D8）。
 * 所以没有备注时显示 Add note 按钮，**不拿 lens 顶替**：lens 是系统生成的
 * 「作者的话」，跟"你自己写的"混在一起就分不清谁说的了。
 */
export default function CompanionSavedPage() {
  const t = useT("en");

  const [items, setItems] = useState<ContentItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<ContentItem | null>(null);

  // 同 Feed：now 必须挂载后才算，否则"1d"这类相对时间会被烤进预渲染产物
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/monitor/items?view=list&limit=100&onlyStarred=1&sort=published_at", {
      cache: "no-store",
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items?: ContentItem[] }) => {
        setItems(d.items ?? []);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setState("error");
      });
    return () => ac.abort();
  }, []);

  async function saveNote(item: ContentItem, note: string) {
    const trimmed = note.trim();
    const previous = item.userNote ?? "";
    // 乐观更新：先改本地，失败再回滚
    setItems((list) =>
      list.map((i) => (i.url === item.url ? { ...i, userNote: trimmed || null } : i)),
    );
    setEditing(null);
    try {
      const res = await fetch(`/api/monitor/items/${encodeURIComponent(item.sourceId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: item.url, userNote: trimmed }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "failed");
    } catch {
      setItems((list) => list.map((i) => (i.url === item.url ? { ...i, userNote: previous } : i)));
    }
  }

  const withNoteCount = useMemo(
    () => items.filter((i) => (i.userNote ?? "").trim().length > 0).length,
    [items],
  );

  return (
    <main>
      <CompanionHeader
        title={t("companion.tab.saved")}
        right={
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-slate-200">
            <Search className="h-4 w-4 text-slate-700" aria-hidden />
          </span>
        }
      />

      <div className="px-5 pb-24 pt-1.5">
        {state === "loading" ? (
          <p className="pt-6 text-[13.5px] text-slate-500">{t("companion.loading")}</p>
        ) : state === "error" ? (
          <p className="pt-6 text-[13.5px] text-slate-500">{t("companion.error")}</p>
        ) : items.length === 0 ? (
          <p className="pt-6 text-[13.5px] text-slate-500">{t("companion.empty")}</p>
        ) : (
          <>
            <div className="mt-2 font-mono text-[12px] text-slate-500">
              {items.length} saved · {withNoteCount} with notes
            </div>

            {items.map((item) => {
              const note = (item.userNote ?? "").trim();
              return (
                <article key={item.url} className="border-b border-slate-100 py-[19px]">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.01em] text-slate-500">
                      {primaryCategoryLabelEn(item)}
                    </span>
                  </div>

                  <Link
                    href={`/m/item/${encodeURIComponent(item.sourceId)}?url=${encodeURIComponent(item.url)}`}
                  >
                    <h2 className="text-[15.5px] font-semibold leading-[1.4] tracking-[-0.006em] text-slate-900">
                      {item.title}
                    </h2>
                  </Link>

                  {note ? (
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="mt-[11px] flex w-full gap-2 rounded-[11px] bg-slate-100 px-[11px] py-[9px] text-left"
                    >
                      <span className="mt-px flex-none text-slate-500">
                        <NoteMark />
                      </span>
                      <p className="text-[12.5px] leading-[1.46] text-slate-700">{note}</p>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="mt-[11px] inline-flex items-center gap-[6px] rounded-[9px] border border-slate-200 px-[11px] py-[6px] text-[12.5px] font-semibold text-slate-500"
                    >
                      <Plus className="h-[13px] w-[13px]" aria-hidden />
                      {t("companion.note.add")}
                    </button>
                  )}

                  <div className="mt-[13px] flex items-center gap-[7px] text-[12px] text-slate-500">
                    <span className="font-semibold text-slate-700">{pickSourceName(item, "en")}</span>
                    <span className="h-[3px] w-[3px] flex-none rounded-full bg-slate-200" aria-hidden />
                    <time className="font-mono text-[11px]">
                      {now ? shortAgo(item.listPublishedAt, now) : ""}
                    </time>
                  </div>
                </article>
              );
            })}
          </>
        )}
      </div>

      <NoteSheet
        open={editing !== null}
        title={editing?.title ?? ""}
        sourceAbbr={sourceAbbr(pickSourceName(editing, "en") ?? "")}
        initialNote={editing?.userNote ?? ""}
        onSave={(note) => {
          if (editing) void saveNote(editing, note);
        }}
        onClose={() => setEditing(null)}
      />
    </main>
  );
}
