"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  resetLastCheckTime,
  checkNotifications,
  type NotificationPrefs,
} from "@/lib/notifications";
import { cachedFetch, clearFetchCache } from "@/lib/fetch-cache";
import { usePrefs } from "@/contexts/prefs-context";
import {
  AlarmClock, Bell, Building2, ChartColumn, ClipboardList, House, Lightbulb, Mail, Mailbox, MapPin, MessageSquare, RadioTower, Rocket, Settings, SlidersVertical, Star, Target, TrendingUp, Zap, type LucideIcon,
} from "lucide-react";

type SubscriptionRecord = {
  id: string;
  userId: string;
  type: "department" | "keyword" | "category";
  target: string;
  targetName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type DepartmentOption = {
  name: string;
  count: number;
};

type KeywordOption = {
  keyword: string;
  departmentName: string;
  weight: number;
};

type SubscriptionsApiResponse = {
  subscriptions: SubscriptionRecord[];
};

type DimensionsApiResponse = {
  departments: Array<{ departmentName: string; count: number }>;
};

type KeywordsApiResponse = {
  keywords: KeywordOption[];
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value ?? "0000";
    const m = parts.find((p) => p.type === "month")?.value ?? "00";
    const day = parts.find((p) => p.type === "day")?.value ?? "00";
    return `${y}-${m}-${day}`;
  } catch {
    return String(iso).slice(0, 10);
  }
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium transition sm:gap-2 sm:px-4 sm:text-sm ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span className="shrink-0"><Icon className="h-4 w-4" aria-hidden /></span>
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ToggleSwitch({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        enabled ? "bg-sky-600" : "bg-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function PrefRuleItem({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  disabled,
  disabledReason,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="shrink-0"><Icon className="h-5 w-5" aria-hidden /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-slate-900">{title}</div>
          {badge && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{description}</div>
        {disabled && disabledReason && (
          <div className="mt-1 text-[11px] text-slate-400">{disabledReason}</div>
        )}
      </div>
      <div className="shrink-0 pt-0.5">
        <ToggleSwitch enabled={enabled} onChange={onToggle} disabled={disabled} />
      </div>
    </div>
  );
}

type ImpactItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  linkText?: string;
};

function SubscriptionImpactCard({
  icon: Icon,
  title,
  subtitle,
  items,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  items: ImpactItem[];
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 rounded-xl border border-sky-100 bg-white/60 p-3"
          >
            <div className="shrink-0"><item.icon className="h-4 w-4" aria-hidden /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800">{item.title}</div>
              <div className="mt-0.5 text-xs text-slate-500">{item.description}</div>
              {item.href && item.linkText && (
                <Link
                  href={item.href}
                  className="mt-1.5 inline-flex items-center gap-0.5 text-xs text-sky-600 hover:text-sky-700"
                >
                  {item.linkText}
                  <span className="transition group-hover:translate-x-0.5">→</span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const { language } = usePrefs();
  const en = language === "en";
  const L = useCallback((zh: string, enText: string) => (en ? enText : zh), [en]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [keywords, setKeywords] = useState<KeywordOption[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"department" | "keyword" | "notify">("department");

  const [newDepartment, setNewDepartment] = useState("");
  const [newDeptName, setNewDeptName] = useState("");

  const [newKeyword, setNewKeyword] = useState("");
  const [newKwName, setNewKwName] = useState("");

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [notifTestLoading, setNotifTestLoading] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const [subRes, deptRes, kwRes] = await Promise.all([
          cachedFetch<SubscriptionsApiResponse>("/api/monitor/subscriptions", { signal: abortController.signal }),
          cachedFetch<DimensionsApiResponse>("/api/monitor/items?view=dimensions", { signal: abortController.signal }),
          cachedFetch<KeywordsApiResponse>("/api/monitor/keywords?departmentName=__global__", { signal: abortController.signal }),
        ]);

        if (cancelled || abortController.signal.aborted) return;

        const subList: SubscriptionRecord[] = Array.isArray(subRes?.subscriptions) ? subRes.subscriptions : [];
        setSubscriptions(subList);

        const deptList: DepartmentOption[] = Array.isArray(deptRes?.departments)
          ? deptRes.departments.map((d) => ({
              name: d.departmentName,
              count: d.count,
            }))
          : [];
        setDepartments(deptList);

        const kwList: KeywordOption[] = Array.isArray(kwRes?.keywords)
          ? kwRes.keywords.map((k) => ({
              keyword: k.keyword,
              departmentName: k.departmentName,
              weight: k.weight,
            }))
          : [];
        setKeywords(kwList);

        setNotifPrefs(getNotificationPrefs());
      } catch (e) {
        if (cancelled || abortController.signal.aborted) return;
        const err = e as Error;
        setMessage({ type: "error", text: err.message || L("加载失败", "Failed to load") });
        setTimeout(() => setMessage(null), 3000);
      }
    })();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, []);

  const groupedSubscriptions = useMemo(() => {
    const byType = new Map<"department" | "keyword" | "category", SubscriptionRecord[]>();
    byType.set("department", []);
    byType.set("keyword", []);
    byType.set("category", []);

    for (const sub of subscriptions) {
      const list = byType.get(sub.type)!;
      list.push(sub);
    }

    return {
      departments: byType.get("department")!,
      keywords: byType.get("keyword")!,
      categories: byType.get("category")!,
    };
  }, [subscriptions]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePrefToggle = useCallback(
    (key: keyof NotificationPrefs) => {
      if (!notifPrefs) return;
      const newPrefs = setNotificationPrefs({ [key]: !notifPrefs[key] });
      setNotifPrefs(newPrefs);
      showMessage("success", L("设置已保存", "Settings saved"));
    },
    [notifPrefs, L],
  );

  const handleTestNotification = async () => {
    if (notifTestLoading) return;
    setNotifTestLoading(true);
    try {
      resetLastCheckTime();
      const result = await checkNotifications(undefined, true);
      showMessage(
        "success",
        result.newCount > 0
          ? L(`检查完成，新增 ${result.newCount} 条提醒`, `Checked — ${result.newCount} new alerts`)
          : L("检查完成，暂无新提醒", "Checked — no new alerts"),
      );
    } catch (e) {
      showMessage("error", L("检查失败，请稍后重试", "Check failed, try again later"));
    } finally {
      setNotifTestLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) {
      showMessage("error", L("请选择机构", "Pick a source"));
      return;
    }

    try {
      const res = await fetch("/api/monitor/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "department",
          target: newDepartment.trim(),
          targetName: newDeptName.trim() || undefined,
          enabled: true,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || L("添加失败", "Couldn't add"));

      clearFetchCache("/api/monitor/subscriptions");

      const updated = await fetch("/api/monitor/subscriptions").then((r) => r.json());
      setSubscriptions(Array.isArray(updated?.subscriptions) ? updated.subscriptions : []);
      setNewDepartment("");
      setNewDeptName("");
      showMessage("success", L("关注成功", "Followed"));
    } catch (e) {
      showMessage("error", e instanceof Error ? e.message : L("添加失败", "Couldn't add"));
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      showMessage("error", L("请选择或输入关键词", "Pick or type a keyword"));
      return;
    }

    try {
      const res = await fetch("/api/monitor/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "keyword",
          target: newKeyword.trim(),
          targetName: newKwName.trim() || undefined,
          enabled: true,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || L("添加失败", "Couldn't add"));

      clearFetchCache("/api/monitor/subscriptions");

      const updated = await fetch("/api/monitor/subscriptions").then((r) => r.json());
      setSubscriptions(Array.isArray(updated?.subscriptions) ? updated.subscriptions : []);
      setNewKeyword("");
      setNewKwName("");
      showMessage("success", L("关注成功", "Followed"));
    } catch (e) {
      showMessage("error", e instanceof Error ? e.message : L("添加失败", "Couldn't add"));
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    try {
      const res = await fetch("/api/monitor/subscriptions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || L("删除失败", "Couldn't remove"));

      clearFetchCache("/api/monitor/subscriptions");

      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      showMessage("success", L("已取消关注", "Unfollowed"));
    } catch (e) {
      showMessage("error", e instanceof Error ? e.message : L("删除失败", "Couldn't remove"));
    }
  };

  const handleToggleSubscription = async (id: string) => {
    try {
      const res = await fetch("/api/monitor/subscriptions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "toggle", id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || L("操作失败", "Something went wrong"));

      clearFetchCache("/api/monitor/subscriptions");

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      );
    } catch (e) {
      showMessage("error", e instanceof Error ? e.message : L("操作失败", "Something went wrong"));
    }
  };

  const popularKeywords = useMemo(() => {
    return keywords.slice(0, 12).map((k) => k.keyword);
  }, [keywords]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{L("关注设置", "Subscriptions")}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {L("配置你关心的来源、领域和关键词，获取更精准的内容推送", "Choose the sources, topics and keywords you care about for sharper recommendations")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <button
              type="button"
              onClick={() => {
                const data = {
                  version: 1,
                  exportedAt: new Date().toISOString(),
                  subscriptions: subscriptions.map(({ id: _id, ...rest }) => rest),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
            >
              {L("↓ 导出关注", "↓ Export follows")}
            </button>
            <button
              type="button"
              onClick={() => {
                const depts = subscriptions.filter((s) => s.type === "department");
                const kws = subscriptions.filter((s) => s.type === "keyword");
                const deptsXml = depts.map((s) => `      <outline type="rss" text="${escXml(s.targetName ?? s.target)}" title="${escXml(s.targetName ?? s.target)}" />`).join("\n");
                const kwsXml = kws.map((s) => `      <outline text="${escXml(s.target)}" title="${escXml(s.target)}" />`).join("\n");
                const opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>${L("创作者雷达 订阅列表", "Creator Radar subscriptions")}</title></head>\n  <body>\n    <outline text="${L("关注机构", "Sources")}" title="${L("关注机构", "Sources")}">\n${deptsXml}\n    </outline>\n    <outline text="${L("关注关键词", "Keywords")}" title="${L("关注关键词", "Keywords")}">\n${kwsXml}\n    </outline>\n  </body>\n</opml>`;
                const blob = new Blob([opml], { type: "text/x-opml" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.opml`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
            >
              ↓ OPML
            </button>
            <label data-owner-only className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">
              {L("↑ 导入 OPML", "↑ Import OPML")}
              <input
                type="file"
                accept=".opml,.xml"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, "text/xml");
                    const outlines = Array.from(doc.querySelectorAll("outline"));
                    const targets = outlines
                      .map((el) => el.getAttribute("text") || el.getAttribute("title") || "")
                      .filter((t) => t.trim().length > 0);
                    if (targets.length === 0) throw new Error(L("未找到可导入的订阅项", "Nothing to import found"));
                    let added = 0;
                    for (const target of targets) {
                      try {
                        const res = await fetch("/api/monitor/subscriptions", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ type: "department", target: target.trim(), enabled: true }),
                        });
                        const json = await res.json();
                        if (json.ok) added++;
                      } catch {}
                    }
                    const updated = await fetch("/api/monitor/subscriptions").then((r) => r.json());
                    setSubscriptions(Array.isArray(updated?.subscriptions) ? updated.subscriptions : []);
                    showMessage("success", L(`从 OPML 导入 ${added} 个机构订阅`, `Imported ${added} sources from OPML`));
                  } catch (err) {
                    showMessage("error", L(`导入失败：${(err as Error).message}`, `Import failed: ${(err as Error).message}`));
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <label data-owner-only className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">
              {L("↑ 导入关注", "↑ Import follows")}
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const parsed = JSON.parse(text) as { subscriptions?: Array<{ type: string; target: string; targetName?: string; enabled?: boolean }> };
                    if (!Array.isArray(parsed.subscriptions)) throw new Error(L("格式错误", "Invalid format"));
                    let added = 0;
                    for (const sub of parsed.subscriptions) {
                      if (!sub.type || !sub.target) continue;
                      try {
                        const res = await fetch("/api/monitor/subscriptions", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ type: sub.type, target: sub.target, targetName: sub.targetName, enabled: sub.enabled ?? true }),
                        });
                        const json = await res.json();
                        if (json.ok) added++;
                      } catch {}
                    }
                    const updated = await fetch("/api/monitor/subscriptions").then((r) => r.json());
                    setSubscriptions(Array.isArray(updated?.subscriptions) ? updated.subscriptions : []);
                    showMessage("success", L(`导入完成，新增 ${added} 条关注`, `Import done — ${added} follows added`));
                  } catch (err) {
                    showMessage("error", L(`导入失败：${(err as Error).message}`, `Import failed: ${(err as Error).message}`));
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-8 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
          <TabButton
            active={activeTab === "department"}
            onClick={() => setActiveTab("department")}
            icon={Building2}
            label={L(L("关注的机构", "Sources"), "Sources")}
            count={groupedSubscriptions.departments.length}
          />
          <TabButton
            active={activeTab === "keyword"}
            onClick={() => setActiveTab("keyword")}
            icon={Bell}
            label={L(L("关注的领域关键词", "Keywords"), "Keywords")}
            count={groupedSubscriptions.keywords.length}
          />
          <TabButton
            active={activeTab === "notify"}
            onClick={() => setActiveTab("notify")}
            icon={Settings}
            label={L(L("通知与推送", "Notifications"), "Notifications")}
          />
        </div>

        {activeTab === "department" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-900">{L("添加关注的机构", "Follow a source")}</h2>
              <p className="mb-4 text-xs text-slate-500">
                {L("关注后，该来源发布的内容会在信号雷达和工作台中优先展示", "Items from followed sources get priority in Signal Radar and your Workspace")}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">{L("选择机构", "Source")}</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => {
                      setNewDepartment(e.target.value);
                      const dept = departments.find((d) => d.name === e.target.value);
                      setNewDeptName(dept?.name || "");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">{L("请选择机构", "Pick a source")}</option>
                    {departments.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}{en ? ` (${d.count})` : `（${d.count} 条）`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">{L("显示名称（可选）", "Display name (optional)")}</label>
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder={L(L("输入备注名称", "Add a nickname"), "Add a nickname")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex items-end">
                  <button data-owner-only
                    onClick={handleAddDepartment}
                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {L("添加关注", "Follow")}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  {L("已关注的机构", "Followed sources")}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                    {groupedSubscriptions.departments.length}{en ? "" : " 个"}
                  </span>
                </h3>
                <Link
                  href="/inbox?view=byDepartment"
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  {L("浏览全部机构 →", "Browse all sources →")}
                </Link>
              </div>
              {groupedSubscriptions.departments.length > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ChartColumn className="h-5 w-5" aria-hidden />
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {(() => {
                          const n = groupedSubscriptions.departments.reduce((sum, sub) => {
                            const dept = departments.find((d) => d.name === sub.target);
                            return sum + (dept?.count || 0);
                          }, 0);
                          return L(`预计覆盖 ${n} 条内容`, `Covers about ${n} items`);
                        })()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {(() => {
                          const n = groupedSubscriptions.departments.filter((s) => s.enabled).length;
                          return L(`来自 ${n} 个已启用的关注机构`, `From ${n} active sources`);
                        })()}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/inbox"
                    className="shrink-0 rounded-full bg-sky-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700"
                  >
                    {L("查看效果 →", "See it in action →")}
                  </Link>
                </div>
              )}
              {groupedSubscriptions.departments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  {L("暂无关注的机构，在上方添加", "No sources followed yet — add one above")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="w-1/3 px-4 py-3 text-left font-medium text-slate-500">{L("机构名称", "Source")}</th>
                        <th className="w-24 px-4 py-3 text-center font-medium text-slate-500">{L("状态", "Status")}</th>
                        <th className="w-32 px-4 py-3 text-left font-medium text-slate-500">{L("添加时间", "Added")}</th>
                        <th className="w-24 px-4 py-3 text-right font-medium text-slate-500">{L("操作", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedSubscriptions.departments.map((sub) => (
                        <tr key={sub.id}>
                          <td className="px-4 py-3">
                            <span className="text-slate-900">{sub.targetName || sub.target}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button data-owner-only
                              onClick={() => handleToggleSubscription(sub.id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                sub.enabled
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {sub.enabled ? L("已关注", "Following") : L("已暂停", "Paused")}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(sub.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button data-owner-only
                              onClick={() => handleDeleteSubscription(sub.id)}
                              className="rounded-lg px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-50"
                            >
                              {L("取消关注", "Unfollow")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <SubscriptionImpactCard
              icon={Lightbulb}
              title={L(L("关注机构后，你会在这些地方看到它们", "Where followed sources show up"), "Where followed sources show up")}
              subtitle={L(L("设置关注后，系统会自动帮你优先呈现相关内容", "Once you follow something, related items are surfaced first"), "Once you follow something, related items are surfaced first")}
              items={[
                {
                  icon: RadioTower,
                  title: L("信号雷达优先展示", "Ranked first in Signal Radar"),
                  description: L("你关注的来源发布的内容，会在信号雷达中优先排序并标记", "Items from sources you follow are ranked higher and tagged in Signal Radar"),
                  href: "/signals",
                  linkText: L("查看信号雷达", "Open Signal Radar"),
                },
                {
                  icon: House,
                  title: L("工作台重点提醒", "Highlighted in Workspace"),
                  description: L("来自关注来源的高优先级内容，会出现在工作台的\"今日重点\"中", "High-priority items from followed sources appear in Workspace's \"Today\" picks"),
                  href: "/",
                  linkText: L("查看工作台", "Open Workspace"),
                },
                {
                  icon: Bell,
                  title: L("站内通知提醒", "In-app alerts"),
                  description: L("关注的来源有新内容发布时，会在通知中心中提醒你", "You get an alert when a followed source publishes something new"),
                  href: "#notify",
                  linkText: L("查看通知设置", "Notification settings"),
                },
              ]}
            />
          </div>
        )}

        {activeTab === "keyword" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-900">{L("添加关注的关键词", "Follow a keyword")}</h2>
              <p className="mb-4 text-xs text-slate-500">
                {L("关注后，包含这些关键词的内容会优先展示和提醒。也可以从下方热门关键词中快速选择", "Items with these keywords are ranked first and trigger alerts. Or pick from the popular keywords below")}
              </p>

              {popularKeywords.length > 0 && (
                <div className="mb-5">
                  <div className="mb-2 text-xs font-medium text-slate-600">{L("热门关键词：", "Popular keywords:")}</div>
                  <div className="flex flex-wrap gap-2">
                    {popularKeywords.map((kw) => {
                      const alreadyAdded = groupedSubscriptions.keywords.some(
                        (s) => s.target === kw
                      );
                      return (
                        <button
                          key={kw}
                          onClick={() => {
                            if (!alreadyAdded) {
                              setNewKeyword(kw);
                              setNewKwName(kw);
                            }
                          }}
                          disabled={alreadyAdded}
                          className={`rounded-full px-3 py-1 text-xs transition ${
                            alreadyAdded
                              ? "bg-emerald-50 text-emerald-600 cursor-default"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {alreadyAdded && "✓ "}
                          {kw}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">{L("关键词", "Keyword")}</label>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder={L(L("输入或选择关键词", "Type or pick a keyword"), "Type or pick a keyword")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">{L("显示名称（可选）", "Display name (optional)")}</label>
                  <input
                    type="text"
                    value={newKwName}
                    onChange={(e) => setNewKwName(e.target.value)}
                    placeholder={L(L("输入备注名称", "Add a nickname"), "Add a nickname")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex items-end">
                  <button data-owner-only
                    onClick={handleAddKeyword}
                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {L("添加关注", "Follow")}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  {L("已关注的关键词", "Followed keywords")}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                    {groupedSubscriptions.keywords.length}{en ? "" : " 个"}
                  </span>
                </h3>
              </div>
              {groupedSubscriptions.keywords.length > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5" aria-hidden />
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {(() => {
                          const n = groupedSubscriptions.keywords.filter((s) => s.enabled).length;
                          return L(`已设置 ${n} 个关注关键词`, `${n} keywords followed`);
                        })()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {L("动态资讯支持关注优先排序，命中越多越靠前", "News Feed can sort by follows — more matches rank higher")}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/inbox?sort=follow"
                    className="shrink-0 rounded-full bg-sky-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700"
                  >
                    {L("查看效果 →", "See it in action →")}
                  </Link>
                </div>
              )}
              {groupedSubscriptions.keywords.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  {L("暂无关注的关键词，在上方添加或从热门关键词中选择", "No keywords followed yet — add one above or pick a popular one")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="w-1/3 px-4 py-3 text-left font-medium text-slate-500">{L("关键词", "Keyword")}</th>
                        <th className="w-24 px-4 py-3 text-center font-medium text-slate-500">{L("状态", "Status")}</th>
                        <th className="w-32 px-4 py-3 text-left font-medium text-slate-500">{L("添加时间", "Added")}</th>
                        <th className="w-24 px-4 py-3 text-right font-medium text-slate-500">{L("操作", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedSubscriptions.keywords.map((sub) => (
                        <tr key={sub.id}>
                          <td className="px-4 py-3">
                            <span className="text-slate-900">{sub.targetName || sub.target}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button data-owner-only
                              onClick={() => handleToggleSubscription(sub.id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                sub.enabled
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {sub.enabled ? L("已关注", "Following") : L("已暂停", "Paused")}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(sub.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button data-owner-only
                              onClick={() => handleDeleteSubscription(sub.id)}
                              className="rounded-lg px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-50"
                            >
                              {L("取消关注", "Unfollow")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {groupedSubscriptions.categories.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    {L("关注的分类", "Followed categories")}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                      {groupedSubscriptions.categories.length}{en ? "" : " 个"}
                    </span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="w-1/3 px-4 py-3 text-left font-medium text-slate-500">{L("分类名称", "Category")}</th>
                        <th className="w-24 px-4 py-3 text-center font-medium text-slate-500">{L("状态", "Status")}</th>
                        <th className="w-32 px-4 py-3 text-left font-medium text-slate-500">{L("添加时间", "Added")}</th>
                        <th className="w-24 px-4 py-3 text-right font-medium text-slate-500">{L("操作", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedSubscriptions.categories.map((sub) => (
                        <tr key={sub.id}>
                          <td className="px-4 py-3">
                            <span className="text-slate-900">{sub.targetName || sub.target}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button data-owner-only
                              onClick={() => handleToggleSubscription(sub.id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                sub.enabled
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {sub.enabled ? L("已关注", "Following") : L("已暂停", "Paused")}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(sub.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button data-owner-only
                              onClick={() => handleDeleteSubscription(sub.id)}
                              className="rounded-lg px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-50"
                            >
                              {L("取消关注", "Unfollow")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <SubscriptionImpactCard
              icon={Target}
              title={L(L("关注关键词后，你会在这些地方看到它们", "Where followed keywords show up"), "Where followed keywords show up")}
              subtitle={L(L("匹配到你关注关键词的内容，会获得更高的曝光优先级", "Items matching your keywords get more visibility"), "Items matching your keywords get more visibility")}
              items={[
                {
                  icon: ChartColumn,
                  title: L("动态资讯排序优先", "Ranked higher in News Feed"),
                  description: L("包含关注关键词的内容，在动态资讯中会排在更靠前的位置", "Items with your keywords sit higher in News Feed"),
                  href: "/inbox",
                  linkText: L("查看动态资讯", "Open News Feed"),
                },
                {
                  icon: TrendingUp,
                  title: L("信号强度提升", "Stronger signal score"),
                  description: L("关键词匹配越多，内容的信号强度越高，越容易被识别为重点", "More keyword matches mean a higher signal score and a better chance of being marked key"),
                  href: "/signals",
                  linkText: L("查看信号雷达", "Open Signal Radar"),
                },
                {
                  icon: Bell,
                  title: L("站内通知提醒", "In-app alerts"),
                  description: L("高匹配度的新内容，会在通知中心中提醒你关注", "Strong new matches show up in your alerts"),
                  href: "#notify",
                  linkText: L("查看通知设置", "Notification settings"),
                },
              ]}
            />
          </div>
        )}

        {activeTab === "notify" && notifPrefs && (
          <div className="space-y-6">
            {/* MVP 版本提示 */}
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div><Zap className="h-5 w-5" aria-hidden /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-amber-900">
                  {L("当前为站内提醒 MVP 版本", "In-app alerts are an MVP")}
                </div>
                <div className="mt-0.5 text-xs text-amber-700">
                  {L("提醒数据保存在本地浏览器中，仅保留最近 7 天。邮件、企微等外部通道将在后续版本开放。", "Alerts are stored in this browser and kept for 7 days. Email and chat channels come in a later version.")}
                </div>
              </div>
            </div>

            {/* 站内提醒总开关 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                    <Bell className="h-5 w-5 text-sky-600" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{L("站内提醒", "In-app alerts")}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {L("关注内容有更新时，在站内通知中心提醒你", "Get an alert here when something you follow updates")}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  enabled={notifPrefs.inAppEnabled}
                  onChange={() => handlePrefToggle("inAppEnabled")}
                />
              </div>
            </div>

            {/* 提醒触发规则 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{L("提醒触发规则", "Alert rules")}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {L("满足以下条件之一时，会给你发送站内提醒", "You get an alert when any of these match")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={notifTestLoading || !notifPrefs.inAppEnabled}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {notifTestLoading ? L("检查中...", "Checking...") : L("立即检查更新", "Check now")}
                </button>
              </div>

              <div className="space-y-2">
                <PrefRuleItem
                  icon={Building2}
                  title={L(L("命中关注机构", "Followed source"), "Followed source")}
                  description={L(L("你关注的来源发布新内容时提醒", "Alert when a followed source publishes"), "Alert when a followed source publishes")}
                  enabled={notifPrefs.notifyOnDepartment}
                  onToggle={() => handlePrefToggle("notifyOnDepartment")}
                  disabled={!notifPrefs.inAppEnabled}
                />
                <PrefRuleItem
                  icon={Target}
                  title={L(L("命中关注关键词", "Followed keyword"), "Followed keyword")}
                  description={L(L("内容匹配到你关注的关键词时提醒", "Alert when an item matches a followed keyword"), "Alert when an item matches a followed keyword")}
                  enabled={notifPrefs.notifyOnKeyword}
                  onToggle={() => handlePrefToggle("notifyOnKeyword")}
                  disabled={!notifPrefs.inAppEnabled}
                />
                <PrefRuleItem
                  icon={Star}
                  title={L(L("高优先级内容", "High priority"), "High priority")}
                  description={L(L("标注为核心关注或重点内容的提醒", "Alert for items marked Core or Key"), "Alert for items marked Core or Key")}
                  enabled={notifPrefs.notifyOnHighPriority}
                  onToggle={() => handlePrefToggle("notifyOnHighPriority")}
                  disabled={!notifPrefs.inAppEnabled}
                />
                <PrefRuleItem
                  icon={RadioTower}
                  title={L(L("强信号内容", "Strong signals"), "Strong signals")}
                  description={L(L("包含截止日期、创作机会、工具更新等强信号的内容提醒", "Alert for deadlines, creative opportunities, tool updates and other strong signals"), "Alert for deadlines, creative opportunities, tool updates and other strong signals")}
                  enabled={notifPrefs.notifyOnStrongSignal}
                  onToggle={() => handlePrefToggle("notifyOnStrongSignal")}
                  disabled={!notifPrefs.inAppEnabled}
                />
              </div>
            </div>

            {/* 提醒在哪里可以看到 */}
            <SubscriptionImpactCard
              icon={MapPin}
              title={L(L("提醒会出现在这些地方", "Where alerts show up"), "Where alerts show up")}
              subtitle={L(L("打开应用就能看到，不会错过重要更新", "Visible as soon as you open the app"), "Visible as soon as you open the app")}
              items={[
                {
                  icon: Bell,
                  title: L("顶部通知铃铛", "Bell in the header"),
                  description: L("未读提醒会在顶部铃铛旁显示数字角标", "Unread alerts show as a count on the bell"),
                  href: "/notifications",
                  linkText: L("查看通知中心", "Open alerts"),
                },
                {
                  icon: House,
                  title: L("首页工作台", "Workspace"),
                  description: L("新提醒会在工作台顶部聚合展示", "New alerts are grouped at the top of Workspace"),
                  href: "/",
                  linkText: L("查看工作台", "Open Workspace"),
                },
                {
                  icon: ClipboardList,
                  title: L("通知中心列表", "Alerts list"),
                  description: L("所有提醒按时间汇总在通知中心，支持一键加入待读", "All alerts in time order, one click to add to your queue"),
                  href: "/notifications",
                  linkText: L("查看全部提醒", "See all alerts"),
                },
              ]}
            />

            {/* 其他通道占位 */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/60">
                  <Mailbox className="h-5 w-5 text-slate-500" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-slate-900">{L("更多通知方式", "More channels")}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {L("以下通道正在规划中，将在后续版本逐步开放", "These channels are planned for later versions")}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Mail className="h-4 w-4" aria-hidden />
                      <span>{L("邮件推送", "Email")}</span>
                    </div>
                    <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] text-slate-500">
                      {L("规划中", "Planned")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{L("重要内容直接发送到邮箱", "Important items sent to your inbox")}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MessageSquare className="h-4 w-4" aria-hidden />
                      <span>{L("企微/飞书机器人", "WeCom / Lark bot")}</span>
                    </div>
                    <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] text-slate-500">
                      {L("规划中", "Planned")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{L("通过群机器人实时推送", "Real-time pushes through a group bot")}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <AlarmClock className="h-4 w-4" aria-hidden />
                      <span>{L("每日摘要", "Daily digest")}</span>
                    </div>
                    <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] text-slate-500">
                      {L("规划中", "Planned")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{L("每天早上推送昨日动态汇总", "A summary of yesterday every morning")}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <SlidersVertical className="h-4 w-4" aria-hidden />
                      <span>{L("免打扰时段", "Quiet hours")}</span>
                    </div>
                    <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] text-slate-500">
                      {L("规划中", "Planned")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{L("设置不希望被打扰的时间段", "Set times you don't want to be disturbed")}</div>
                </div>
              </div>
            </div>

            {/* 版本规划 */}
            <div id="roadmap" className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/50 to-indigo-50/30 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600">
                  <Rocket className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-slate-900">{L("版本规划 (V2.0)", "Roadmap (v2.0)")}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {L("了解即将上线的功能，管理你的预期", "What's coming next")}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-medium text-emerald-700">
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{L("用户体系与数据持久化", "Accounts and saved data")}</span>
                      <span className="rounded-full bg-emerald-100/60 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        {L("最高优先级", "Top priority")}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {L("当前数据保存在本地浏览器，换设备或清缓存会丢失。V2.0 将支持账号登录和云端同步，确保数据安全持久。", "Data lives in this browser today and is lost on a new device or cleared cache. v2.0 adds sign-in and cloud sync.")}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-medium text-sky-700">
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{L("邮件/企微推送", "Email / WeCom pushes")}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {L("将开放邮件、企业微信、飞书等外部通知通道，重要内容及时送达，不再错过关键信息。", "Email, WeCom and Lark channels so important items reach you in time.")}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-700">
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{L("团队协作能力", "Team collaboration")}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {L("支持多人共享关注配置、协作标注和内容对比，提升团队信息同步效率。", "Shared follows, joint annotations and comparisons for teams.")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  <span>{L("注：以上为规划内容，具体上线时间以实际发布为准。", "Note: this is a plan; actual release dates may change.")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
