import crypto from "node:crypto";
import { getPgPool } from "@/lib/db";
import type {
  MonitorListItem,
  MonitorRunRecord,
  MonitorSourceConfig,
  MonitorSourceRunResult,
} from "@/lib/monitor/types";
import { captureDetailPage } from "@/lib/monitor/detail";
import { fetchRssFeed } from "@/lib/monitor/rss-fetcher";
import { fetchHtmlBlog } from "@/lib/monitor/html-blog-fetcher";
import { fetchCapaLatest } from "@/lib/monitor/capa-list";
import { fetchCcdyColumnLatest } from "@/lib/monitor/ccdy-list";
import { fetchSunoBlog } from "@/lib/monitor/suno-list";
import { fetchHtmlCards } from "@/lib/monitor/html-cards-fetcher";
import { fetchRunwaySitemap } from "@/lib/monitor/runway-list";
import { fetchCnafLatest } from "@/lib/monitor/cnaf-list";
import { fetchKreaBlog } from "@/lib/monitor/krea-list";
import { fetchLumaNews } from "@/lib/monitor/luma-list";
import { backfillLensAfterRun } from "@/lib/monitor/backfill-lens";
import {
  ensureMonitorSchema,
  findExistingUrls,
  getAutoMonitorSources,
  getLatestRun,
  getMonitorSources,
  insertNewItems,
  insertRunStarted,
  normalizeItemUrl,
  scanAndApplyKeywords,
  updateItemStructuredDates,
  updateRunFinished,
  upsertItemDetail,
} from "@/lib/monitor/db";

function nowIso() {
  return new Date().toISOString();
}

function newRunId() {
  return crypto.randomUUID();
}

// 各数据源的列表抓取器注册表。
// 新增来源时：写一个 fetcher 文件，在此 switch 里注册对应 type。
function resolveListItems(source: MonitorSourceConfig, limit: number): Promise<MonitorListItem[]> {
  const t = String(source.type || "").trim().toLowerCase();
  switch (t) {
    // RSS / Atom feed
    case "rss_feed":
    case "rss":
      return fetchRssFeed(source.listUrl, limit);
    // 无 RSS 的 HTML 列表页
    case "html_blog":
    case "html_list":
      return fetchHtmlBlog(source.listUrl, limit);
    // 中国演出行业协会（CAPA）公开 JSON API
    // listUrl 存栏目 dictId（如 1552487425756987393 通知公告 / 17 音乐人才扶持）
    case "capa":
      return fetchCapaLatest(source.listUrl, limit);
    // 中国文化传媒网（ccdy）公开 JSON API
    // listUrl 存栏目 id（如 col1717747504046 时政要闻）
    case "ccdy":
      return fetchCcdyColumnLatest(source.listUrl, limit);
    // Suno 官方博客（AI 音乐工具更新）— 服务端渲染 HTML，listUrl = https://suno.com/blog
    case "suno":
      return fetchSunoBlog(source.listUrl, limit);
    // 通用卡片式博客（ElevenLabs / Pika 等）— listUrl 填博客列表页
    case "html_cards":
      return fetchHtmlCards(source.listUrl, limit);
    // Runway 新闻 — 走 sitemap.xml，listUrl = https://runwayml.com/sitemap.xml
    case "runway_sitemap":
      return fetchRunwaySitemap(source.listUrl, limit);
    // 国家艺术基金 — 静态站，创作机会/申报征集，listUrl = https://www.cnaf.cn
    case "cnaf":
      return fetchCnafLatest(source.listUrl, limit);
    // Krea 官方博客 — 视觉/视频 AI（画风/prompt/模型更新），listUrl = https://www.krea.ai/blog
    case "krea":
      return fetchKreaBlog(source.listUrl, limit);
    // Luma AI（Dream Machine）新闻 — 视频 AI（运镜/image-to-video/分镜），listUrl = https://lumalabs.ai/news
    case "luma":
      return fetchLumaNews(source.listUrl, limit);
    default:
      return Promise.resolve([]);
  }
}

// 对 listPublishedAt 做宽松解析（详情同上）
function normalizeDateForDb(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const cn = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cn) return `${cn[1]}-${String(cn[2]).padStart(2, "0")}-${String(cn[3]).padStart(2, "0")}`;
  const slash = s.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})/);
  if (slash) return `${slash[1]}-${String(slash[2]).padStart(2, "0")}-${String(slash[3]).padStart(2, "0")}`;
  const ym = s.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) return `${ym[1]}-${String(ym[2]).padStart(2, "0")}-01`;
  const yonly = s.match(/^(\d{4})$/);
  if (yonly) return `${yonly[1]}-01-01`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    if (y >= 2000 && y <= new Date().getUTCFullYear() + 1) {
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  return null;
}
function normalizeChineseDate(text: string): string | null {
  // 匹配 "2024 年 3 月 15 日"、"2024年3月15日"、"2024-03-15"、"2024/3/15"
  const t = String(text).replace(/\s+/g, "").trim();
  const patterns: Array<{ re: RegExp; format: (m: RegExpMatchArray) => string | null }> = [
    {
      re: /(\d{4})年(\d{1,2})月(\d{1,2})日/,
      format: (m) => `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`,
    },
    {
      re: /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
      format: (m) => `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`,
    },
  ];
  for (const { re, format } of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const date = format(m);
    if (!date) continue;
    // 基本合法性校验
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const parsed = new Date(date + "T00:00:00Z");
    if (Number.isNaN(parsed.getTime())) continue;
    return date;
  }
  return null;
}

export type ExtractedDates = {
  effectiveFrom: string | null;
  effectiveTo: string | null;
  deadlineDate: string | null;
  allMatches: Array<{ type: string; date: string; raw: string }>;
};

export function extractStructuredDates(paragraphs: string[]): ExtractedDates {
  const result: ExtractedDates = { effectiveFrom: null, effectiveTo: null, deadlineDate: null, allMatches: [] };
  if (!Array.isArray(paragraphs)) return result;
  const blocks: Array<{ type: "effective_from" | "effective_to" | "deadline"; test: (text: string) => boolean }> = [
    {
      type: "effective_from",
      test: (text) =>
        /(?:自|从|本办法自|本规定自|本通知自|本方案自|本意见自|本决定自|施行日期：?|自发布之日起|起施行|起实施|起开始)/.test(text) &&
        /\d{4}[-年/\s]/.test(text),
    },
    {
      type: "deadline",
      test: (text) =>
        /(?:截止(?:日期)?[:：]?|至\d{4}[-年]?\d{1,2}[-月]?\d{1,2}日截止|受理截止|申报截止|截止时间)/.test(text),
    },
    {
      type: "effective_to",
      test: (text) => /(?:有效期至|有效期为|至\d{4}[-年]?\d{1,2}[-月]?\d{1,2}日止|至\d{4}[-年]?\d{1,2}[-月]?\d{1,2}日为止)/.test(text),
    },
  ];
  // 单独匹配"发布日期：YYYY-MM-DD"
  const publishedPattern = /发布(?:日期|时间)?\s*[:：]\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2}(?:日)?)/;
  for (const p of paragraphs) {
    if (!p || typeof p !== "string") continue;
    // 发布日期单独走
    const pubMatch = p.match(publishedPattern);
    if (pubMatch && pubMatch[1]) {
      const date = normalizeChineseDate(pubMatch[1]);
      if (date) result.allMatches.push({ type: "published", date, raw: pubMatch[0] });
    }
    for (const block of blocks) {
      if (!block.test(p)) continue;
      // 在段落内按句切分，避免"自2024年1月1日起施行，至2026年12月31日截止"被混匹配
      const sentences = p.split(/[。；;]/).map((s) => s.trim()).filter(Boolean);
      for (const s of sentences) {
        if (!block.test(s)) continue;
        const date = normalizeChineseDate(s);
        if (!date) continue;
        result.allMatches.push({ type: block.type, date, raw: s.slice(0, 80) });
        if (block.type === "effective_from" && !result.effectiveFrom) result.effectiveFrom = date;
        if (block.type === "deadline" && !result.deadlineDate) result.deadlineDate = date;
        if (block.type === "effective_to" && !result.effectiveTo) result.effectiveTo = date;
      }
    }
  }
  return result;
}

export type RunMonitorOptions = {
  scope?: {
    sourceIds?: string[];
    departmentNames?: string[];
  };
  // 当有明确 scope 时，是否绕过全局互斥锁（默认 true：手动跑特定部委/栏目时不被自动监测阻挡）
  // 当没有 scope（跑全部自动监测来源）时，强制走互斥锁，避免重复全量扫描
  bypassLockWhenScoped?: boolean;
};

export async function runMonitorOnce(options: RunMonitorOptions = {}) {
  await ensureMonitorSchema();

  const hasScope =
    Array.isArray(options.scope?.sourceIds) ||
    Array.isArray(options.scope?.departmentNames);
  const bypassLock = hasScope && (options.bypassLockWhenScoped ?? true);

  // —— 数据库级互斥锁：同一时刻只允许一个 "全局/无scope" 任务在跑
  //    带 scope 的手动触发（如单独跑某部委、某几个栏目）默认绕过锁，避免被自动监测阻挡
  // 1) 清理"僵尸锁"：超过 LOCK_TIMEOUT_MIN 仍为 running 的锁记录
  // 2) 用一个"特殊 lock 记录"做原子化 acquire：INSERT ... ON CONFLICT DO NOTHING
  // 3) 无论任务成功/失败/异常，在 finally 中都会删除锁记录

  // —— 可调参数：锁超时时间（分钟）
  const LOCK_TIMEOUT_MIN = 5;

  const pool = getPgPool();
  const lockId = "__active_run_lock__";

  try {
    await pool.query(
      `update monitor_runs set status = 'stale', error_message = '被标记为僵尸任务：超过 ' || $1::text || ' 分钟未结束', finished_at = now() where status = 'running' and started_at < now() - $2 * interval '1 minute' and id <> $3`,
      [String(LOCK_TIMEOUT_MIN), LOCK_TIMEOUT_MIN, lockId],
    );
    await pool.query(
      `delete from monitor_runs where id = $1 and started_at < now() - $2 * interval '1 minute'`,
      [lockId, LOCK_TIMEOUT_MIN],
    );
  } catch (err) {
    console.debug("[runner] 清理僵尸锁 SQL 失败（表可能尚未建好）：",
      err instanceof Error ? err.message : String(err));
  }

  const nowTs = nowIso();
  let acquired = bypassLock; // 带 scope 默认视为"已获取锁"
  if (!acquired) {
    try {
      const r = await pool.query(
        `insert into monitor_runs (id, started_at, status) values ($1, $2::timestamptz, 'running') on conflict (id) do nothing`,
        [lockId, nowTs],
      );
      acquired = (r.rowCount ?? 0) > 0;
    } catch (err) {
      console.debug("[runner] 获取互斥锁时 SQL 异常，标记为已获得以避免阻塞：",
        err instanceof Error ? err.message : String(err));
      acquired = true;
    }

    // 二次保护：无 scope 但获取锁失败时，若锁记录已超时也强制抢占
    if (!acquired) {
      try {
        const stale = await pool.query(
          `select id, started_at from monitor_runs where id = $1 and started_at < now() - $2 * interval '1 minute'`,
          [lockId, LOCK_TIMEOUT_MIN],
        );
        if (stale.rows.length > 0) {
          await pool.query(`delete from monitor_runs where id = $1`, [lockId]);
          const r2 = await pool.query(
            `insert into monitor_runs (id, started_at, status) values ($1, $2::timestamptz, 'running') on conflict (id) do nothing`,
            [lockId, nowIso()],
          );
          acquired = (r2.rowCount ?? 0) > 0;
        }
      } catch (err) {
        console.debug("[runner] 抢占超时锁失败：",
          err instanceof Error ? err.message : String(err));
      }
    }
  }

  if (!acquired) {
    const skipped: MonitorRunRecord = {
      id: `skipped-${Date.now()}`,
      startedAt: nowTs,
      finishedAt: nowTs,
      status: "success",
      errorMessage: `检测到另一个监控任务正在运行，本次调用被跳过（数据库级互斥锁，锁超时 ${LOCK_TIMEOUT_MIN} 分钟）。如需立即运行，请等待几分钟后重试，或手动执行 SQL：delete from monitor_runs where id='${lockId}'；若只想跑特定部委/栏目，使用页面"按部委多选"或各部委的"监测该部委"按钮可直接绕过锁。`,
      results: [],
    };
    return skipped;
  }

  const run: MonitorRunRecord = {
    id: newRunId(),
    startedAt: nowTs,
    status: "running",
  };

  try {
    await insertRunStarted(run);
  } catch (err) {
    console.debug("[runner] 记录 run 起始状态失败（不阻塞）：",
      err instanceof Error ? err.message : String(err));
  }

  let enabledSources: MonitorSourceConfig[] = [];
  const allSources = await getMonitorSources();

  if (options.scope && (options.scope.sourceIds || options.scope.departmentNames)) {
    const ids = new Set(options.scope.sourceIds ?? []);
    const names = new Set((options.scope.departmentNames ?? []).map((s) => s.trim()));
    enabledSources = allSources.filter(
      (s) => s.enabled && (ids.has(s.id) || names.has(s.departmentName ?? "")),
    );
  } else {
    enabledSources = await getAutoMonitorSources();
  }

  const results: MonitorSourceRunResult[] = [];

  // 任务跑完或异常退出时，都把 lock 记录清掉（放在 finally 中保证执行）
  // 注意：只有真正"拿到过锁"（非 bypassLock 且 确实 INSERT 成功）的任务才会去删锁，
  //       避免手动跑特定部委时把同时在跑的自动监测的锁给误删
  const reallyHeldLock = acquired && !bypassLock;
  const releaseLock = async () => {
    if (!reallyHeldLock) return;
    try {
      await pool.query(`delete from monitor_runs where id = $1`, [lockId]);
    } catch (err) {
      console.debug("[runner] 释放互斥锁失败：",
        err instanceof Error ? err.message : String(err));
    }
  };

  try {
    for (const source of enabledSources) {
      const result: MonitorSourceRunResult = {
        sourceId: source.id,
        displayName: source.displayName,
        listUrl: source.listUrl,
        status: "success",
        scannedCount: 0,
        visibleCount: 0,
        newCount: 0,
        newestItems: [],
        newItems: [],
      };

      try {
        const rawItems = await resolveListItems(source, Math.max(30, source.maxItems * 3));
        // —— URL 规范化：避免 utm_ 等参数差异导致同一条目重复入库
        const normalizedRawItems = rawItems.map((item) => ({
          ...item,
          url: normalizeItemUrl(item.url),
        }));
        result.scannedCount = normalizedRawItems.length;

        // 1) 对 listPublishedAt 做宽松归一化：中文日期 / 不完整日期做归一化
        //    · 若解析失败（为空字符串）: 丢弃
        //    · 若早于 source.startDate: 丢弃
        //    · 并把归一化后的值写回 item.listPublishedAt（DB 存的就是 YYYY-MM-DD）
        const visibleItems = normalizedRawItems
          .flatMap((item) => {
            const n = normalizeDateForDb(item.listPublishedAt);
            if (!n || n < source.startDate) return [];
            return [{ ...item, listPublishedAt: n }];
          })
          .slice(0, source.maxItems);

        result.visibleCount = visibleItems.length;
        result.newestItems = visibleItems;

        const existing = await findExistingUrls(source.id, visibleItems.map((i) => i.url));
        const newlyFound = visibleItems.filter((item) => !existing.has(item.url));

        const firstSeenAt = nowIso();
        await insertNewItems(source.id, firstSeenAt, newlyFound);

        // 每个来源每次最多抓 10 条详情，防止首次运行时 N 个来源 × 30 条同时堆积内存
        // 未抓到详情的条目可通过页面上的「重抓详情」按钮补全
        const DETAIL_FETCH_CAP = 10;
        const itemsToCapture = newlyFound.slice(0, DETAIL_FETCH_CAP);

        for (const item of itemsToCapture) {
          try {
            const detail = await captureDetailPage(item.url);
            await upsertItemDetail(source.id, item.url, {
              pageTitle: detail.pageTitle,
              paragraphs: detail.paragraphs,
              attachments: detail.attachments.map((a) => ({ url: a.url, text: a.text, kind: a.kind })),
              externalLinks: (detail.externalLinks ?? []).map((l) => ({ text: l.text, url: l.url })),
              contentQuality: detail.contentQuality,
              captureNote: detail.captureNote,
              capturedAtIso: nowIso(),
            });
            // 结构化日期抽取
            try {
              const dates = extractStructuredDates(detail.paragraphs ?? []);
              if (dates.effectiveFrom || dates.effectiveTo || dates.deadlineDate || dates.allMatches.length > 0) {
                await updateItemStructuredDates(source.id, item.url, dates);
              }
            } catch {
              // 日期抽取失败不阻塞主流程
            }
          } catch {
            await upsertItemDetail(source.id, item.url, {
              pageTitle: null,
              paragraphs: [],
              attachments: [],
              externalLinks: [],
              contentQuality: "empty",
              captureNote: "正文抓取异常，建议打开原网址查看。",
              capturedAtIso: nowIso(),
            });
          }
          try {
            await scanAndApplyKeywords(source.id, item.url);
          } catch (err) {
            console.debug(`[runner] 关键词扫描失败（${source.id} ${item.url}）：`,
              err instanceof Error ? err.message : String(err));
          }
        }

        // 对已经存在但本次又出现在 visibleItems 的文章，也重扫关键词（词库升级后也能看到新标签）
        for (const item of visibleItems) {
          if (existing.has(item.url)) {
            try {
              await scanAndApplyKeywords(source.id, item.url);
            } catch (err) {
              console.debug(`[runner] 补扫关键词失败（${source.id} ${item.url}）：`,
                err instanceof Error ? err.message : String(err));
            }
          }
        }

        result.newItems = newlyFound.map((item) => ({ ...item, firstSeenAt }));
        result.newCount = result.newItems.length;
      } catch (error) {
        result.status = "error";
        result.errorMessage = error instanceof Error ? error.message : String(error);
      }

      results.push(result);
    }

    run.status = "success";
    run.finishedAt = nowIso();
    run.results = results;
    await updateRunFinished(run);
    // 抓取只进货；创作者视角在后台补齐——不 await：不拖慢本次返回，也不占抓取锁
    void backfillLensAfterRun(pool);
    return run;
  } catch (error) {
    run.status = "error";
    run.finishedAt = nowIso();
    run.errorMessage = error instanceof Error ? error.message : String(error);
    await updateRunFinished(run);
    return run;
  } finally {
    // 无论成功/失败/异常，确保锁被释放，否则下次永远无法获取锁
    await releaseLock();
  }
}

export async function getMonitorStatus() {
  await ensureMonitorSchema();
  return await getLatestRun();
}
