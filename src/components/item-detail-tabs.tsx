"use client";

import { useState } from "react";
import { CategoryBadge, HighlightedParagraph } from "@/components/highlighted-content";
import { ImportanceBadge } from "@/components/importance-badge";
import { ExpandableList, ExpandableText } from "@/components/expandable-text";
import { RecaptureButton } from "@/components/recapture-button";
import { QuickActionBar } from "@/components/quick-action-bar";
import { RelatedItems } from "@/components/related-items";
import type { RelatedItemsData } from "@/components/related-items";
import { getCategoryStyle } from "@/lib/monitor/content-meta";
import { usePrefs } from "@/contexts/prefs-context";
import { pickLens } from "@/lib/localized-fields";
import { isGenericKeyword } from "@/lib/monitor/generic-keywords";
import { ChevronDown } from "lucide-react";
import { useT, type TranslationKey } from "@/lib/i18n";
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
  const t = useT(usePrefs().language);
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
          <h2 className="text-xl font-semibold text-slate-900">{t("detail.research.title")}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("detail.research.desc")}
          </p>
        </div>
        {hasAny && !isEditingNote && (
          <span className="rounded-full bg-[var(--brand-tint)] px-3 py-1 text-xs text-[var(--brand)]">
            {t("detail.research.saved")}
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
              {followUpStatus !== "none" ? FOLLOW_UP_STATUS_LABELS[followUpStatus] : t("detail.research.set-status")}
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
            <span>{tags.length > 0 ? t("detail.research.tags", { n: tags.length }) : t("detail.research.add-tag")}</span>
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
                    placeholder={t("detail.research.tag-ph")}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-violet-400 focus:outline-none"
                  />
                </div>
                {availableTags.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <div className="px-3 pb-1 text-[11px] text-slate-400">{t("detail.research.suggested")}</div>
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
            <span>{note ? t("detail.research.edit-note") : t("detail.research.add-note")}</span>
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
                  title={t("detail.research.remove-tag")}
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
          <div className="mb-1 text-xs text-slate-500">{t("detail.research.note")}</div>
          <p className="whitespace-pre-wrap">{note}</p>
        </div>
      )}

      {/* 备注编辑器 */}
      {isEditingNote && (
        <div className="mt-4 space-y-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={t("detail.research.note-ph")}
            className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNote(false)}
              className="inline-flex h-8 items-center rounded-lg px-3 text-sm text-slate-600 hover:bg-white"
            >
              {t("detail.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-3 text-sm text-white hover:bg-teal-700"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500">
        {t("detail.research.local")}
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
  isMock,
}: ItemDetailTabsProps) {
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [showCategoryLegend, setShowCategoryLegend] = useState(false);
  // lens 有中英两份，按界面语言取；缺一种时回退另一种（见 pickLens）
  const { language } = usePrefs();
  const t = useT(language);
  const lens = pickLens(item, language);
  const qualityBadge = contentQualityMeta(item.contentQuality);
  const dateLocale = language === "en" ? "en-US" : "zh-CN";

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

  // 通用词（模型/发布/release…）不高亮，与伴侣版 keywordStrings 同一口径
  const matchesByKeyword = item.matchedKeywords
    .filter((m) => !isGenericKeyword(m.keyword))
    .map((m) => ({ keyword: m.keyword, category: m.category }));
  const hasHighlights = matchesByKeyword.length > 0;

  return (
    <>
      {/* 徽章区：内容质量 + 重要性 */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 ${qualityBadge.color}`}>
          {t(qualityBadge.key)}
        </span>
        <ImportanceBadge
          level={item.importanceLevel}
          keywordScore={item.keywordScore}
          className="px-3 py-1"
        />
        {/* attachments 里混有普通链接（非文档非图片），只按真正的文档与图片计数，否则会出现「20 个附件（0 文档 / 0 图片）」 */}
        {docs.length + images.length > 0 ? (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
            {t("detail.attachments", { n: docs.length + images.length, docs: docs.length, images: images.length })}
          </span>
        ) : null}
      </div>

      {/* 标题 */}
      <h1 className="mt-4 text-2xl font-semibold tracking-tight lg:text-3xl">
        <ExpandableText text={item.title} maxLength={120} />
      </h1>
      {/* 网页标题多半只是正文标题 + 站名（如「… – 量子位」），包含正文标题时不再重复显示 */}
      {item.pageTitle && !item.pageTitle.includes(item.title.trim()) ? (
        <div className="mt-1 text-sm text-slate-500">
          {t("detail.page-title")}<ExpandableText text={item.pageTitle} maxLength={120} />
        </div>
      ) : null}

      {/* 元信息 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{t("detail.meta.source")}{item.departmentName}</span>
        <span className="text-slate-300">·</span>
        <span>{t("detail.meta.channel")}{item.channelName}</span>
        <span className="text-slate-300">·</span>
        <span>{t("detail.meta.published")}{item.listPublishedAt}</span>
        {/* 生效 / 有效期至是政策台的概念，资讯里抽到的日期多是误认，这里只保留对创作者有用的截止日期 */}
        {item.deadlineDate ? (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-rose-700">{t("detail.meta.deadline")}{item.deadlineDate}</span>
          </>
        ) : null}
        <span className="text-slate-300">·</span>
        <span>{t("detail.meta.first-seen")}{item.firstSeenAt ? new Date(item.firstSeenAt).toLocaleString(dateLocale, { timeZone: "Asia/Shanghai" }) : "-"}</span>
        {item.capturedAt ? (
          <>
            <span className="text-slate-300">·</span>
            <span>{t("detail.meta.captured")}{new Date(item.capturedAt).toLocaleString(dateLocale, { timeZone: "Asia/Shanghai" })}</span>
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

      {/* 原网址 + 重新抓取（返回走页面顶部面包屑，不再重复） */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={item.finalUrl || item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {t("detail.open-original")}
        </a>
        <RecaptureButton sourceId={item.sourceId} url={item.url} isMock={isMock} />
      </div>

      <div className="mt-6 space-y-6">
        {/* 创作者视角 · 护城河：这条对独立创作者意味着什么（从列表卡提升为详情头部主角） */}
        {lens ? (
          <section className="border-y border-slate-200 py-6" aria-label={t("detail.lens.label")}>
            <p className="font-serif text-xl leading-snug text-[var(--brand)] sm:text-2xl">{lens}</p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              <span className="font-medium text-slate-700">{t("detail.lens.label")}</span>
              {" · "}
              {t("detail.lens.note")}
            </p>
          </section>
        ) : null}

        {item.paragraphs.length > 0 ? (
          <section id="full-content" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{t("detail.body")}</h2>
                <span className="text-xs text-slate-500">{t("detail.paras", { n: item.paragraphs.length })}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsBodyExpanded(!isBodyExpanded)}
                aria-expanded={isBodyExpanded}
                aria-controls="policy-body-content"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                {isBodyExpanded ? t("detail.collapse") : t("detail.expand")}
                <ChevronDown className={`h-3.5 w-3.5 transition ${isBodyExpanded ? "rotate-180" : ""}`} aria-hidden />
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
                    <div className="text-xs opacity-80">{t("detail.capture-note")}</div>
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
                    {t("detail.more-paras", { n: item.paragraphs.length - 1 })}
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
                    <div className="text-xs opacity-80">{t("detail.capture-note")}</div>
                    <div className="mt-1">{item.captureNote}</div>
                  </div>
                ) : null}
                {hasHighlights ? (
                  <div className="mt-2 text-xs text-slate-500">
                    {t("detail.highlighted")}
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
                        itemType={t("detail.item.doc")}
                        maxLength={120}
                      />
                    ) : null}
                    {images.length > 0 ? (
                      <ExpandableList
                        items={images.map((d) => ({ text: d.name || d.text || d.url || "", url: d.url || "" }))}
                        itemType={t("detail.item.image")}
                        maxLength={120}
                      />
                    ) : null}
                    {externalLinks.length > 0 ? (
                      <ExpandableList
                        items={externalLinks.map((l) => ({ text: l.title || l.text || l.url, url: l.url }))}
                        itemType={t("detail.item.link")}
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
              <h2 className="text-base font-semibold text-slate-900">{t("detail.body")}</h2>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">
                {t("detail.no-text")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {item.captureNote
                ? item.captureNote
                : t("detail.no-text-desc")}
            </p>
            <p className="mt-2 text-xs leading-6 text-amber-700">
              {t("detail.no-text-warn")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={item.finalUrl || item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                {t("detail.read-original")}
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
                <h2 className="text-sm font-semibold text-slate-900">{t("detail.topics")}</h2>
                <p className="mt-1 text-xs text-slate-500">{t("detail.topics-desc")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryLegend(!showCategoryLegend)}
                className="text-xs text-slate-500 hover:text-slate-700 transition"
              >
                {showCategoryLegend ? t("detail.legend-hide") : t("detail.legend-show")}
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
          {t("detail.method")}{" "}
          <a href="/method" className="text-slate-500 underline underline-offset-2 hover:text-slate-700">
            {t("detail.method-link")}
          </a>
          。
        </div>
      </div>
    </>
  );
}

// 数据库 content_quality 实际取值：high / medium / low / minimal / empty / null
// （原 switch 判断的是 full / partial，从未命中，导致 728 条完整正文被标成「内容未抓取」）
function contentQualityMeta(q: string | null | undefined): { key: TranslationKey; color: string } {
  switch (q) {
    case "high":
    case "full":
      return { key: "detail.quality.full", color: "border-slate-200 bg-white text-slate-600" };
    case "medium":
    case "low":
    case "minimal":
    case "partial":
      return { key: "detail.quality.partial", color: "border-amber-200 bg-amber-50 text-amber-800" };
    case "empty":
      return { key: "detail.quality.empty", color: "border-rose-200 bg-rose-50 text-rose-700" };
    default:
      return { key: "detail.quality.none", color: "border-slate-200 bg-slate-100 text-slate-600" };
  }
}
