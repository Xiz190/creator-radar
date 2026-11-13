"use client";

import { useEffect } from "react";
import { usePrefs } from "@/contexts/prefs-context";

type Props = { open: boolean; onClose: () => void };

const SHORTCUTS = [
  { group: "全局", groupEn: "Global", rows: [
    { key: "⌘K / Ctrl+K", keyEn: "⌘K / Ctrl+K", label: "打开命令面板", labelEn: "Open the command palette" },
    { key: "?", keyEn: "?", label: "快捷键速查（本弹窗）", labelEn: "Show this shortcut list" },
    { key: "Alt+F", keyEn: "Alt+F", label: "切换专注模式（隐藏导航）", labelEn: "Toggle focus mode (hides navigation)" },
    { key: "ESC", keyEn: "ESC", label: "关闭当前弹窗", labelEn: "Close the current dialog" },
  ]},
  { group: "G+键 全局导航", groupEn: "G + key: go to", rows: [
    { key: "G → I", keyEn: "G → I", label: "跳转收件箱", labelEn: "News Feed" },
    { key: "G → S", keyEn: "G → S", label: "跳转信号雷达", labelEn: "Signal Radar" },
    { key: "G → D", keyEn: "G → D", label: "跳转仪表盘", labelEn: "Trends" },
    { key: "G → H", keyEn: "G → H", label: "跳转首页", labelEn: "Workspace" },
    { key: "G → M", keyEn: "G → M", label: "跳转监控", labelEn: "Admin (owner only)" },
  ]},
  { group: "动态资讯", groupEn: "News Feed", rows: [
    { key: "J", keyEn: "J", label: "聚焦下一条目", labelEn: "Next item" },
    { key: "K", keyEn: "K", label: "聚焦上一条目", labelEn: "Previous item" },
    { key: "Enter", keyEn: "Enter", label: "展开 / 折叠聚焦条目", labelEn: "Expand or collapse the item" },
    { key: "R", keyEn: "R", label: "标记当前条目已读/未读", labelEn: "Mark read / unread" },
    { key: "S", keyEn: "S", label: "收藏 / 取消收藏", labelEn: "Star / unstar" },
    { key: "O", keyEn: "O", label: "在新 Tab 打开原文", labelEn: "Open the original in a new tab" },
    { key: "F", keyEn: "F", label: "关注 / 取关聚焦条目所属机构", labelEn: "Follow / unfollow the item's source" },
    { key: "▷ 按钮", keyEn: "▷ button", label: "右侧侧边预览面板", labelEn: "Preview in the side panel" },
    { key: "密度切换", keyEn: "Density", label: "紧凑 / 标准 / 宽松三档列表间距", labelEn: "Compact, standard or relaxed spacing" },
    { key: "随机发现", keyEn: "Shuffle", label: "随机展开一条未读内容", labelEn: "Open a random unread item" },
    { key: "▲ 收起全部", keyEn: "▲ Collapse all", label: "收起当前所有已展开条目", labelEn: "Collapse every open item" },
    { key: "批量选择", keyEn: "Select", label: "多选后可批量稍后读、置顶、收藏、标记", labelEn: "Select several, then save, pin, star or mark them together" },
  ]},
  { group: "命令面板", groupEn: "Command palette", rows: [
    { key: "↑ / ↓", keyEn: "↑ / ↓", label: "上下选择", labelEn: "Move up / down" },
    { key: "Enter", keyEn: "Enter", label: "执行所选命令", labelEn: "Run the selected command" },
    { key: "ESC", keyEn: "ESC", label: "关闭面板", labelEn: "Close the palette" },
  ]},
  { group: "功能导览", groupEn: "Tour", rows: [
    { key: "→ / Enter", keyEn: "→ / Enter", label: "下一步", labelEn: "Next step" },
    { key: "←", keyEn: "←", label: "上一步", labelEn: "Previous step" },
    { key: "ESC", keyEn: "ESC", label: "退出导览", labelEn: "Exit the tour" },
  ]},
];

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  const en = usePrefs().language === "en";
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") { e.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{en ? "Keyboard shortcuts" : "键盘快捷键"}</h2>
              <p className="text-xs text-slate-400">{en ? "Press ? or Esc to close" : "按 ? 或 Esc 关闭"}</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-6">
            <div className="space-y-6">
              {SHORTCUTS.map((section) => (
                <div key={section.groupEn}>
                  <div className="mb-2 text-[11px] font-semibold text-slate-500">{en ? section.groupEn : section.group}</div>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    {section.rows.map((row, i) => (
                      <div key={row.key} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i > 0 ? "border-t border-slate-50" : ""}`}>
                        <span className="text-slate-700">{en ? row.labelEn : row.label}</span>
                        <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">{en ? row.keyEn : row.key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 px-6 py-3 text-center text-[11px] text-slate-400">
            {en ? "Press " : "随时按 "}<kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[11px]">?</kbd>{en ? " any time to bring this list back" : " 打开这个列表"}
          </div>
        </div>
      </div>
    </>
  );
}
