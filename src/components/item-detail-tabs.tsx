"use client";

import { useState } from "react";
import { CategoryBadge, HighlightedParagraph } from "@/components/highlighted-content";
import { ImportanceBadge } from "@/components/importance-badge";
import { ExpandableList, ExpandableText } from "@/components/expandable-text";
import { RecaptureButton } from "@/components/recapture-button";
import { BackButton } from "@/components/back-button";
import { QuickActionBar } from "@/components/quick-action-bar";
import { RelatedItems } from "@/components/related-items";
import type { RelatedItemsData } from "@/components/related-items";
import { getCategoryStyle } from "@/lib/monitor/content-meta";
import { usePrefs } from "@/contexts/prefs-context";
import { pickLens } from "@/lib/localized-fields";
import {
  type FollowUpStatus,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_STATUS_OPTIONS,
  setNote as setNoteStorage,
  setFollowUpStatus as setFollowUpStatusStorage,
  getPersonalResearch,
  addTagToItem,
  removeTagFromItem,
  getAllTags,
  getTagColor,
  type ResearchTag,
} from "@/lib/personal-research";

type CategoryType = {
  category: string;
  score: number;
  topKeywords?: string[];
};

type MatchedKeywordType = {
  keyword: string;
  category: string;
  weight?: number;
};

type SignalMetaType = {
  thresholds?: { core: number; highlight: number; mid: number };
  thresholdDiscount?: number;
  totalSignalStrength?: number;
  totalStructureScore?: number;
  distinctStrongTopicKeywords?: number;
  bodyParagraphCount?: number;
  strongTopicCategories?: string[];
  hasTitleStructure?: boolean;
  riskHit?: boolean;
  hasStrongTopic?: boolean;
  totalScore?: number;
  level?: string;
};

type ForecastSourceType = {
  url: string;
  title: string;
  note?: string;
};

type RelatedItem = {
  sourceId: string;
  url: string;
  title: string;
  departmentName: string;
  listPublishedAt: string;
};

type ItemDetailTabsProps = {
  relatedPoliciesData: RelatedItemsData;
  item: {
    sourceId: string;
    url: string;
    finalUrl?: string | null;
    title: string;
    pageTitle?: string | null;
    displayName: string;
    departmentName: string;
    channelName: string;
    listPublishedAt: string | null;
    firstSeenAt: string | null;
    capturedAt?: string | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    deadlineDate?: string | null;
    extractedDates?: { type: string; date: string; raw?: string }[];
    contentQuality: string | null;
    importanceLevel: string;
    keywordScore: number;
    creatorLens?: string | null;
    creatorLensEn?: string | null;
    isStarred: boolean;
    isRead: boolean;
    categories: CategoryType[];
    matchedKeywords: MatchedKeywordType[];
    paragraphs: string[];
    attachments: Array<{ kind: string; url?: string; name?: string; text?: string; title?: string }>;
    externalLinks?: Array<{ url: string; title?: string; text?: string }> | null;
    signalMeta?: SignalMetaType | null;
    signalHitsRaw?: Record<string, unknown> | null;
    forecastSources?: ForecastSourceType[] | null;
    documentStatus?: string | null;
    hasFunding?: boolean;
    hasProcurement?: boolean;
    hasPilot?: boolean;
    hasStandards?: boolean;
    forecastHigh?: string | null;
    forecastMidHigh?: string | null;
    forecastMid?: string | null;
    forecastLow?: string | null;
    forecastNotes?: string | null;
    forecastUpdatedAt?: string | null;
    captureNote?: string | null;
  };
  docs: Array<{ kind: string; url?: string; name?: string; text?: string; title?: string }>;
  images: Array<{ kind: string; url?: string; name?: string; text?: string; title?: string }>;
  externalLinks: Array<{ url: string; title?: string; text?: string }>;
  contentQualityBadge: { label: string; color: string };
  related: RelatedItem[];
  isMock?: boolean;
};

function pickTopN(texts: string[], n: number): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const clean = t.replace(/\s+/g, " ").trim();
    if (clean.length >= 12 && !out.includes(clean)) out.push(clean);
    if (out.length >= n) break;
  }
  return out;
}

function extractSentences(paragraphs: string[]): string[] {
  const joined = paragraphs.join(" ");
  const raw = joined.split(/(?<=[。！？.!?])\s*/).map((s) => s.trim());
  return raw.filter((s) => s.length >= 8 && s.length <= 140);
}

function summaryFrom(paragraphs: string[], title: string): string {
  if (paragraphs.length === 0) return title;
  const sentences = extractSentences(paragraphs);
  if (sentences.length === 0) {
    const first = paragraphs[0].replace(/\s+/g, " ").trim();
    return first.length > 120 ? first.slice(0, 120) + "…" : first;
  }
  return sentences.slice(0, 3).join(" ");
}

function PersonalResearchCard({
  sourceId,
  url,
  title,
}: {
  sourceId: string;
  url: string;
  title: string;
}) {
  const [note, setNote] = useState(() => {
    const research = getPersonalResearch(sourceId, url);
    return research?.note ?? "";
  });
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>(() => {
    const research = getPersonalResearch(sourceId, url);
    return research?.followUpStatus ?? "none";
  });
  const [tags, setTags] = useState<string[]>(() => {
    const research = getPersonalResearch(sourceId, url);
    return research?.tags ?? [];
  });
  const [allTags, setAllTags] = useState<ResearchTag[]>(getAllTags);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [newTagName, setNewTagName] = useState("");

  function handleStatusSelect(status: FollowUpStatus) {
    setFollowUpStatusStorage(sourceId, url, title, status);
    setFollowUpStatus(status);
    setShowStatusMenu(false);
  }

  function handleStartEdit() {
    setNoteDraft(note);
    setIsEditingNote(true);
  }

  function handleSaveNote() {
    setNoteStorage(sourceId, url, title, noteDraft);
    setNote(noteDraft);
    setIsEditingNote(false);
  }

  function handleAddTag(tagName: string) {
    const result = addTagToItem(sourceId, url, title, tagName);
    if (result) {
      setTags(result.tags);
      setAllTags(getAllTags());
    }
    setShowTagPicker(false);
    setNewTagName("");
  }

  function handleRemoveTag(tagName: string) {
    const result = removeTagFromItem(sourceId, url, tagName);
    if (result) {
      setTags(result.tags);
    }
  }

  const hasAny = note || followUpStatus !== "none" || tags.length > 0;
  const availableTags = allTags.filter((t) => !tags.includes(t.name));

  return (
    <section className="rounded-3xl rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">我的研究</h2>
          <p className="mt-1 text-sm text-slate-600">
            记录你的备注、跟进状态和标签，让每条动态不只是{"\"看过\""}。
          </p>
        </div>
        {hasAny && !isEditingNote && (
          <span className="rounded-full bg-[var(--brand-tint)] px-3 py-1 text-xs text-[var(--brand)]">
            已记录
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {/* 跟进状态 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowStatusMenu(!showStatusMenu);
              setShowTagPicker(false);
            }}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
              followUpStatus !== "none"
                ? "bg-white text-teal-700 ring-1 ring-teal-200"
                : "bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-white"
            }`}
          >
            <span>
              {followUpStatus !== "none" ? FOLLOW_UP_STATUS_LABELS[followUpStatus] : "设置跟进状态"}
            </span>
            <span className="text-[10px]">▾</span>
          </button>

          {showStatusMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowStatusMenu(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
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
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 标签按钮 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTagPicker(!showTagPicker);
              setShowStatusMenu(false);
            }}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
              tags.length > 0
                ? "bg-white text-violet-700 ring-1 ring-violet-200"
                : "bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-white"
            }`}
          >
            <span>{tags.length > 0 ? `${tags.length} 个标签` : "添加标签"}</span>
            <span className="text-[10px]">▾</span>
          </button>

          {showTagPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowTagPicker(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                <div className="px-3 pb-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTagName.trim()) {
                        handleAddTag(newTagName);
                      }
                    }}
                    placeholder="输入标签名，回车创建"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-violet-400 focus:outline-none"
                  />
                </div>
                {availableTags.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <div className="px-3 pb-1 text-[11px] text-slate-400">推荐标签</div>
                    <div className="max-h-40 overflow-y-auto px-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag.name}
                          type="button"
                          onClick={() => handleAddTag(tag.name)}
                          className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-slate-50"
                        >
                          <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${tag.color} border`}>
                            +
                          </span>
                          <span className="text-slate-700">{tag.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 备注按钮 */}
        {!isEditingNote && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-white"
          >
            <span>{note ? "编辑备注" : "添加备注"}</span>
          </button>
        )}
      </div>

      {/* 标签展示 */}
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const color = getTagColor(tag);
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${color} border`}
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 text-xs opacity-60 hover:opacity-100"
                  title="移除标签"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* 备注内容展示 */}
      {note && !isEditingNote && (
        <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
          <div className="mb-1 text-xs text-slate-500">个人备注</div>
          <p className="whitespace-pre-wrap">{note}</p>
        </div>
      )}

      {/* 备注编辑器 */}
      {isEditingNote && (
        <div className="mt-4 space-y-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="记录你的想法、重点、行动事项..."
            className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNote(false)}
              className="inline-flex h-8 items-center rounded-lg px-3 text-sm text-slate-600 hover:bg-white"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-3 text-sm text-white hover:bg-teal-700"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500">
        数据仅保存在当前浏览器，清除缓存会丢失。后续支持云端同步。
      </div>
    </section>
  );
}

export function ItemDetailTabs({
  relatedPoliciesData,
  item,
  docs,
  images,
  externalLinks,
  contentQualityBadge,
  isMock,
}: ItemDetailTabsProps) {
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [showCategoryLegend, setShowCategoryLegend] = useState(false);
  // lens 有中英两份，按界面语言取；缺一种时回退另一种（见 pickLens）
  const { language } = usePrefs();
  const lens = pickLens(item, language);

  function handleCompareToggle() {
    try {
      const key = "compare_items";
      const raw = window.localStorage.getItem(key);
      let items: Array<{ sourceId: string; url: string; title: string }> = [];
      if (raw) {
        try {
          items = JSON.parse(raw);
        } catch {
          items = [];
        }
      }
      const exists = items.some((i) => i.sourceId === item.sourceId && i.url === item.url);
      if (exists) {
        items = items.filter((i) => !(i.sourceId === item.sourceId && i.url === item.url));
      } else {
        items.push({ sourceId: item.sourceId, url: item.url, title: item.title });
      }
      window.localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // localStorage 不可用时忽略
    }
  }

  function isInCompare(): boolean {
    try {
      const raw = window.localStorage.getItem("compare_items");
      if (!raw) return false;
      const items = JSON.parse(raw) as Array<{ sourceId: string; url: string }>;
      return items.some((i) => i.sourceId === item.sourceId && i.url === item.url);
    } catch {
      return false;
    }
  }

  const matchesByKeyword = item.matchedKeywords.map((m) => ({ keyword: m.keyword, category: m.category }));
  const hasHighlights = matchesByKeyword.length > 0;

  return (
    <>
      {/* 徽章区：内容质量 + 重要性 + 关键词得分 */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 ${contentQualityBadge.color}`}>
          {contentQualityBadge.label}
        </span>
        <ImportanceBadge
          level={item.importanceLevel}
          keywordScore={item.keywordScore}
          className="px-3 py-1"
        />
        {item.attachments.length > 0 ? (
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
            附件 {item.attachments.length}（文档 {docs.length} / 图片 {images.length}）
          </span>
        ) : null}
      </div>

      {/* 标题 */}
      <h1 className="mt-4 text-2xl font-semibold tracking-tight lg:text-3xl">
        <ExpandableText text={item.title} maxLength={120} />
      </h1>
      {item.pageTitle && item.pageTitle !== item.title ? (
        <div className="mt-1 text-sm text-slate-500">
          页面标题：<ExpandableText text={item.pageTitle} maxLength={120} />
        </div>
      ) : null}

      {/* 元信息 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>来源：{item.departmentName}</span>
        <span className="text-slate-300">·</span>
        <span>渠道：{item.channelName}</span>
        <span className="text-slate-300">·</span>
        <span>列表日期：{item.listPublishedAt}</span>
        {item.effectiveFrom ? (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700">生效：{item.effectiveFrom}</span>
          </>
        ) : null}
        {item.effectiveTo ? (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-amber-700">至：{item.effectiveTo}</span>
          </>
        ) : null}
        {item.deadlineDate ? (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-rose-700">截止：{item.deadlineDate}</span>
          </>
        ) : null}
        {item.extractedDates && item.extractedDates.length > 0 ? (
          <details className="ml-2 inline-block text-xs text-slate-500">
            <summary className="cursor-pointer select-none">· 文中所有日期 ({item.extractedDates.length})</summary>
            <div className="mt-2 space-y-1">
              {item.extractedDates.slice(0, 20).map((d, idx) => {
                const labelMap: Record<string, string> = {
                  published: "发布",
                  effective_from: "生效",
                  effective_to: "有效期至",
                  deadline: "截止",
                };
                return (
                  <div key={idx} className="whitespace-pre-wrap break-words">
                    {labelMap[d.type] || d.type}：{d.date}
                    {d.raw ? `（${d.raw}）` : ""}
                  </div>
                );
              })}
              {item.extractedDates.length > 20 ? (
                <div className="text-slate-400">（共 {item.extractedDates.length} 条，仅显示前 20 条）</div>
              ) : null}
            </div>
          </details>
        ) : null}
        <span className="text-slate-300">·</span>
        <span>首次发现：{item.firstSeenAt ? new Date(item.firstSeenAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "-"}</span>
        {item.capturedAt ? (
          <>
            <span className="text-slate-300">·</span>
            <span>正文抓取于：{new Date(item.capturedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
          </>
        ) : null}
      </div>

      {/* 快速操作栏 */}
      <div className="mt-5">
        <QuickActionBar
          sourceId={item.sourceId}
          url={item.url}
          title={item.title}
          pageTitle={item.pageTitle}
          departmentName={item.departmentName}
          channelName={item.channelName}
          listPublishedAt={item.listPublishedAt}
          paragraphs={item.paragraphs}
          initialStarred={item.isStarred}
          initialRead={item.isRead}
          onCompareClick={handleCompareToggle}
          isInCompare={isInCompare()}
        />
      </div>

      {/* 原网址和返回按钮 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <BackButton />
        <a
          href={item.finalUrl || item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          打开原网址 ↗
        </a>
        <RecaptureButton sourceId={item.sourceId} url={item.url} isMock={isMock} />
      </div>

      <div className="mt-6 space-y-6">
        {/* 创作者视角 · 护城河：这条对独立创作者意味着什么（从列表卡提升为详情头部主角） */}
        {lens ? (
          <section className="rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-tint)]/50 p-5">
            <div className="border-l-2 border-[var(--brand)] pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">创作者视角</h2>
                <span className="text-xs text-slate-500">这条对你意味着什么</span>
              </div>
              <p className="mt-2 text-[15px] leading-7 text-slate-800">{lens}</p>
              <div className="mt-2.5 text-[11px] leading-5 text-slate-400">
                依据你的创作者画像生成 · AI 只点评，判断和取舍仍由你定
              </div>
            </div>
          </section>
        ) : null}

        {item.paragraphs.length > 0 ? (
          <section id="full-content" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">正文</h2>
                <span className="text-xs text-slate-500">共 {item.paragraphs.length} 段</span>
              </div>
              <button
                type="button"
                onClick={() => setIsBodyExpanded(!isBodyExpanded)}
                aria-expanded={isBodyExpanded}
                aria-controls="policy-body-content"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                {isBodyExpanded ? "收起正文" : "展开正文"}
                <span className="text-[10px]">{isBodyExpanded ? "↑" : "↓"}</span>
              </button>
            </div>

            {!isBodyExpanded ? (
              <div className="mt-3">
                {item.captureNote ? (
                  <div
                    className={`mb-3 rounded-2xl border p-3 text-sm leading-6 ${
                      item.contentQuality === "empty"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : item.contentQuality === "partial"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    <div className="text-xs opacity-80">抓取备注</div>
                    <div className="mt-1">{item.captureNote}</div>
                  </div>
                ) : null}
                <p className="text-sm leading-7 text-slate-700">
                  {hasHighlights ? (
                    <HighlightedParagraph
                      text={
                        item.paragraphs[0].length > 160
                          ? item.paragraphs[0].slice(0, 160) + "…"
                          : item.paragraphs[0]
                      }
                      matches={matchesByKeyword}
                    />
                  ) : (
                    item.paragraphs[0].length > 160
                      ? item.paragraphs[0].slice(0, 160) + "…"
                      : item.paragraphs[0]
                  )}
                </p>
                {item.paragraphs.length > 1 && (
                  <div className="mt-2 text-xs text-slate-400">
                    还有 {item.paragraphs.length - 1} 段未展开
                  </div>
                )}
              </div>
            ) : (
              <div id="policy-body-content">
                {item.captureNote ? (
                  <div
                    className={`mt-3 rounded-2xl border p-3 text-sm leading-6 ${
                      item.contentQuality === "empty"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : item.contentQuality === "partial"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    <div className="text-xs opacity-80">抓取备注</div>
                    <div className="mt-1">{item.captureNote}</div>
                  </div>
                ) : null}
                {hasHighlights ? (
                  <div className="mt-2 text-xs text-slate-500">
                    已按标签高亮（监管风险 / 资金支持 / 人工智能 / 数据要素 等）。
                  </div>
                ) : null}
                <div className="mt-3 space-y-4 text-sm leading-7 text-slate-800">
                  {item.paragraphs.map((p, idx) => (
                    <p key={idx}>
                      {hasHighlights ? <HighlightedParagraph text={p} matches={matchesByKeyword} /> : p}
                    </p>
                  ))}
                </div>
                {item.attachments.length > 0 || externalLinks.length > 0 ? (
                  <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                    {docs.length > 0 ? (
                      <ExpandableList
                        items={docs.map((d) => ({ text: d.name || d.text || d.url || "", url: d.url || "" }))}
                        itemType={`文档附件`}
                        maxLength={120}
                      />
                    ) : null}
                    {images.length > 0 ? (
                      <ExpandableList
                        items={images.map((d) => ({ text: d.name || d.text || d.url || "", url: d.url || "" }))}
                        itemType={`图片附件`}
                        maxLength={120}
                      />
                    ) : null}
                    {externalLinks.length > 0 ? (
                      <ExpandableList
                        items={externalLinks.map((l) => ({ text: l.title || l.text || l.url, url: l.url }))}
                        itemType="相关外链"
                        maxLength={120}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        ) : (
          // 优雅降级：正文未能提取时，展示"设计过的"占位卡片而非空白
          <section id="full-content" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">正文</h2>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">
                未能提取全文
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {item.captureNote
                ? item.captureNote
                : "这条内容来自动态渲染或结构特殊的页面，正文未能自动提取。标题与发布信息已收录，完整内容请前往原文查看。"}
            </p>
            <p className="mt-2 text-xs leading-6 text-amber-700">
              ⚠ 此类动态站点（如演出行业协会等）的原文链接可能已失效或需多次跳转，打开后若为 404 属来源侧变动，非本站数据错误。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={item.finalUrl || item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                阅读原文 ↗
              </a>
              <RecaptureButton sourceId={item.sourceId} url={item.url} isMock={isMock} />
            </div>
          </section>
        )}

        <PersonalResearchCard
          sourceId={item.sourceId}
          url={item.url}
          title={item.title}
        />

        {item.categories.length > 0 ? (
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">涉及领域</h2>
                <p className="mt-1 text-xs text-slate-500">这条内容覆盖的领域和信号标签</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryLegend(!showCategoryLegend)}
                className="text-xs text-slate-500 hover:text-slate-700 transition"
              >
                {showCategoryLegend ? "收起图例" : "查看图例"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.categories.map((cat, index) => (
                <CategoryBadge key={cat.category ?? `category-${index}`} category={cat.category} score={cat.score} topKeywords={cat.topKeywords} />
              ))}
            </div>
            {showCategoryLegend && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {item.categories.map((cat, index) => {
                    const style = getCategoryStyle(cat.category);
                    return (
                      <div key={cat.category ?? `legend-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center gap-2">
                          
                          <span className={`font-medium text-sm ${style.chip.split("text-")[1]?.split(" ")[0] || "text-slate-700"}`}>
                            {style.displayLabel}
                          </span>
                        </div>
                        {style.description && (
                          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{style.description}</p>
                        )}
                        {style.value && (
                          <p className="mt-1.5 rounded-lg bg-white/60 p-2 text-[11px] text-slate-500">
                            {style.value}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : null}

        <RelatedItems data={relatedPoliciesData} />

        <div className="pt-2 text-xs text-slate-400">
          这条的分级与信号如何判定？参见{" "}
          <a href="/method" className="text-slate-500 underline underline-offset-2 hover:text-slate-700">
            方法说明
          </a>
          。
        </div>
      </div>
    </>
  );
}
