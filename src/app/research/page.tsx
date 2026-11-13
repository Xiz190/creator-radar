import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { ResearchListClient } from "@/components/research-list-client";
import { LangText } from "@/components/lang-text";
import {
  ensureMonitorSchema,
  getInboxItemsByFilter,
  getSubscriptionsByUser,
} from "@/lib/monitor/db";
import { isDbAvailable } from "@/lib/db";
import { generateMockItems } from "@/lib/monitor/mock";

export const dynamic = "force-dynamic";

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

async function getStarredItems(): Promise<StarredItem[]> {
  if (!isDbAvailable()) {
    const mockItems = generateMockItems(10);
    return mockItems
      .filter((m, i) => i < 3)
      .map((m) => ({
        sourceId: m.sourceId,
        departmentName: m.departmentName,
        channelName: m.channelName,
        title: m.title,
        url: m.url,
        listPublishedAt: m.listPublishedAt,
        firstSeenAt: m.firstSeenAt,
        importanceLevel: m.importanceLevel,
        keywordScore: m.keywordScore,
        categories: m.categories || [],
        isStarred: true,
        isRead: m.isRead,
      }));
  }

  const result = await getInboxItemsByFilter({
    onlyStarred: true,
    sort: "first_seen_at",
    limit: 50,
    offset: 0,
  });

  return (result.items as StarredItem[]) || [];
}

async function getSubscriptions(): Promise<SubscriptionItem[]> {
  if (!isDbAvailable()) {
    return [
      { id: "mock-1", type: "department", target: "Suno", targetName: "Suno", enabled: true, createdAt: "2025-01-15T00:00:00Z", updatedAt: "2025-01-15T00:00:00Z" },
      { id: "mock-2", type: "keyword", target: "人工智能", targetName: null, enabled: true, createdAt: "2025-01-20T00:00:00Z", updatedAt: "2025-01-20T00:00:00Z" },
      { id: "mock-3", type: "keyword", target: "数据要素", targetName: null, enabled: false, createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-10T00:00:00Z" },
    ];
  }

  const rows = await getSubscriptionsByUser("default");
  return rows as SubscriptionItem[];
}

export default async function ResearchPage() {
  await ensureMonitorSchema();
  const dbAvailable = isDbAvailable();

  const starredItemsPromise = getStarredItems();
  const subscriptionsPromise = getSubscriptions();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      {!dbAvailable && (
        <div className="border-b border-sky-200 bg-sky-50 px-6 py-3 text-sm text-sky-800">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
            <span className="font-medium"><LangText zh="演示模式" en="Demo mode" /></span>
            <span><LangText zh="当前是示例数据，功能都可以试。" en="Showing sample data. Every feature still works." /></span>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <BackButton />
        </div>
        {/* 页头 */}
        <section className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <LangText zh="我的研究" en="My research" />
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            <LangText zh="收藏、待跟进和备注都在这里。" en="Your starred items, follow-ups and notes." />
          </p>
        </section>

        {/* 列表区 */}
        <ResearchListClient
          starredItemsPromise={starredItemsPromise}
          subscriptionsPromise={subscriptionsPromise}
        />

        {/* 底部说明 */}
        <footer className="mt-12 border-t border-slate-200 pt-6 pb-4 text-center text-xs text-slate-400">
          <LangText zh="这些数据只保存在当前浏览器里。" en="This data is saved in this browser only." />
        </footer>
      </div>
    </main>
  );
}
