import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ItemBreadcrumb } from "@/components/item-breadcrumb";
import { ItemDetailTabs } from "@/components/item-detail-tabs";
import {
  ensureMonitorSchema,
  getItemDetailBySourceAndUrl,
  getItemDetailBySourceId,
  getSameTopicItems,
  getLatestItemsByDepartment,
} from "@/lib/monitor/db";
import { generateMockItems, MOCK_ARTICLES } from "@/lib/monitor/mock";
import { filterTopicCategories } from "@/lib/monitor/content-meta";
import type { RelatedItemsData } from "@/components/related-items";
import { createLogger } from "@/lib/logger";
import { isDbAvailable } from "@/lib/db";

const logger = createLogger("items/[itemId]/page");

export const dynamic = "force-dynamic";

type ItemPageProps = {
  params: Promise<{ itemId?: string }>;
  searchParams: Promise<{ sourceId?: string; url?: string }>;
};

function buildMockDetail(sourceId: string, url: string) {
  const mockItems = generateMockItems(20);
  const baseItem = mockItems.find((m) => m.sourceId === sourceId || m.url === url) ?? mockItems[0];
  const idx = mockItems.indexOf(baseItem);
  const article = MOCK_ARTICLES[idx] ?? MOCK_ARTICLES[0];
  const now = new Date().toISOString();

  return {
    sourceId: baseItem.sourceId,
    url: article.url,
    finalUrl: article.url,
    title: baseItem.title,
    pageTitle: baseItem.title,
    displayName: baseItem.displayName,
    departmentName: baseItem.departmentName,
    channelName: baseItem.channelName,
    listPublishedAt: baseItem.listPublishedAt,
    firstSeenAt: baseItem.firstSeenAt,
    capturedAt: now,
    effectiveFrom: null,
    effectiveTo: null,
    deadlineDate: null,
    extractedDates: [],
    contentQuality: "full",
    importanceLevel: baseItem.importanceLevel,
    keywordScore: baseItem.keywordScore,
    creatorLens: "上手做草稿够快，人声你自己录、自己混，先拿它把编曲 demo 铺出来。",
    isStarred: baseItem.isStarred,
    isRead: baseItem.isRead,
    summary: article.summary,
    policyChain: [] as unknown[],
    industryImpact: [] as unknown[],
    preSignals: [] as unknown[],
    categories: baseItem.categories,
    matchedKeywords: baseItem.categories.flatMap((c) =>
      (c.topKeywords ?? []).slice(0, 2).map((kw) => ({
        keyword: kw,
        weight: Math.round(c.score * 0.15),
        category: c.category,
      }))
    ),
    paragraphs: article.paragraphs,
    attachments: [] as { kind: string; url: string; name: string; text: string; title: string }[],
    externalLinks: [] as { url: string; title: string; text: string }[],
    signalMeta: {
      totalSignalStrength: baseItem.keywordScore,
      totalStructureScore: Math.round(baseItem.keywordScore * 0.6),
      distinctStrongTopicKeywords: baseItem.categories.length,
      bodyParagraphCount: article.paragraphs.length,
      strongTopicCategories: baseItem.categories.slice(0, 2).map((c) => c.category),
      hasTitleStructure: false,
      riskHit: false,
    },
    signalHitsRaw: {},
    forecastSources: null,
    documentStatus: "正式发布",
    hasFunding: baseItem.hasFunding,
    hasProcurement: baseItem.hasProcurement,
    hasPilot: baseItem.hasPilot,
    hasStandards: baseItem.hasStandards,
    forecastHigh: null,
    forecastMidHigh: null,
    forecastMid: null,
    forecastLow: null,
    forecastNotes: null,
    forecastUpdatedAt: null,
    captureNote: null,
  };
}

function buildMockRelated(departmentName: string, count: number = 6) {
  const mockItems = generateMockItems(count + 4);
  return mockItems.slice(0, count).map((m) => ({
    sourceId: m.sourceId,
    url: m.url,
    title: m.title,
    departmentName: m.departmentName,
    listPublishedAt: m.listPublishedAt,
    keywordScore: m.keywordScore,
    importanceLevel: m.importanceLevel,
  }));
}

export default async function ItemPage({ params, searchParams }: ItemPageProps) {
  const p = await params;
  const sp = await searchParams;
  const itemId = p.itemId ?? "";
  const sourceId = sp.sourceId ?? itemId;
  const url = sp.url ?? "";

  if (!itemId) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm">
            <div className="text-lg font-semibold">路由异常</div>
            <p className="mt-2 text-slate-600">请通过动态资讯点击具体条目访问此页面。</p>
            <Link
              href="/inbox"
              scroll={false}
              className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
            >
              返回动态资讯
            </Link>
          </div>
        </div>
      </main>
    );
  }

  try {
    await ensureMonitorSchema();
  } catch {
    // DB unavailable — fall through to mock data below
  }

  let dbItem: Awaited<ReturnType<typeof getItemDetailBySourceAndUrl>> = null;
  try {
    if (sourceId && url) {
      dbItem = await getItemDetailBySourceAndUrl(sourceId, url);
    }
    if (!dbItem) {
      dbItem = await getItemDetailBySourceId(itemId);
    }
  } catch {
    // DB unavailable — fall through to mock data below
  }

  const dbOk = isDbAvailable();

  if (dbOk && !dbItem) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm">
            <div className="text-lg font-semibold">条目不存在</div>
            <p className="mt-2 text-slate-600">该动态条目可能已被移除或失效，请返回动态资讯查看最新内容。</p>
            <Link
              href="/inbox"
              scroll={false}
              className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
            >
              返回动态资讯
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const mockSourceId = sourceId || itemId;
  const item = dbItem ?? buildMockDetail(mockSourceId, url || "mock-url");

  const related = dbItem ? [] : buildMockRelated(item.departmentName);

  let sameTopicItems: Array<{
    sourceId: string;
    url: string;
    title: string;
    departmentName: string;
    listPublishedAt: string;
    keywordScore: number;
    importanceLevel: string;
  }> = [];
  let sameDeptItems: Array<{
    sourceId: string;
    url: string;
    title: string;
    departmentName: string;
    listPublishedAt: string;
    keywordScore: number;
    importanceLevel: string;
  }> = [];
  let citedItems: Array<{
    url: string;
    title: string;
    text?: string;
  }> = [];

  if (dbItem) {
    try {
      const topicCategories = filterTopicCategories(dbItem.categories)
        .map((c) => c.category);
      [sameTopicItems, sameDeptItems] = await Promise.all([
        getSameTopicItems({
          sourceId: dbItem.sourceId,
          url: dbItem.url,
          categories: topicCategories,
          limit: 6,
        }),
        getLatestItemsByDepartment(dbItem.departmentName, dbItem.url, 6),
      ]);
    } catch {
      // DB unavailable — related items remain empty
    }
    citedItems = (dbItem.externalLinks ?? []).map((l) => ({
      url: l.url,
      title: l.text ?? "相关链接",
      text: l.text,
    }));
  } else {
    const mockItems = buildMockRelated(item.departmentName, 10);
    sameTopicItems = mockItems.slice(0, 4);
    sameDeptItems = mockItems.slice(3, 7);
    citedItems = (item.externalLinks ?? []).map((l) => ({
      url: l.url,
      title: (l as { title?: string }).title ?? l.text ?? "相关链接",
      text: l.text,
    }));
  }

  const docs = item.attachments.filter((a) => a.kind === "document");
  const images = item.attachments.filter((a) => a.kind === "image");
  const externalLinks = item.externalLinks ?? [];


  const relatedPoliciesData: RelatedItemsData = {
    sameTopic: sameTopicItems.map((it) => ({
      ...it,
      relationType: "sameTopic" as const,
    })),
    sameDept: sameDeptItems.map((it) => ({
      ...it,
      relationType: "sameDept" as const,
    })),
    cited: citedItems.map((cit, i) => ({
      sourceId: `cited_${i}`,
      url: cit.url,
      title: cit.title,
      departmentName: item.departmentName,
      listPublishedAt: item.listPublishedAt ?? "",
      keywordScore: 0,
      importanceLevel: "普通内容",
      relationType: "cited" as const,
    })),
  };
  
  logger.debug("生成相关政策数据", {
    sameTopicCount: relatedPoliciesData.sameTopic.length,
    sameDeptCount: relatedPoliciesData.sameDept.length,
    citedCount: relatedPoliciesData.cited.length,
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-4xl gap-6 px-6 py-8 lg:py-10">
        <ItemBreadcrumb departmentName={item.departmentName} channelName={item.channelName} title={item.title} />

        <article className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-10 shadow-sm">
          <ItemDetailTabs
            item={item}
            docs={docs}
            images={images}
            externalLinks={externalLinks}
            related={related}
            relatedPoliciesData={relatedPoliciesData}
            isMock={!dbItem}
          />
        </article>
      </div>
    </main>
  );
}
