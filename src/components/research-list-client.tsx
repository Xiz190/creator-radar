"use client";

import { useState, useMemo, useCallback, use, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getAllPersonalResearch,
  followUpLabel,
  bulkSetFollowUpStatus,
  bulkDeletePersonalResearch,
  getAllTags,
  getTagColor,
  getTagCounts,
  type PersonalResearchItem,
  type FollowUpStatus,
  type ResearchTag,
} from "@/lib/personal-research";
import {
  ArrowLeftRight, Bell, ClipboardList, NotebookPen, Star, type LucideIcon,
} from "lucide-react";
import { StatusIcon } from "@/components/status-icon";
import { usePrefs } from "@/contexts/prefs-context";
import { SourceName } from "@/components/source-name";

type StarredItem = {
  sourceId: string;
  departmentName: string;
  channelName: string;
  title: string;
  url: string;
  listPublishedAt: string;
  firstSeenAt: string;
  importanceLevel: string;
  keywordScore: number;
  categories: Array<{ category: string; score: number; topKeywords?: string[] }>;
  isStarred: boolean;
  isRead: boolean;
};

type SubscriptionItem = {
  id: string;
  type: "department" | "keyword" | "category";
  target: string;
  targetName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type ResearchTab = "followup" | "starred" | "noted" | "subscriptions" | "compare";

const TAB_CONFIG: Array<{ key: ResearchTab; label: string; labelEn: string; icon: LucideIcon }> = [
  { key: "followup", label: "待跟进", labelEn: "Follow-ups", icon: ClipboardList },
  { key: "starred", label: "收藏", labelEn: "Starred", icon: Star },
  { key: "noted", label: "有备注", labelEn: "With notes", icon: NotebookPen },
  { key: "compare", label: "对比中", labelEn: "Comparing", icon: ArrowLeftRight },
  { key: "subscriptions", label: "订阅", labelEn: "Follows", icon: Bell },
];

function summarizeTitle(title: string, maxLen = 56): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen) + "…";
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

const ACTIVE_STATUSES: FollowUpStatus[] = ["to_read", "reading", "to_act"];

function noopSubscribe() {
  return () => {};
}

function ResearchListClient({
  starredItemsPromise,
  subscriptionsPromise,
}: {
  starredItemsPromise: Promise<StarredItem[]>;
  subscriptionsPromise: Promise<SubscriptionItem[]>;
}) {
  const en = usePrefs().language === "en";
  const L = (zh: string, enText: string) => (en ? enText : zh);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const starredItems = use(starredItemsPromise);
  const subscriptions = use(subscriptionsPromise);
  const [activeTab, setActiveTab] = useState<ResearchTab>("followup");
  const [researchItems, setResearchItems] = useState<PersonalResearchItem[]>(getAllPersonalResearch);
  const [compareItems, setCompareItems] = useState<Array<{ sourceId: string; url: string; title: string }>>(() => {
    try {
      const raw = window.localStorage.getItem("compare_items");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<ResearchTag[]>(getAllTags);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>(getTagCounts);

  const refreshResearch = useCallback(() => {
    setResearchItems(getAllPersonalResearch());
    setAllTags(getAllTags());
    setTagCounts(getTagCounts());
    try {
      const raw = window.localStorage.getItem("compare_items");
      if (raw) {
        setCompareItems(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const followupItems = useMemo(() => {
    let items = researchItems
      .filter((item) => ACTIVE_STATUSES.includes(item.followUpStatus))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (selectedTag) {
      items = items.filter((item) => item.tags.includes(selectedTag));
    }
    return items;
  }, [researchItems, selectedTag]);

  const notedItems = useMemo(() => {
    let items = researchItems
      .filter((item) => item.note && item.note.trim().length > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (selectedTag) {
      items = items.filter((item) => item.tags.includes(selectedTag));
    }
    return items;
  }, [researchItems, selectedTag]);

  const tabCounts = {
    followup: followupItems.length,
    starred: starredItems.length,
    noted: notedItems.length,
    compare: compareItems.length,
    subscriptions: subscriptions.length,
  };

  // 列表数据全在浏览器本地存储里，服务端读不到：先渲染占位，挂载后再画，避免水合不一致
  if (!mounted) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />;

  return (
    <div>
      {/* 状态统计卡片 */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        {[
          { status: "to_read" as const, label: L("待读", "To read"), color: "sky" },
          { status: "reading" as const, label: L("在读", "Reading"), color: "amber" },
          { status: "to_act" as const, label: L("待行动", "To act"), color: "violet" },
          { status: "done" as const, label: L("已完成", "Done"), color: "emerald" },
        ].map(({ status, label, color }) => {
          const count = researchItems.filter(
            (item) => item.followUpStatus === status,
          ).length;
          const colorClasses: Record<string, string> = {
            sky: "bg-sky-50 text-sky-700 border-sky-100",
            amber: "bg-amber-50 text-amber-700 border-amber-100",
            violet: "bg-violet-50 text-violet-700 border-violet-100",
            emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
          };
          return (
            <div
              key={status}
              className={`rounded-2xl border p-4 ${colorClasses[color]}`}
            >
              <div className="text-2xl font-semibold">{count}</div>
              <div className="mt-0.5 text-xs">
                <StatusIcon status={status} className="inline h-3.5 w-3.5" /> {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* 标签筛选 */}
      {allTags.length > 0 && (activeTab === "followup" || activeTab === "noted") && (
        <div className="mb-6">
          <div className="mb-2 text-xs font-medium text-slate-500">{L("按标签筛选", "Filter by tag")}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedTag === null
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {L("全部", "All")}
            </button>
            {allTags.map((tag) => {
              const count = tagCounts[tag.name] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedTag === tag.name
                      ? `${tag.color} border ring-2 ring-offset-1`
                      : `${tag.color} border opacity-70 hover:opacity-100`
                  }`}
                >
                  {tag.name}
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-3 text-sm font-medium transition ${
              activeTab === tab.key
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" aria-hidden />
              <span>{en ? tab.labelEn : tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {tabCounts[tab.key]}
              </span>
            </span>
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
            )}
          </button>
        ))}
      </div>

      {/* 待跟进列表 */}
      {activeTab === "followup" && (
        <div>
          {followupItems.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={L("没有待跟进的条目", "Nothing to follow up")}
              desc={L("读到要跟进的条目时标记一下，就会出现在这里。", "Mark an item for follow-up and it shows up here.")}
              actionText={L("去动态资讯看看", "Open the News Feed")}
              actionHref="/inbox"
            />
          ) : (
            <div>
              {/* 批量操作工具栏 */}
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === followupItems.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(followupItems.map((i) => `${i.sourceId}::${i.url}`)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-sm text-slate-600">
                      {L("已选", "Selected")} <span className="font-semibold text-slate-900">{selectedIds.size}</span> / {followupItems.length}
                    </span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <>
                      {[
                        { status: "reading" as const, label: L("在读", "Reading") },
                        { status: "to_act" as const, label: L("待行动", "To act") },
                        { status: "done" as const, label: L("已完成", "Done") },
                      ].map((opt) => (
                        <button
                          key={opt.status}
                          type="button"
                          onClick={() => {
                            const items = followupItems.filter((i) =>
                              selectedIds.has(`${i.sourceId}::${i.url}`)
                            );
                            bulkSetFollowUpStatus(items, opt.status);
                            setSelectedIds(new Set());
                            refreshResearch();
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          {L("设为", "Mark ")}{opt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(L(`确定要删除选中的 ${selectedIds.size} 条吗？`, `Delete ${selectedIds.size} selected item(s)?`))) return;
                          const items = followupItems.filter((i) =>
                            selectedIds.has(`${i.sourceId}::${i.url}`)
                          );
                          bulkDeletePersonalResearch(items);
                          setSelectedIds(new Set());
                          refreshResearch();
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                      >
                        {L("删除", "Delete")}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {followupItems.map((item) => {
                  const isSelected = selectedIds.has(`${item.sourceId}::${item.url}`);
                  return (
                    <div
                      key={`${item.sourceId}::${item.url}`}
                      className={`group rounded-2xl border p-4 transition hover:shadow-sm ${
                        isSelected
                          ? "border-sky-200 bg-sky-50/30"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const id = `${item.sourceId}::${item.url}`;
                            const next = new Set(selectedIds);
                            if (e.target.checked) {
                              next.add(id);
                            } else {
                              next.delete(id);
                            }
                            setSelectedIds(next);
                          }}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <div className="shrink-0 text-lg">
                          <StatusIcon status={item.followUpStatus} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">
                              {followUpLabel(item.followUpStatus, en ? "en" : "zh")}
                            </span>
                            <span className="text-xs text-slate-400">
                              {L("更新于", "Updated")} {formatDate(item.updatedAt)}
                            </span>
                          </div>
                          <Link
                            href={`/items/${encodeURIComponent(item.sourceId)}?url=${encodeURIComponent(item.url)}`}
                            className="mt-1 block line-clamp-2 text-sm font-medium text-slate-900 hover:text-slate-600"
                          >
                            {summarizeTitle(item.title)}
                          </Link>
                          {item.note && (
                            <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
                              <NotebookPen className="mr-1 inline h-3 w-3" aria-hidden />{item.note}
                            </p>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.tags.slice(0, 4).map((tag) => {
                                const color = getTagColor(tag);
                                return (
                                  <span
                                    key={tag}
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${color} border`}
                                  >
                                    {tag}
                                  </span>
                                );
                              })}
                              {item.tags.length > 4 && (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                  +{item.tags.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 收藏列表 */}
      {activeTab === "starred" && (
        <div>
          {starredItems.length === 0 ? (
            <EmptyState
              icon={Star}
              title={L("还没有收藏", "Nothing starred yet")}
              desc={L("在条目上点收藏，就会出现在这里。", "Star an item and it shows up here.")}
              actionText={L("去动态资讯看看", "Open the News Feed")}
              actionHref="/inbox"
            />
          ) : (
            <div className="space-y-2">
              {starredItems.map((item) => (
                <Link
                  key={`${item.sourceId}-${item.url}`}
                  href={`/items/${encodeURIComponent(item.sourceId)}?url=${encodeURIComponent(item.url)}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Star className="h-3 w-3" aria-hidden />{L("已收藏", "Starred")}</span>
                        <span className="text-xs text-slate-400">
                          <SourceName name={item.departmentName} />
                        </span>
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-slate-600">
                        {summarizeTitle(item.title)}
                      </h3>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span>{item.channelName}</span>
                        {item.listPublishedAt && (
                          <span>{formatDate(item.listPublishedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 有备注列表 */}
      {activeTab === "noted" && (
        <div>
          {notedItems.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title={L("还没有写过备注", "No notes yet")}
              desc={L("在条目详情页可以写备注。", "You can add notes on any item's detail page.")}
              actionText={L("去动态资讯看看", "Open the News Feed")}
              actionHref="/inbox"
            />
          ) : (
            <div className="space-y-2">
              {notedItems.map((item) => (
                <Link
                  key={`${item.sourceId}::${item.url}`}
                  href={`/items/${encodeURIComponent(item.sourceId)}?url=${encodeURIComponent(item.url)}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <NotebookPen className="h-5 w-5 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {L("更新于", "Updated")} {formatDate(item.updatedAt)}
                        </span>
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-slate-600">
                        {summarizeTitle(item.title)}
                      </h3>
                      <p className="mt-2 text-xs text-slate-600 line-clamp-3 bg-slate-50 rounded-lg p-3">
                        {item.note}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.tags.slice(0, 4).map((tag) => {
                            const color = getTagColor(tag);
                            return (
                              <span
                                key={tag}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${color} border`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                          {item.tags.length > 4 && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                              +{item.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 对比中列表 */}
      {activeTab === "compare" && (
        <div>
          {compareItems.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title={L("还没有加入对比的条目", "Nothing to compare")}
              desc={L("在条目详情页点「加入对比」，就会出现在这里。", "Add items from their detail pages to compare them here.")}
              actionText={L("去动态资讯看看", "Open the News Feed")}
              actionHref="/inbox"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {L("已选择", "Selected")} <span className="font-semibold text-slate-900">{compareItems.length}</span> {L("条", "items")}
                </div>
                {compareItems.length >= 2 && (
                  <Link
                    href="/compare"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700"
                  >
                    <span>⇄</span>
                    <span>{L("开始对比", "Compare")}</span>
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {compareItems.map((item, idx) => (
                  <Link
                    key={`${item.sourceId}::${item.url}`}
                    href={`/items/${encodeURIComponent(item.sourceId)}?url=${encodeURIComponent(item.url)}`}
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="shrink-0 text-lg">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-violet-600">⇄ {L("对比中", "Comparing")}</span>
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-slate-600">
                        {summarizeTitle(item.title)}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
              {compareItems.length < 2 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  {L("至少选 2 条才能对比", "Pick at least 2 items to compare")}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 订阅列表 */}
      {activeTab === "subscriptions" && (
        <div>
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={L("还没有关注", "No follows yet")}
              desc={L("关注来源或关键词后，相关条目会优先出现。", "Follow a source or keyword and matching items move up.")}
              actionText={L("管理关注", "Manage follows")}
              actionHref="/subscribe"
            />
          ) : (
            <div className="space-y-4">
              <SubscriptionSection
                title={L("关注的来源", "Sources")}
                items={subscriptions.filter((s) => s.type === "department")}
              />
              <SubscriptionSection
                title={L("关注的关键词", "Keywords")}
                items={subscriptions.filter((s) => s.type === "keyword")}
              />
              <SubscriptionSection
                title={L("关注的分类", "Categories")}
                items={subscriptions.filter((s) => s.type === "category")}
              />
              <div className="text-center pt-2">
                <Link
                  href="/subscribe"
                  className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800"
                >
                  {L("管理全部关注 →", "Manage follows →")}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriptionSection({
  title,
  items,
}: {
  title: string;
  items: SubscriptionItem[];
}) {
  const en = usePrefs().language === "en";
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">
                {sub.targetName || sub.target}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {en ? `Added ${formatDate(sub.createdAt)}` : `${formatDate(sub.createdAt)} 添加`}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                sub.enabled
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {sub.enabled ? (en ? "On" : "已启用") : (en ? "Off" : "已禁用")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  actionText,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  actionText: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 py-12 text-center">
      <div className="mb-3 flex justify-center"><Icon className="h-8 w-8 text-slate-300" aria-hidden /></div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
      <Link
        href={actionHref}
        className="inline-flex items-center gap-1 mt-4 text-sm text-slate-600 hover:text-slate-800"
      >
        {actionText} →
      </Link>
    </div>
  );
}

export { ResearchListClient };
