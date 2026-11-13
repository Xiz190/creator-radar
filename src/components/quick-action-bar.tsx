"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useT } from "@/lib/i18n";
import { usePrefs } from "@/contexts/prefs-context";
import {
  ArrowLeftRight, Check, ChevronDown, ClipboardList, FileText, MoreHorizontal, NotebookPen, Share2, Star, Tag,
} from "lucide-react";
import { RecaptureButton } from "@/components/recapture-button";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { copyToClipboard, shareOrCopy } from "@/lib/clipboard";
import {
  type FollowUpStatus,
  followUpLabel,
  FOLLOW_UP_STATUS_OPTIONS,
  getNote,
  getFollowUpStatus,
  setNote as setNoteStorage,
  setFollowUpStatus as setFollowUpStatusStorage,
} from "@/lib/personal-research";
import { StatusIcon } from "@/components/status-icon";

type QuickActionBarProps = {
  sourceId: string;
  url: string;
  title: string;
  pageTitle?: string | null;
  departmentName: string;
  channelName: string;
  listPublishedAt: string | null;
  paragraphs: string[];
  initialStarred: boolean;
  initialRead: boolean;
  onCompareClick?: () => void;
  isInCompare?: boolean;
  /** 原文地址（有跳转后的 finalUrl 就传它） */
  originalUrl?: string;
  isMock?: boolean;
};

export function QuickActionBar({
  sourceId,
  url,
  title,
  pageTitle,
  departmentName,
  channelName,
  listPublishedAt,
  paragraphs,
  initialStarred,
  initialRead,
  onCompareClick,
  isInCompare = false,
  originalUrl,
  isMock,
}: QuickActionBarProps) {
  const lang = usePrefs().language;
  const en = lang === "en";
  const t = useT(lang);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isStarred, setIsStarred] = useState(initialStarred);
  const [isRead, setIsRead] = useState(initialRead);
  const [localInCompare, setLocalInCompare] = useState(isInCompare);
  const [isPending, startTransition] = useTransition();

  // 个人研究：备注和跟进状态（从 localStorage 读取）
  const [note, setNoteLocal] = useState(() => getNote(sourceId, url));
  const [followUpStatus, setFollowUpStatusLocal] = useState<FollowUpStatus>(() => getFollowUpStatus(sourceId, url));
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  function handleStarred() {
    const next = !isStarred;
    const prev = isStarred;
    setIsStarred(next);
    startTransition(async () => {
      try {
        const res = await fetchWithAuth("/api/monitor/items/batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sourceId,
            url,
            isStarred: next,
          }),
        });
        await res.json();
        showToast(next ? t("qa.starred") : t("qa.unstarred"));
      } catch {
        setIsStarred(prev);
        showToast(t("qa.failed"));
      }
    });
  }

  function handleRead() {
    const next = !isRead;
    const prev = isRead;
    setIsRead(next);
    startTransition(async () => {
      try {
        const res = await fetchWithAuth("/api/monitor/items/batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sourceId,
            url,
            isRead: next,
          }),
        });
        await res.json();
        showToast(next ? t("qa.read") : t("qa.unread"));
      } catch {
        setIsRead(prev);
        showToast(t("qa.failed"));
      }
    });
  }

  function handleNoteClick() {
    setShowNoteEditor(!showNoteEditor);
    setShowExportMenu(false);
    setShowStatusMenu(false);
    if (!showNoteEditor) {
      setTimeout(() => noteTextareaRef.current?.focus(), 50);
    }
  }

  function handleNoteChange(value: string) {
    setNoteLocal(value);
  }

  function handleNoteSave() {
    setNoteStorage(sourceId, url, title, note);
    showToast(note ? t("qa.note-saved") : t("qa.note-cleared"));
    setShowNoteEditor(false);
  }

  function handleStatusClick() {
    setShowStatusMenu(!showStatusMenu);
    setShowExportMenu(false);
    setShowNoteEditor(false);
  }

  function handleStatusSelect(status: FollowUpStatus) {
    setFollowUpStatusStorage(sourceId, url, title, status);
    setFollowUpStatusLocal(status);
    setShowStatusMenu(false);
    showToast(
      status === "none"
        ? (en ? "Follow-up status cleared" : "已清除跟进状态")
        : (en ? `Marked as “${followUpLabel(status, "en")}”` : `已设为「${followUpLabel(status, "zh")}」`),
    );
  }

  function handleCompare() {
    const next = !localInCompare;
    setLocalInCompare(next);
    onCompareClick?.();
    showToast(next ? t("qa.compare-on") : t("qa.compare-off"));
  }

  async function handleShare() {
    const result = await shareOrCopy({
      title: title,
      text: en ? `${departmentName}: ${title}` : `${departmentName}发布：${title}`,
      url: url,
      onCopySuccess: () => showToast(t("qa.link-copied")),
      onCopyError: () => showToast(t("qa.copy-failed")),
    });
    if (result === "share") {
      // 原生分享成功，无需额外提示
    }
  }

  function buildNoteMarkdown(): string {
    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(en ? `- **Source**: ${departmentName} · ${channelName}` : `- **来源**：${departmentName} · ${channelName}`);
    lines.push(en ? `- **Date**: ${listPublishedAt}` : `- **日期**：${listPublishedAt}`);
    lines.push(en ? `- **Link**: ${url}` : `- **链接**：${url}`);
    lines.push("");
    lines.push(en ? "## My notes" : "## 个人笔记");
    lines.push("");
    lines.push(en ? "> What stood out, and why it matters to you..." : "> 在此记录您的思考和重点...");
    lines.push("");
    lines.push(en ? "## Key points" : "## 核心要点");
    lines.push("");
    lines.push("- ");
    lines.push("");
    lines.push(en ? "## To do" : "## 行动事项");
    lines.push("");
    lines.push("- [ ] ");
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(en ? "## Original text" : "## 原文");
    lines.push("");
    if (paragraphs && paragraphs.length > 0) {
      for (const p of paragraphs) {
        lines.push(p);
        lines.push("");
      }
    } else {
      lines.push(en ? "(No text captured)" : "（暂无正文）");
    }
    return lines.join("\n");
  }

  function buildPlainText(): string {
    const lines: string[] = [];
    lines.push(en ? `Title: ${title}` : `标题：${title}`);
    if (pageTitle && pageTitle !== title) lines.push(en ? `Page title: ${pageTitle}` : `页面标题：${pageTitle}`);
    lines.push(en ? `Source: ${departmentName} · ${channelName}` : `来源：${departmentName} · ${channelName}`);
    if (listPublishedAt) lines.push(en ? `Published: ${listPublishedAt}` : `列表日期：${listPublishedAt}`);
    if (url) {
      lines.push(en ? `Original: ${url}` : `原文链接：${url}`);
    }
    lines.push("");
    if (!paragraphs || paragraphs.length === 0) {
      lines.push(en ? "(No text captured yet.)" : "（当前未抓取到正文。）");
    } else {
      for (const p of paragraphs) lines.push(p);
    }
    return lines.join("\n");
  }

  function buildWordHtml(): string {
    const escape = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const headerRows: string[] = [];
    headerRows.push(`<p><strong>${escape(title)}</strong></p>`);
    if (pageTitle && pageTitle !== title) {
      headerRows.push(`<p style="color:#555;font-size:11pt;">${en ? "Page title: " : "页面标题："}${escape(pageTitle)}</p>`);
    }
    headerRows.push(
      `<p style="color:#666;font-size:11pt;">${en ? "Source: " : "来源："}${escape(departmentName)} · ${escape(channelName)}${
        listPublishedAt ? (en ? ` · Published: ${escape(listPublishedAt)}` : `｜列表日期：${escape(listPublishedAt)}`) : ""
      }</p>`,
    );
    if (url) {
      headerRows.push(
        `<p style="color:#666;font-size:11pt;">${en ? "Original: " : "原文链接："}<a href="${escape(url)}">${escape(url)}</a></p>`,
      );
    }
    headerRows.push('<hr style="border:none;border-top:1px solid #ccc;margin:12px 0;" />');

    let bodyHtml = "";
    if (!paragraphs || paragraphs.length === 0) {
      bodyHtml = en ? `<p>(No text captured)</p>` : `<p>（暂无正文）</p>`;
    } else {
      bodyHtml = paragraphs
        .map((p) => `<p style="line-height:1.7;text-indent:2em;">${escape(p || "")}</p>`)
        .join("\n");
    }

    return `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <title>${escape(title)}</title>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
      </w:WordDocument>
    </xml>
    <style>
      @page { size: A4; margin: 2cm; }
      body { font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif; font-size: 12pt; color: #222; }
      p { margin: 6pt 0; }
      strong { font-size: 18pt; }
    </style>
  </head>
  <body>${headerRows.join("\n")}\n${bodyHtml}</body>
</html>`.trim();
  }

  function sanitizeFilename(base: string): string {
    const safe = base.replace(/[\\/:*?"<>|\t\n\r\s]+/g, "_").replace(/^_+|_+$/g, "");
    return safe.slice(0, 80) || "policy";
  }

  async function handleCopyFullText() {
    const text = buildPlainText();
    await copyToClipboard(text, {
      onSuccess: () => showToast(t("qa.text-copied")),
      onError: () => showToast(t("qa.copy-failed-short")),
    });
    setShowExportMenu(false);
  }

  function handleExportWord() {
    const html = buildWordHtml();
    const datePart = (listPublishedAt || "").replace(/[^\d]/g, "").slice(0, 8);
    const name = [title, datePart].filter(Boolean).join("_");
    const filename = `${sanitizeFilename(name)}.doc`;

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + html], { type: "application/msword;charset=utf-8" });

    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(urlObj), 5000);
    showToast(t("qa.word-started"));
    setShowExportMenu(false);
  }

  function handleExportNote() {
    const md = buildNoteMarkdown();
    const datePart = listPublishedAt ? listPublishedAt.replace(/[^\d]/g, "").slice(0, 8) : "";
    const safeTitle = title.replace(/[\\/:*?"<>|\t\n\r\s]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
    const filename = `${safeTitle || "item"}_${datePart || ""}_${en ? "notes" : "笔记"}.md`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(urlObj), 5000);
    showToast(t("qa.template-done"));
    setShowExportMenu(false);
  }

  // 一个外层 ref：点到操作栏外面就收起所有下拉
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showStatusMenu && !showExportMenu && !showMore) return;
    function onDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
        setShowExportMenu(false);
        setShowMore(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showStatusMenu, showExportMenu, showMore]);

  // 所有激活状态统一一种强调色（品牌浅底 + 品牌字），不再一个按钮一种颜色
  const btn = (active: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition disabled:opacity-60 ${
      active ? "bg-[var(--brand-tint)] font-medium text-[var(--brand)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  const menuItem = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50";

  return (
    <div ref={barRef} className="relative flex flex-wrap items-center gap-1.5">
      {originalUrl ? (
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mr-1 inline-flex h-9 items-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          {t("detail.open-original")}
        </a>
      ) : null}

      <button data-owner-only type="button" onClick={handleStarred} disabled={isPending} className={btn(isStarred)} aria-pressed={isStarred}>
        <Star className="h-4 w-4" fill={isStarred ? "currentColor" : "none"} aria-hidden />
        <span className="hidden sm:inline">{isStarred ? t("qa.btn.starred") : t("qa.btn.star")}</span>
      </button>

      {/* 跟进状态 */}
      <div className="relative">
        <button type="button" onClick={handleStatusClick} className={btn(followUpStatus !== "none")} aria-expanded={showStatusMenu}>
          {followUpStatus !== "none" ? <StatusIcon status={followUpStatus} className="h-4 w-4" /> : <Tag className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">
            {followUpStatus !== "none" ? followUpLabel(followUpStatus, lang) : t("qa.btn.follow-up")}
          </span>
          <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
        {showStatusMenu && (
          <div className="absolute left-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {FOLLOW_UP_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusSelect(opt.value)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  followUpStatus === opt.value ? "bg-[var(--brand-tint)] text-[var(--brand)]" : "text-slate-700"
                }`}
              >
                <opt.icon className="mt-0.5 h-4 w-4" aria-hidden />
                <div>
                  <div className="font-medium">{en ? opt.labelEn : opt.label}</div>
                  <div className="text-xs text-slate-500">{en ? opt.descEn : opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={handleNoteClick} className={btn(Boolean(note))}>
        <NotebookPen className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{note ? t("qa.btn.has-note") : t("inbox.item.note")}</span>
      </button>

      <button type="button" onClick={handleCompare} className={btn(localInCompare)} aria-pressed={localInCompare}>
        <ArrowLeftRight className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{localInCompare ? t("qa.btn.comparing") : t("inbox.item.compare")}</span>
      </button>
      {localInCompare && (
        <a href="/compare" className="inline-flex h-9 items-center px-1 text-sm font-medium text-[var(--brand)] underline-offset-4 hover:underline">
          {t("qa.btn.go-compare")} →
        </a>
      )}

      {/* 低频操作收进「更多」 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowMore(!showMore); setShowStatusMenu(false); setShowExportMenu(false); }}
          className={btn(false)}
          aria-expanded={showMore}
          aria-label={en ? "More actions" : "更多操作"}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
        {showMore && (
          <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <button data-owner-only type="button" onClick={() => { handleRead(); setShowMore(false); }} disabled={isPending} className={menuItem}>
              <Check className="h-4 w-4" aria-hidden />
              <span>{isRead ? t("qa.btn.read") : t("qa.btn.mark-read")}</span>
            </button>
            <button type="button" onClick={() => { handleShare(); setShowMore(false); }} className={menuItem}>
              <Share2 className="h-4 w-4" aria-hidden />
              <span>{t("inbox.x.share")}</span>
            </button>
            <div className="mx-2 my-1 h-px bg-slate-100" />
            <button type="button" onClick={() => { handleCopyFullText(); setShowMore(false); }} className={menuItem}>
              <ClipboardList className="h-4 w-4" aria-hidden />
              <span>{t("qa.menu.copy-text")}</span>
            </button>
            <button type="button" onClick={() => { handleExportWord(); setShowMore(false); }} className={menuItem}>
              <FileText className="h-4 w-4" aria-hidden />
              <span>{t("qa.menu.word")}</span>
            </button>
            <button type="button" onClick={() => { handleExportNote(); setShowMore(false); }} className={menuItem}>
              <NotebookPen className="h-4 w-4" aria-hidden />
              <span>{t("qa.menu.template")}</span>
            </button>
            <div className="mx-2 my-1 h-px bg-slate-100" />
            <RecaptureButton sourceId={sourceId} url={url} isMock={isMock} className={menuItem} />
          </div>
        )}
      </div>

      {/* 备注编辑器 */}
      {showNoteEditor && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">{t("detail.research.note")}</div>
            <div className="text-xs text-slate-400">{t("qa.local-only")}</div>
          </div>
          <textarea
            ref={noteTextareaRef}
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder={t("detail.research.note-ph")}
            className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setShowNoteEditor(false)} className="inline-flex h-8 items-center rounded-full px-3 text-sm text-slate-600 hover:bg-slate-100">
              {en ? "Cancel" : "取消"}
            </button>
            <button type="button" onClick={handleNoteSave} className="inline-flex h-8 items-center rounded-full bg-slate-900 px-3 text-sm text-white hover:bg-slate-700">
              {en ? "Save" : "保存"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
