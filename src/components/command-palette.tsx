"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { usePrefs } from "@/contexts/prefs-context";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  AlarmClock, Bell, ChartColumn, CircleCheck, ClipboardList, Clock, Flame,
  House, Inbox, Languages, Mail, Mailbox, Moon, Pin, RadioTower, Search, Settings,
  Star, TrendingUp, type LucideIcon,
} from "lucide-react";
import { useDemoVisitor } from "@/hooks/use-demo-visitor";
import { isOwnerOnlyPage } from "@/lib/owner-only";

type CmdItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  desc?: string;
  action: () => void;
  keywords?: string;
  type?: "nav" | "action" | "recent";
  /** 跳转目标（nav 类）——演示站访客按 owner-only 清单过滤 */
  href?: string;
  /** 会写服务器的命令——演示站访客看不到 */
  ownerOnly?: boolean;
};

type RecentEntry = {
  title: string;
  url: string;
  sourceId: string;
  departmentName: string;
  listPublishedAt?: string;
  viewedAt: string;
};

function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cmd_history") ?? "[]") as string[]; } catch { return []; }
  });
  const addHistory = useCallback((q: string) => {
    setHistory((prev) => {
      const next = [q, ...prev.filter((h) => h !== q)].slice(0, 5);
      try { localStorage.setItem("cmd_history", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem("cmd_history"); } catch {}
  }
  return { history, addHistory, clearHistory };
}

function useRecentItems(onClose: () => void): CmdItem[] {
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("inbox_recent_items") ?? "[]") as RecentEntry[];
      setRecent(stored.slice(0, 5));
    } catch {}
  }, []);
  return recent.map((item) => ({
    id: `recent-${item.url}`,
    icon: Clock,
    label: item.title.length > 42 ? item.title.slice(0, 42) + "…" : item.title,
    desc: `${item.departmentName}${item.listPublishedAt ? ` · ${item.listPublishedAt.slice(0, 10)}` : ""}`,
    action: () => { window.open(item.url, "_blank"); onClose(); },
    keywords: `recent 最近 ${item.title} ${item.departmentName}`,
    type: "recent" as const,
  }));
}

type Props = {
  open: boolean;
  onClose: () => void;
};

function useCommandItems(onClose: () => void): CmdItem[] {
  const router = useRouter();
  const prefs = usePrefs();
  const en = prefs.language === "en";
  const L = (zh: string, enText: string) => (en ? enText : zh);

  function go(href: string) {
    router.push(href);
    onClose();
  }

  return [
    // 导航
    { id: "search",    type: "nav",    icon: Search, label: L("全局搜索", "Search"),     desc: L("跨收件箱与信号雷达搜索", "Search the feed and Signal Radar"), href: "/search", action: () => go("/search"),   keywords: "search 搜索 全局 查找" },
    { id: "readlist",  type: "nav",    icon: Pin, label: L("稍后读清单", "Reading list"),   desc: L("查看标记的待读条目", "Items you saved for later"),     href: "/readinglist", action: () => go("/readinglist"), keywords: "reading list 稍后读 书签" },
    { id: "digest",    type: "nav",    icon: Mail, label: L("今日日报预览", "Daily digest preview"),  desc: L("生成 HTML 邮件摘要", "The HTML email digest"),     href: "/digest", action: () => go("/digest"),     keywords: "digest 日报 邮件 email" },
    { id: "stats",     type: "nav",    icon: TrendingUp, label: L("个人统计", "My stats"),     desc: L("阅读率、关键词热度等", "Read rate, keyword activity and more"),   href: "/stats", action: () => go("/stats"),      keywords: "stats 统计 阅读率 个人" },
    { id: "home",      type: "nav",    icon: House, label: L("我的工作台", "Workspace"),   desc: L("回到首页总览", "Back to the home page"),          href: "/", action: () => go("/"),         keywords: "home workspace 工作台" },
    { id: "inbox",     type: "nav",    icon: Inbox, label: L("全部动态", "News Feed"),     desc: L("浏览所有监测内容", "Everything the crawlers picked up"),       href: "/inbox", action: () => go("/inbox"),    keywords: "inbox 动态 收件箱" },
    { id: "signals",   type: "nav",    icon: RadioTower, label: L("信号雷达", "Signal Radar"),     desc: L("高价值信号筛选", "Items sorted by signal type"),         href: "/signals", action: () => go("/signals"),  keywords: "signals 信号 雷达" },
    { id: "subscribe", type: "nav",    icon: Bell, label: L("关注设置", "Subscriptions"),     desc: L("订阅来源与关键词", "Sources and keywords you follow"),       href: "/subscribe", action: () => go("/subscribe"),keywords: "subscribe 关注 订阅" },
    { id: "dashboard", type: "nav",    icon: ChartColumn, label: L("数据趋势", "Trends"),     desc: L("关键词与来源的走势", "How keywords and sources are moving"),     href: "/dashboard", action: () => go("/dashboard"),keywords: "dashboard 数据 趋势 图表" },
    { id: "changelog", type: "nav",    icon: ClipboardList, label: L("更新日志", "Changelog"),     desc: L("功能迭代记录", "What changed and when"),           href: "/changelog", action: () => go("/changelog"),keywords: "changelog 更新 历史" },
    { id: "monitor",   type: "nav",    icon: Settings, label: L("系统管理", "Admin"),     desc: L("监测配置与任务运行", "Crawler config and runs"),     href: "/monitor", action: () => go("/monitor"),  keywords: "monitor 系统 管理" },
    { id: "keywords",  type: "nav",    icon: Languages, label: L("关键词库", "Keyword library"),     desc: L("管理全局关键词", "Manage the shared keyword list"),         href: "/keywords", action: () => go("/keywords"), keywords: "keywords 关键词" },
    // 快速筛选
    { id: "starred",   type: "nav",    icon: Star, label: L("仅看收藏", "Starred only"),     desc: L("在收件箱中只看收藏内容", "Show starred items in the feed"), href: "/inbox?view=starred", action: () => go("/inbox?view=starred"), keywords: "starred 收藏 星标" },
    { id: "unread",    type: "nav",    icon: Mailbox, label: L("仅看未读", "Unread only"),     desc: L("在收件箱中只看未读内容", "Show unread items in the feed"), href: "/inbox?onlyUnread=1", action: () => go("/inbox?onlyUnread=1"), keywords: "unread 未读" },
    // 操作
    {
      id: "toggle-dark", type: "action", icon: Moon, label: L("切换深色/浅色", "Toggle dark mode"), desc: L("当前：", "Current: ") + (prefs.darkMode === true ? L("深色", "dark") : prefs.darkMode === false ? L("浅色", "light") : L("跟随系统", "system")),
      action: () => {
        prefs.setDarkMode(prefs.darkMode === true ? false : true);
        onClose();
      },
      keywords: "dark light 深色 浅色 主题",
    },
    {
      id: "mark-all-read", type: "action", ownerOnly: true, icon: CircleCheck, label: L("全部标为已读", "Mark all read"), desc: L("将收件箱所有条目标为已读", "Mark every feed item as read"),
      action: async () => {
        onClose();
        try {
          await fetch("/api/monitor/items/batch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "markAllRead" }),
          });
          window.dispatchEvent(new CustomEvent("inbox:refetch"));
        } catch {}
      },
      keywords: "read 已读 全部",
    },
    {
      id: "go-urgent", type: "action", icon: Flame, label: L("查看高优先级", "High priority"), desc: L("跳转到核心关注和重点内容", "Core and key items in the feed"),
      href: "/inbox?importanceLevels=%E6%A0%B8%E5%BF%83%E5%85%B3%E6%B3%A8,%E9%87%8D%E7%82%B9%E5%86%85%E5%AE%B9", action: () => go("/inbox?importanceLevels=%E6%A0%B8%E5%BF%83%E5%85%B3%E6%B3%A8,%E9%87%8D%E7%82%B9%E5%86%85%E5%AE%B9"),
      keywords: "urgent priority 紧急 高优先",
    },
    {
      id: "go-deadline", type: "action", icon: AlarmClock, label: L("申报截止预警", "Deadlines"), desc: L("查看即将截止的申报信号", "Upcoming deadlines on Signal Radar"),
      href: "/signals", action: () => go("/signals"),
      keywords: "deadline 截止 申报",
    },
  ];
}

export function CommandPalette({ open, onClose }: Props) {
  const en = usePrefs().language === "en";
  const paletteRouter = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // 区分「键盘触发的高亮变化」和「鼠标悬停触发的」：
  // 只有键盘那次才该滚动。否则会形成回环——悬停改高亮→滚动→新元素移到鼠标下→
  // 又触发悬停→再滚动，视觉上就是抖。
  const scrollOnNextChangeRef = useRef(false);
  const visitor = useDemoVisitor();
  // 演示站访客：去掉作者专属页的入口和会写服务器的命令（命令可用回车执行，靠点击拦截兜不住）
  const items = useCommandItems(onClose).filter(
    (it) => !visitor || !(it.ownerOnly || (it.href && isOwnerOnlyPage(it.href))),
  );
  const recentItems = useRecentItems(onClose);
  const { history, addHistory, clearHistory } = useSearchHistory();

  // 弹窗打开时锁住背景滚动：否则鼠标不在列表上时，滚轮会直接滚穿到背后的页面
  useScrollLock(open);

  const filtered = query.trim()
    ? items.filter((item) =>
        [item.label, item.desc ?? "", item.keywords ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : items;

  const navItems = filtered.filter((i) => i.type !== "action" && i.type !== "recent");
  const actionItems = filtered.filter((i) => i.type === "action");

  // Recent items only shown when no query
  const visibleRecent = !query.trim() ? recentItems : [];

  // 输入了文字时，第一项永远是「在全部条目里搜索」——页头的搜索按钮和 ⌘K 合并后，搜内容也走这里
  const q = query.trim();
  const searchAll: CmdItem[] = q
    ? [{
        id: "search-all",
        type: "nav",
        icon: Search,
        label: en ? `Search all items for “${q}”` : `在全部条目里搜索「${q}」`,
        desc: en ? "Titles, sources and full text" : "标题、来源和正文",
        href: `/search?q=${encodeURIComponent(q)}`,
        action: () => { paletteRouter.push(`/search?q=${encodeURIComponent(q)}`); onClose(); },
      }]
    : [];

  // flat ordered list for keyboard nav (search-all first, then recent, nav, actions)
  const orderedFiltered = [...searchAll, ...visibleRecent, ...navItems, ...actionItems];

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); scrollOnNextChangeRef.current = true; setActiveIdx((i) => Math.min(i + 1, orderedFiltered.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); scrollOnNextChangeRef.current = true; setActiveIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (query.trim()) addHistory(query.trim());
        orderedFiltered[activeIdx]?.action();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, orderedFiltered, activeIdx, onClose, query, addHistory]);

  useEffect(() => {
    if (!scrollOnNextChangeRef.current) return;
    scrollOnNextChangeRef.current = false;
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!open) return null;

  function renderItem(item: CmdItem, idx: number) {
    const isActive = idx === activeIdx;
    return (
      <li
        key={item.id}
        role="option"
        aria-selected={isActive}
        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition ${
          isActive ? "bg-slate-100" : "hover:bg-slate-50"
        }`}
        onMouseEnter={() => { scrollOnNextChangeRef.current = false; setActiveIdx(idx); }}
        onClick={item.action}
      >
        <item.icon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900">{item.label}</div>
          {item.desc && <div className="text-xs text-slate-500">{item.desc}</div>}
        </div>
        {isActive && (
          <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">↵</kbd>
        )}
      </li>
    );
  }

  // portal 到 body：本组件挂在有 backdrop-filter 的 <header> 里，
  // 那会给 position:fixed 后代创建包含块，把 inset-0 压成 header 的高度。
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={en ? "Jump to a page or run an action…" : "跳转到页面、快速操作…"}
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">ESC</kbd>
        </div>

        {/* Results list */}
        <ul ref={listRef} className="max-h-80 overflow-y-auto py-2" role="listbox">
          {orderedFiltered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-400">{en ? "No matches" : "没有匹配的结果"}</li>
          ) : (
            <>
              {!query.trim() && history.length > 0 && (
                <>
                  <li className="flex items-center justify-between px-4 pb-1 pt-2">
                    <span className="text-[10px] font-medium text-slate-400">{en ? "Recent searches" : "最近搜索"}</span>
                    <button type="button" onClick={clearHistory} className="text-[10px] text-slate-300 transition hover:text-slate-500">{en ? "Clear" : "清空"}</button>
                  </li>
                  <li className="flex flex-wrap gap-1.5 px-4 pb-2">
                    {history.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setQuery(h)}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-200"
                      >
                        {h}
                      </button>
                    ))}
                  </li>
                  <li className="my-1 border-t border-slate-100" />
                </>
              )}
              {searchAll.map((item) => renderItem(item, 0))}
              {visibleRecent.length > 0 && (
                <>
                  <li className="px-4 pb-1 pt-2 text-[10px] font-medium text-slate-400">{en ? "Recently opened" : "最近访问"}</li>
                  {visibleRecent.map((item) => renderItem(item, orderedFiltered.indexOf(item)))}
                  <li className="my-1 border-t border-slate-100" />
                </>
              )}
              {navItems.length > 0 && (
                <>
                  {!query.trim() && <li className="px-4 pb-1 pt-2 text-[10px] font-medium text-slate-400">{en ? "Pages" : "导航"}</li>}
                  {navItems.map((item) => renderItem(item, orderedFiltered.indexOf(item)))}
                </>
              )}
              {actionItems.length > 0 && (
                <>
                  {navItems.length > 0 && <li className="my-1 border-t border-slate-100" />}
                  {!query.trim() && <li className="px-4 pb-1 pt-2 text-[10px] font-medium text-slate-400">{en ? "Actions" : "操作"}</li>}
                  {actionItems.map((item) => renderItem(item, orderedFiltered.indexOf(item)))}
                </>
              )}
            </>
          )}
        </ul>

        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          <span className="mr-3">{en ? "↑↓ move" : "↑↓ 切换"}</span>
          <span className="mr-3">{en ? "↵ open" : "↵ 确认"}</span>
          <span>{en ? "Esc close" : "Esc 关闭"}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
