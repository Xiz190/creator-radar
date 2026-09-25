import { getPgPool } from "@/lib/db";
import { normalizeItemUrl } from "@/lib/monitor/utils";
import { computeDeduplicationKey, findDuplicateByKey, updateItemDuplicateStatus } from "@/lib/monitor/deduplication";
import { extractTags } from "@/lib/monitor/tag-extraction";
import { createLogger } from "@/lib/logger";

const logger = createLogger("monitor:db");

const MAX_HTML_BYTES = 2_000_000; // 2MB

// 非 HTML 二进制文档（PDF/扫描件/图片/Office/压缩包）识别。
// response.text() 会把二进制字节读成乱码，旧逻辑会把这些字节当成"正文段落"
// 误判为 high（CAPA 的扫描件 PDF 就中过招）。在解析前短路：归为附件、正文判 empty，
// 避免二进制乱码污染快照数据。
function detectBinaryDocument(
  contentType: string | null,
  body: string,
): { kind: string; label: string } | null {
  const ct = (contentType ?? "").toLowerCase();

  // 1) Content-Type 头（最可靠）
  if (ct.includes("application/pdf")) return { kind: "document", label: "PDF 附件（正文不可抽取）" };
  if (ct.startsWith("image/")) return { kind: "image", label: "图片附件（正文不可抽取）" };
  if (
    ct.includes("msword") ||
    ct.includes("officedocument") ||
    ct.includes("ms-excel") ||
    ct.includes("ms-powerpoint")
  ) {
    return { kind: "document", label: "Office 文档附件（正文不可抽取）" };
  }
  if (ct.includes("application/zip") || ct.includes("application/x-rar")) {
    return { kind: "archive", label: "压缩包附件（正文不可抽取）" };
  }

  // 2) 魔数（ASCII 可靠，兜住 Content-Type 缺失或谎报）
  const head = body.slice(0, 8);
  if (head.startsWith("%PDF-")) return { kind: "document", label: "PDF 附件（正文不可抽取）" };
  if (head.startsWith("PK")) return { kind: "document", label: "打包文档附件（正文不可抽取）" };

  // 3) 兜底：解码后大量 U+FFFD 替换符 = 二进制被当文本读进来
  const sample = body.slice(0, 1000);
  if (sample.length > 0) {
    const bad = (sample.match(/�/g) ?? []).length;
    if (bad / sample.length > 0.1) return { kind: "other", label: "二进制附件（正文不可抽取）" };
  }

  return null;
}

export async function captureDetailPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(30000),
  });

  const finalUrl = response.url;

  // 页面过大时跳过，防止撑爆内存
  const cl = Number(response.headers.get("content-length") ?? 0);
  if (cl > MAX_HTML_BYTES) {
    return {
      pageTitle: null as string | null,
      paragraphs: [] as string[],
      attachments: [] as Array<{ url: string; text: string; kind: string }>,
      externalLinks: [] as Array<{ text: string; url: string }>,
      contentQuality: "empty",
      captureNote: "页面过大（Content-Length 超过 2MB），已跳过正文抓取。",
      finalUrl,
    };
  }

  const rawText = await response.text();
  // 即使无 Content-Length 也截断，防止超大响应
  const text = rawText.length > MAX_HTML_BYTES ? rawText.slice(0, MAX_HTML_BYTES) : rawText;

  // 非 HTML 二进制（PDF/扫描件/图片/Office）：短路，避免把二进制字节误判为正文 high
  const binary = detectBinaryDocument(response.headers.get("content-type"), text);
  if (binary) {
    return {
      pageTitle: null as string | null,
      paragraphs: [] as string[],
      attachments: [{ url: finalUrl, text: binary.label, kind: binary.kind }],
      externalLinks: [] as Array<{ text: string; url: string }>,
      contentQuality: "empty",
      captureNote: `检测到${binary.label}，非 HTML 正文，已跳过正文抓取并归为附件。`,
      finalUrl,
    };
  }

  const pageTitle = extractTitle(text);
  const paragraphs = extractParagraphs(text);
  const attachments = extractAttachments(text, finalUrl);
  const externalLinks = extractExternalLinks(text, finalUrl);
  const contentQuality = assessContentQuality(paragraphs);
  const captureNote = generateCaptureNote(paragraphs);

  return {
    pageTitle,
    paragraphs,
    attachments,
    externalLinks,
    contentQuality,
    captureNote,
    finalUrl,
  };
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match) {
    return match[1].trim().replace(/\s+/g, " ");
  }
  return null;
}

// 剥掉导航/页眉/页脚/侧栏等结构性噪音区域，避免菜单文字混进正文
// （尤其是 Next.js/RSC 站点没有 <p> 时会走兜底、把整页文字吞进来）
function stripNoiseRegions(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    // 评论区（WordPress / Synthtopia / Disqus 等）：评论总在正文之后，从评论区
    // 容器的起始标签一刀砍到文档末尾。这些 id/class 高度特异，不会误伤正文。
    .replace(
      /<(?:div|section|ol|ul)[^>]*(?:id=["'](?:comments|respond|disqus_thread)["']|class=["'][^"']*\b(?:comments-area|comment-list|commentlist)\b[^"']*["'])[\s\S]*$/i,
      " ",
    );
}

/**
 * 高精度特征——**在任何尺度上都成立**：命中就说明这段根本不是正文。
 * 拦截页 / cookie 提示 / 残留 JS。
 *
 * ⚠️ 第 3 步兜底（整页拼成一个块）**只能用这一组**。
 * 下面那组"段落尺度"的启发式套到整页上会误杀：因为兜底只按 [。！？!?] 切，
 * 英文正文会变成**一整个块**，于是 `^explore`/`^check out`/camelJam 这些
 * 一旦命中就丢掉整篇文章——而它们的本意只是识别页脚的一行小字。
 */
function looksLikeBlockPage(text: string): boolean {
  if (/we use cookies|cookie (policy|consent|settings)/i.test(text)) return true;
  if (/function\s+\w*\s*\(|SQUARESPACE_CONTEXT|window\.\w+\s*=|\{\s*try\s*\{/.test(text)) return true;
  // 限流 / 反爬拦截页被当成正文。
  // 实测（2026-09-18）：39 条中招，正文是
  //   ["You have been rate-limited for making too many requests in a short time frame.",
  //    "Website owner? If you think you have reached this message in error…"]
  // 后果不止是正文难看——lens 生成器读到这坨垃圾，于是写出"我读不到正文，去点原文"
  // 这种毫无价值的点评（中文版 26 条中招）。
  // 模式刻意收窄到拦截页的原话，避免误伤正常内容。
  if (
    /you have been rate-limited|rate-?limited for making|too many requests in a short time|website owner\? if you think|if you think you have reached this message in error|checking your browser before accessing|enable javascript and cookies to continue|attention required!?\s*\|\s*cloudflare/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

// 判断一段文字是否像导航/页脚样板（连写的菜单词、版权行等）。
// 只在 <p> 与 div 块这两条**段落尺度**的路径上用；整页兜底请用 looksLikeBlockPage。
function looksLikeBoilerplate(text: string): boolean {
  if (looksLikeBlockPage(text)) return true;
  const nav =
    /(contact us|careers|sign in|log in|sign up|©|all rights reserved|privacy policy|terms of service|cookie preferences|back to blog|go to [a-z]+ video|experiments)/gi;
  const navHits = (text.match(nav) ?? []).length;
  // 命中多个导航词 = 菜单串（不论长短，如 "CareersContact UsAPIExperimentsBlog..."）
  if (navHits >= 2) return true;
  // 短文本里含导航词
  if (navHits >= 1 && text.length < 140) return true;
  // 大量"小写紧接大写"：菜单链接被剥掉空格后拼接的特征，正文散文几乎为 0
  const camelJams = (text.match(/[a-z][A-Z]/g) ?? []).length;
  if (camelJams >= 6 && text.length < 400) return true;
  // 订阅/促销样板（如 Splice 反复出现的 "New subscribers can try all of Splice … $4.99/mo."）
  if (/new subscribers can try all of|\$\d+(\.\d+)?\s*\/\s*mo\b/i.test(text) && text.length < 320) return true;
  // 推荐卡片/相关文章/作者简介（文章页尾部的噪音，如 Splice "Explore royalty-free…" / "Expert producer and DJ…"）
  if (/^(explore|expert (producer|film composer|dj)|learn how to make|meet the (artist|producer|label)|related (posts|articles)|more (from|on)|check out (more|these)|sign up (to|for)|subscribe to)/i.test(text)) return true;
  // 孤立日期行 / 作者署名行（"August 27, 2026" / "Harrison Shimazu is a composer…"）
  if (/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(text)) return true;
  if (/^[A-Z][a-z]+ [A-Z][a-z]+ is a (composer|producer|writer|musician|artist|engineer)/.test(text)) return true;
  return false;
}

// 完整解码 HTML 实体（含数字实体，如 &#39; &#x27; &quot; 等）
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

// 把一个 HTML 片段转成纯文本段落
function textFromBlock(block: string): string {
  return decodeEntities(block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractParagraphs(rawHtml: string): string[] {
  const html = stripNoiseRegions(rawHtml);
  const paragraphs: string[] = [];
  const seen = new Set<string>(); // 去重：部分站点(桌面/移动菜单)会重复渲染整段

  // 1) 优先 <p>（传统博客）
  const pTags = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  if (pTags) {
    for (const p of pTags) {
      const text = textFromBlock(p);
      if (text.length >= 12 && !looksLikeBoilerplate(text) && !seen.has(text)) {
        seen.add(text);
        paragraphs.push(text);
      }
    }
  }

  // 2) <p> 不足时，尝试 <div>/<section> 里的文字块（React/div 结构的站，如 Suno/ElevenLabs）
  if (paragraphs.length < 3) {
    const blockTags = html.match(/<(?:div|section|article)[^>]*>([\s\S]*?)<\/(?:div|section|article)>/gi);
    if (blockTags) {
      for (const block of blockTags) {
        // 跳过嵌套/无正文的块
        if (/<(?:div|section|article)[^>]*>/i.test(block.replace(/<\/(?:div|section|article)>/g, ""))) continue;
        const text = textFromBlock(block);
        if (text.length >= 12 && !looksLikeBoilerplate(text) && !seen.has(text)) {
          seen.add(text);
          paragraphs.push(text);
        }
      }
    }
  }

  // 3) 兜底：整页剥标签后按标点切分（避免整页吞导航/JS 残渣）
  if (paragraphs.length === 0) {
    const stripped = decodeEntities(html.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length > 50) {
      // 按句子切分，过滤无意义片段。
      // ⚠️ 这一步**必须**同样过检测——否则会形成一条反直觉的漏洞：
      // 前两步刚把拦截页/导航文字正确滤掉、于是 paragraphs 为空，兜底紧接着
      // 把整页文字原样捞回来，检测等于白做。实测（2026-09-18）14 条限流页正是
      // 从这里漏进库的，而它们的正文在 ①② 里已经被正确拒绝了。
      //
      // 但这里只能用 looksLikeBlockPage（高精度那组），**不能用完整的
      // looksLikeBoilerplate**：兜底按 [。！？!?] 切，英文正文会变成一个整块，
      // 于是 `^explore`/`^check out`/camelJam 这些段落尺度的启发式一旦命中
      // 就会把一篇正常文章整篇丢掉。
      const chunks = stripped
        .split(/(?<=[。！？!?])/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 12 && !looksLikeBlockPage(s));
      paragraphs.push(...chunks.slice(0, 20));
      if (paragraphs.length === 0 && !looksLikeBlockPage(stripped)) {
        paragraphs.push(stripped.slice(0, 3000));
      }
    }
  }

  return paragraphs.slice(0, 50);
}

function extractAttachments(html: string, baseUrl: string): Array<{ url: string; text: string; kind: string }> {
  const attachments: Array<{ url: string; text: string; kind: string }> = [];
  const links = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi);
  
  if (links) {
    for (const link of links) {
      const hrefMatch = link.match(/href=["']([^"']+)["']/i);
      const textMatch = link.match(/>([^<]+)<\/a>/i);
      
      if (hrefMatch && textMatch) {
        let href = hrefMatch[1];
        const text = textMatch[1].trim();
        
        if (href.startsWith("/")) {
          const base = new URL(baseUrl);
          href = `${base.protocol}//${base.host}${href}`;
        } else if (!href.startsWith("http")) {
          href = new URL(href, baseUrl).toString();
        }

        let kind = "other";
        if (href.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
          kind = "document";
        } else if (href.match(/\.(zip|rar|7z|tar|gz)$/i)) {
          kind = "archive";
        } else if (href.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
          kind = "image";
        } else if (href.match(/\.(mp4|avi|mov|wmv)$/i)) {
          kind = "video";
        }

        attachments.push({ url: href, text, kind });
      }
    }
  }

  return attachments.slice(0, 20);
}

function extractExternalLinks(html: string, baseUrl: string): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi);
  
  if (linkMatches) {
    for (const link of linkMatches) {
      const hrefMatch = link.match(/href=["']([^"']+)["']/i);
      const textMatch = link.match(/>([^<]+)<\/a>/i);
      
      if (hrefMatch && textMatch) {
        let href = hrefMatch[1];
        const text = textMatch[1].trim();
        
        if (href.startsWith("/")) {
          const base = new URL(baseUrl);
          href = `${base.protocol}//${base.host}${href}`;
        } else if (!href.startsWith("http")) {
          href = new URL(href, baseUrl).toString();
        }

        if (text.length > 0 && text.length <= 200) {
          links.push({ text, url: href });
        }
      }
    }
  }

  return links.slice(0, 50);
}

function assessContentQuality(paragraphs: string[]): string {
  if (paragraphs.length === 0) return "empty";
  if (paragraphs.length >= 10) return "high";
  if (paragraphs.length >= 5) return "medium";
  if (paragraphs.length >= 2) return "low";
  return "minimal";
}

function generateCaptureNote(paragraphs: string[]): string {
  if (paragraphs.length === 0) return "";
  const firstPara = paragraphs[0];
  if (firstPara.length <= 200) return firstPara;
  return firstPara.slice(0, 200) + "...";
}

export async function getDepartmentNamesWithItems() {
  const pool = getPgPool();
  const res = await pool.query<{ department_name: string; count: string }>(
    `select coalesce(ms.department_name, '未分类部委') as department_name, count(*)::text as count
     from monitor_items mi
     left join monitor_sources ms on ms.id = mi.source_id
     group by coalesce(ms.department_name, '未分类部委')
     order by count(*) desc, department_name asc`,
  );
  return res.rows.map((row) => ({ departmentName: row.department_name, count: Number(row.count) }));
}

export type MonitorItemDetail = {
  sourceId: string;
  url: string;
  title: string;
  listPublishedAt: string | null;
  firstSeenAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  pageTitle: string | null;
  summary: string | null;
  paragraphs: string[];
  attachments: Array<{ url: string; text: string; kind: string }>;
  externalLinks: Array<{ text: string; url: string }>;
  contentQuality: string | null;
  captureNote: string | null;
  capturedAt: string | null;
  departmentName: string;
  channelGroup: string | null;
  channelName: string;
  displayName: string;
  keywordScore: number;
  importanceLevel: string;
  categories: Array<{ category: string; score: number; topKeywords?: string[] }>;
  matchedKeywords: Array<{ keyword: string; category: string; weight: number }>;
  matchedCategories: Array<{ category: string; score: number; topKeywords?: string[] }>;
  matchedGenres: string[];
  signalHits: unknown;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  deadlineDate: string | null;
  extractedDates: Array<{ type: string; date: string; raw?: string }>;
  signalMeta: {
    totalScore?: number;
    totalSignalStrength?: number;
    strongTopicCategories?: string[];
    distinctStrongTopicKeywords?: number;
    bodyParagraphCount?: number;
    totalStructureScore?: number;
    titleStructureHit?: boolean;
    hasStrongTopic?: boolean;
    riskHit?: boolean;
    hasTitleStructure?: boolean;
    thresholdDiscount?: number;
    thresholds?: {
      core: number;
      highlight: number;
      mid: number;
    };
    level?: string;
  } | null;
  signalHitsRaw: Record<string, unknown> | null;
  documentStatus: string | null;
  hasFunding: boolean;
  hasProcurement: boolean;
  hasPilot: boolean;
  hasStandards: boolean;
  forecastHigh: string | null;
  forecastMidHigh: string | null;
  forecastMid: string | null;
  forecastLow: string | null;
  forecastNotes: string | null;
  forecastSources: Array<{ title: string; url: string; note?: string }> | null;
  policyChain: Record<string, unknown> | null;
  industryImpact: Record<string, unknown> | null;
  preSignals: Record<string, unknown> | null;
  forecastUpdatedAt: string | null;
};

export async function getItemDetailBySourceAndUrl(sourceId: string, url: string): Promise<MonitorItemDetail | null> {
  const pool = getPgPool();
  const targetUrl = normalizeItemUrl(url);
  const res = await pool.query(
    `select mi.source_id,
            mi.url,
            mi.title,
            mi.list_published_at,
            mi.first_seen_at,
            mi.is_read,
            mi.is_starred,
            mi.page_title,
            mi.summary,
            mi.content_json,
            mi.content_quality,
            mi.capture_note,
            mi.attachments_json,
            mi.external_links_json,
            mi.captured_at,
            mi.keyword_score,
            mi.importance_level,
            mi.matched_categories,
            mi.effective_from,
            mi.effective_to,
            mi.deadline_date,
            mi.extracted_dates_json,
            mi.signal_hits,
            mi.matched_genres,
            mi.document_status,
            mi.has_funding,
            mi.has_procurement,
            mi.has_pilot,
            mi.has_standards,
            mi.forecast_high,
            mi.forecast_mid_high,
            mi.forecast_mid,
            mi.forecast_low,
            mi.forecast_notes,
            mi.forecast_sources_json,
            mi.policy_chain_json,
            mi.industry_impact_json,
            mi.pre_signals_json,
            mi.forecast_updated_at,
            coalesce(ms.department_name, '未分类部委') as department_name,
            coalesce(ms.channel_name, mi.source_id) as channel_name,
            coalesce(ms.display_name, concat(coalesce(ms.department_name, '未分类部委'), '·', coalesce(ms.channel_name, ''))) as display_name,
            ms.channel_group
     from monitor_items mi
     left join monitor_sources ms on ms.id = mi.source_id
     where mi.source_id = $1 and mi.url = $2
     limit 1`,
    [sourceId, targetUrl],
  );
  if (res.rowCount === 0) return null;
  const row = res.rows[0];

  const parseJsonArray = <T,>(value: unknown, validate: (item: unknown) => item is T): T[] => {
    if (!Array.isArray(value)) return [];
    const out: T[] = [];
    for (const item of value) {
      if (validate(item)) out.push(item);
    }
    return out;
  };

  const isString = (v: unknown): v is string => typeof v === "string";
  const isAttachment = (v: unknown): v is { url: string; text: string; kind: string } =>
    !!v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string" &&
    typeof (v as { text?: unknown }).text === "string" && typeof (v as { kind?: unknown }).kind === "string";
  const isExternalLink = (v: unknown): v is { text: string; url: string } =>
    !!v && typeof v === "object" && typeof (v as { text?: unknown }).text === "string" &&
    typeof (v as { url?: unknown }).url === "string";

  const paragraphs: string[] = parseJsonArray(row.content_json, isString);
  const attachments: Array<{ url: string; text: string; kind: string }> = parseJsonArray(row.attachments_json, isAttachment);
  const externalLinks: Array<{ text: string; url: string }> = parseJsonArray(row.external_links_json, isExternalLink);
  let categories: Array<{ category: string; score: number; topKeywords?: string[] }> = [];
  if (row.matched_categories) {
    try {
      const raw = row.matched_categories;
      const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw));
      if (Array.isArray(parsed)) categories = parsed;
    } catch {}
  }
  const matchedKeywords: Array<{ keyword: string; category: string; weight: number }> = [];
  for (const cat of categories) {
    for (const kw of cat.topKeywords ?? []) {
      matchedKeywords.push({ keyword: String(kw), category: cat.category, weight: Number(cat.score) || 0 });
    }
  }
  const toDateStr = (d: unknown): string => {
    if (!d) return "";
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    const s = String(d);
    return s.slice(0, 10);
  };
  const toDateStrOrNull = (d: unknown): string | null => {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    const s = String(d);
    return s.slice(0, 10) || null;
  };
  let extractedDates: Array<{ type: string; date: string; raw?: string }> = [];
  if (row.extracted_dates_json) {
    try {
      const parsed = JSON.parse(String(row.extracted_dates_json));
      if (Array.isArray(parsed)) extractedDates = parsed;
    } catch {}
  }
  let signalMeta: MonitorItemDetail["signalMeta"] = null;
  let signalHitsRaw: Record<string, unknown> | null = null;
  if (row.signal_hits) {
    try {
      const parsed: Record<string, unknown> = JSON.parse(String(row.signal_hits));
      signalHitsRaw = parsed;
      if (parsed && typeof parsed._meta === "object" && parsed._meta !== null) {
        const m = parsed._meta as Record<string, unknown>;
        signalMeta = {
          totalScore: typeof m.totalScore === "number" ? m.totalScore : undefined,
          totalSignalStrength: typeof m.totalSignalStrength === "number" ? m.totalSignalStrength : undefined,
          strongTopicCategories: Array.isArray(m.strongTopicCategories)
            ? (m.strongTopicCategories as string[])
            : undefined,
          distinctStrongTopicKeywords: typeof m.distinctStrongTopicKeywords === "number"
            ? m.distinctStrongTopicKeywords
            : undefined,
          bodyParagraphCount: typeof m.bodyParagraphCount === "number" ? m.bodyParagraphCount : undefined,
          totalStructureScore: typeof m.totalStructureScore === "number" ? m.totalStructureScore : undefined,
          titleStructureHit: typeof m.titleStructureHit === "boolean" ? m.titleStructureHit : undefined,
          hasStrongTopic: typeof m.hasStrongTopic === "boolean" ? m.hasStrongTopic : undefined,
          riskHit: typeof m.riskHit === "boolean" ? m.riskHit : undefined,
          hasTitleStructure: typeof m.hasTitleStructure === "boolean" ? m.hasTitleStructure : undefined,
          thresholdDiscount: typeof m.thresholdDiscount === "number" ? m.thresholdDiscount : undefined,
          thresholds: typeof m.thresholds === "object" && m.thresholds !== null
            ? {
                core: Number((m.thresholds as Record<string, unknown>).core),
                highlight: Number((m.thresholds as Record<string, unknown>).highlight),
                mid: Number((m.thresholds as Record<string, unknown>).mid),
              }
            : undefined,
          level: typeof m.level === "string" ? m.level : undefined,
        };
      }
    } catch {}
  }
  return {
    sourceId: row.source_id,
    url: row.url,
    title: row.title,
    listPublishedAt: toDateStr(row.list_published_at),
    firstSeenAt: row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : String(row.first_seen_at),
    isRead: Boolean(row.is_read),
    isStarred: Boolean(row.is_starred),
    pageTitle: row.page_title ?? null,
    summary: row.summary ?? null,
    paragraphs,
    attachments,
    externalLinks,
    contentQuality: row.content_quality ?? null,
    captureNote: row.capture_note ?? null,
    capturedAt: row.captured_at ? (row.captured_at instanceof Date ? row.captured_at.toISOString() : String(row.captured_at)) : null,
    departmentName: row.department_name,
    channelGroup: row.channel_group ?? null,
    channelName: row.channel_name,
    displayName: row.display_name,
    keywordScore: Number(row.keyword_score) || 0,
    importanceLevel: row.importance_level || "普通内容",
    categories,
    matchedKeywords,
    matchedCategories: categories,
    matchedGenres: parseJsonArray(row.matched_genres, isString) as string[],
    signalHits: signalHitsRaw,
    effectiveFrom: toDateStrOrNull(row.effective_from),
    effectiveTo: toDateStrOrNull(row.effective_to),
    deadlineDate: toDateStrOrNull(row.deadline_date),
    extractedDates,
    signalMeta,
    signalHitsRaw,
    documentStatus: row.document_status ?? null,
    hasFunding: Boolean(row.has_funding),
    hasProcurement: Boolean(row.has_procurement),
    hasPilot: Boolean(row.has_pilot),
    hasStandards: Boolean(row.has_standards),
    forecastHigh: row.forecast_high ?? null,
    forecastMidHigh: row.forecast_mid_high ?? null,
    forecastMid: row.forecast_mid ?? null,
    forecastLow: row.forecast_low ?? null,
    forecastNotes: row.forecast_notes ?? null,
    forecastSources: row.forecast_sources_json ?? null,
    policyChain: row.policy_chain_json ?? null,
    industryImpact: row.industry_impact_json ?? null,
    preSignals: row.pre_signals_json ?? null,
    forecastUpdatedAt: row.forecast_updated_at ? (row.forecast_updated_at instanceof Date ? row.forecast_updated_at.toISOString() : String(row.forecast_updated_at)) : null,
  };
}

export async function getItemDetailBySourceId(sourceId: string): Promise<MonitorItemDetail | null> {
  const pool = getPgPool();
  const res = await pool.query(
    `select mi.source_id,
            mi.url,
            mi.title,
            mi.list_published_at,
            mi.first_seen_at,
            mi.is_read,
            mi.is_starred,
            mi.page_title,
            mi.summary,
            mi.content_json,
            mi.content_quality,
            mi.capture_note,
            mi.attachments_json,
            mi.external_links_json,
            mi.captured_at,
            mi.keyword_score,
            mi.matched_keywords,
            mi.matched_categories,
            mi.matched_genres,
            mi.signal_hits,
            mi.importance_level,
            mi.effective_from,
            mi.effective_to,
            mi.deadline_date,
            mi.document_status,
            mi.has_funding,
            mi.has_procurement,
            mi.has_pilot,
            mi.has_standards,
            mi.forecast_high,
            mi.forecast_mid_high,
            mi.forecast_mid,
            mi.forecast_low,
            mi.forecast_notes,
            mi.forecast_sources_json,
            mi.policy_chain_json,
            mi.industry_impact_json,
            mi.pre_signals_json,
            mi.forecast_updated_at,
            ms.department_name,
            ms.channel_group,
            ms.channel_name,
            ms.display_name
     from monitor_items mi
     left join monitor_sources ms on mi.source_id = ms.id
     where mi.source_id = $1
     limit 1`,
    [sourceId],
  );
  if (res.rowCount === 0) return null;
  const row = res.rows[0];

  const parseJsonArray = <T,>(value: unknown, validate: (item: unknown) => item is T): T[] => {
    if (!Array.isArray(value)) return [];
    const out: T[] = [];
    for (const item of value) {
      if (validate(item)) out.push(item);
    }
    return out;
  };

  const isString = (v: unknown): v is string => typeof v === "string";
  const isAttachment = (v: unknown): v is { url: string; text: string; kind: string } =>
    !!v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string" &&
    typeof (v as { text?: unknown }).text === "string" && typeof (v as { kind?: unknown }).kind === "string";
  const isExternalLink = (v: unknown): v is { text: string; url: string } =>
    !!v && typeof v === "object" && typeof (v as { text?: unknown }).text === "string" &&
    typeof (v as { url?: unknown }).url === "string";
  const isForecastSource = (v: unknown): v is { title: string; url: string; note?: string } =>
    !!v && typeof v === "object" && typeof (v as { title?: unknown }).title === "string" &&
    typeof (v as { url?: unknown }).url === "string";

  let categories: Array<{ category: string; score: number; topKeywords?: string[] }> = [];
  try {
    const rawCategories = row.matched_categories;
    categories = parseJsonArray(rawCategories, (m): m is { category: string; score: number; topKeywords?: string[] } =>
      !!m && typeof m === "object" && typeof (m as { category?: unknown }).category === "string" &&
      typeof (m as { score?: unknown }).score === "number"
    );
  } catch {}

  let matchedCategories: Array<{ category: string; score: number; level?: string }> = [];
  try {
    const rawCategories = row.matched_categories;
    matchedCategories = parseJsonArray(rawCategories, (m): m is { category: string; score: number; level?: string } =>
      !!m && typeof m === "object" && typeof (m as { category?: unknown }).category === "string" &&
      typeof (m as { score?: unknown }).score === "number"
    );
  } catch {}

  let matchedGenres: string[] = [];
  try {
    matchedGenres = parseJsonArray(row.matched_genres, isString);
  } catch {}

  let extractedDates: Array<{ type: string; date: string; raw?: string }> = [];
  if (row.extracted_dates_json) {
    try {
      const parsed = JSON.parse(String(row.extracted_dates_json));
      if (Array.isArray(parsed)) extractedDates = parsed;
    } catch {}
  }

  let signalMeta: Record<string, unknown> | null = null;
  let signalHitsRaw: Record<string, unknown> | null = null;
  let signalHits: unknown = null;
  if (row.signal_hits) {
    try {
      const parsed: Record<string, unknown> = JSON.parse(String(row.signal_hits));
      signalHitsRaw = parsed;
      if (parsed && typeof parsed._meta === "object" && parsed._meta !== null) {
        const m = parsed._meta as Record<string, unknown>;
        signalMeta = {
          totalScore: typeof m.totalScore === "number" ? m.totalScore : undefined,
          totalSignalStrength: typeof m.totalSignalStrength === "number" ? m.totalSignalStrength : undefined,
          strongTopicCategories: Array.isArray(m.strongTopicCategories) ? (m.strongTopicCategories as string[]) : undefined,
          distinctStrongTopicKeywords: typeof m.distinctStrongTopicKeywords === "number" ? m.distinctStrongTopicKeywords : undefined,
          bodyParagraphCount: typeof m.bodyParagraphCount === "number" ? m.bodyParagraphCount : undefined,
          totalStructureScore: typeof m.totalStructureScore === "number" ? m.totalStructureScore : undefined,
          titleStructureHit: typeof m.titleStructureHit === "boolean" ? m.titleStructureHit : undefined,
          hasStrongTopic: typeof m.hasStrongTopic === "boolean" ? m.hasStrongTopic : undefined,
          riskHit: typeof m.riskHit === "boolean" ? m.riskHit : undefined,
          hasTitleStructure: typeof m.hasTitleStructure === "boolean" ? m.hasTitleStructure : undefined,
          thresholdDiscount: typeof m.thresholdDiscount === "number" ? m.thresholdDiscount : undefined,
          thresholds: typeof m.thresholds === "object" && m.thresholds !== null
            ? {
                core: Number((m.thresholds as Record<string, unknown>).core),
                highlight: Number((m.thresholds as Record<string, unknown>).highlight),
                mid: Number((m.thresholds as Record<string, unknown>).mid),
              }
            : undefined,
        };
      }
      signalHits = parsed;
    } catch {}
  }

  return {
    sourceId: row.source_id,
    url: row.url,
    title: row.title,
    listPublishedAt: row.list_published_at ? String(row.list_published_at) : null,
    firstSeenAt: row.first_seen_at ? (row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : String(row.first_seen_at)) : null,
    isRead: row.is_read ?? false,
    isStarred: row.is_starred ?? false,
    pageTitle: row.page_title ?? null,
    summary: row.summary ?? null,
    paragraphs: parseJsonArray(row.content_json, isString),
    contentQuality: row.content_quality ?? "unknown",
    captureNote: row.capture_note ?? null,
    attachments: parseJsonArray(row.attachments_json, isAttachment),
    externalLinks: parseJsonArray(row.external_links_json, isExternalLink),
    capturedAt: row.captured_at ? (row.captured_at instanceof Date ? row.captured_at.toISOString() : String(row.captured_at)) : null,
    departmentName: row.department_name ?? "",
    channelGroup: row.channel_group ?? null,
    channelName: row.channel_name ?? "",
    displayName: row.display_name ?? "",
    keywordScore: Number(row.keyword_score ?? 0),
    importanceLevel: row.importance_level ?? "普通内容",
    categories,
    matchedKeywords: (parseJsonArray(row.matched_keywords, isString) as string[]).map(kw => ({ keyword: kw, category: "", weight: 0 })),
    matchedCategories,
    matchedGenres,
    signalHits,
    signalMeta,
    signalHitsRaw,
    extractedDates,
    effectiveFrom: row.effective_from ? String(row.effective_from) : null,
    effectiveTo: row.effective_to ? String(row.effective_to) : null,
    deadlineDate: row.deadline_date ? String(row.deadline_date) : null,
    documentStatus: row.document_status ?? null,
    hasFunding: row.has_funding ?? false,
    hasProcurement: row.has_procurement ?? false,
    hasPilot: row.has_pilot ?? false,
    hasStandards: row.has_standards ?? false,
    forecastHigh: row.forecast_high ?? null,
    forecastMidHigh: row.forecast_mid_high ?? null,
    forecastMid: row.forecast_mid ?? null,
    forecastLow: row.forecast_low ?? null,
    forecastNotes: row.forecast_notes ?? null,
    forecastSources: parseJsonArray(row.forecast_sources_json, isForecastSource),
    policyChain: row.policy_chain_json ?? null,
    industryImpact: row.industry_impact_json ?? null,
    preSignals: row.pre_signals_json ?? null,
    forecastUpdatedAt: row.forecast_updated_at ? (row.forecast_updated_at instanceof Date ? row.forecast_updated_at.toISOString() : String(row.forecast_updated_at)) : null,
  };
}

export type ForecastItem = {
  sourceId: string;
  url: string;
  title: string;
  listPublishedAt: string;
  firstSeenAt: string;
  departmentName: string;
  channelName: string;
  displayName: string;
  importanceLevel: string;
  keywordScore: number;
  summary: string | null;
  documentStatus: string | null;
  hasFunding: boolean;
  hasProcurement: boolean;
  hasPilot: boolean;
  hasStandards: boolean;
  forecastHigh: string | null;
  forecastMidHigh: string | null;
  forecastMid: string | null;
  forecastLow: string | null;
  forecastNotes: string | null;
  forecastSources: Array<{ title: string; url: string; note?: string }> | null;
  forecastUpdatedAt: string | null;
  topCategories: Array<{ category: string; score: number }>;
};

export async function getForecastItems(
  filter: "all" | "forecast" | "signal" | "funding" | "procurement" | "pilot" | "standards" = "all",
  limit = 100,
): Promise<ForecastItem[]> {
  const pool = getPgPool();

  const whereConditions: string[] = [];
  const params: unknown[] = [];

  if (filter === "forecast") {
    whereConditions.push(
      "(forecast_high is not null or forecast_mid_high is not null or forecast_mid is not null or forecast_low is not null)",
    );
  } else if (filter === "signal") {
    whereConditions.push(
      "(has_funding = true or has_procurement = true or has_pilot = true or has_standards = true)",
    );
    whereConditions.push(
      "(forecast_high is null and forecast_mid_high is null and forecast_mid is null and forecast_low is null)",
    );
  } else if (filter === "funding") {
    whereConditions.push("has_funding = true");
  } else if (filter === "procurement") {
    whereConditions.push("has_procurement = true");
  } else if (filter === "pilot") {
    whereConditions.push("has_pilot = true");
  } else if (filter === "standards") {
    whereConditions.push("has_standards = true");
  } else {
    whereConditions.push(
      "(has_funding = true or has_procurement = true or has_pilot = true or has_standards = true or forecast_high is not null or forecast_mid_high is not null or forecast_mid is not null or forecast_low is not null)",
    );
  }

  const whereClause = whereConditions.length > 0 ? `where ${whereConditions.join(" and ")}` : "";

  const res = await pool.query(
    `select mi.source_id,
            mi.url,
            mi.title,
            mi.list_published_at,
            mi.first_seen_at,
            mi.keyword_score,
            mi.importance_level,
            mi.matched_categories,
            mi.document_status,
            mi.has_funding,
            mi.has_procurement,
            mi.has_pilot,
            mi.has_standards,
            mi.forecast_high,
            mi.forecast_mid_high,
            mi.forecast_mid,
            mi.forecast_low,
            mi.forecast_notes,
            mi.forecast_sources_json,
            mi.forecast_updated_at,
            mi.summary,
            coalesce(ms.department_name, '未分类部委') as department_name,
            coalesce(ms.channel_name, mi.source_id) as channel_name,
            coalesce(ms.display_name, concat(coalesce(ms.department_name, '未分类部委'), '·', coalesce(ms.channel_name, ''))) as display_name
     from monitor_items mi
     left join monitor_sources ms on ms.id = mi.source_id
     ${whereClause}
     order by mi.first_seen_at desc
     limit $1`,
    [...params, limit],
  );

  return res.rows.map((row) => {
    let categories: Array<{ category: string; score: number }> = [];
    if (row.matched_categories) {
      try {
        const raw = row.matched_categories;
        const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw));
        if (Array.isArray(parsed)) {
          categories = parsed
            .filter((c) => c && typeof c.category === "string")
            .slice(0, 3)
            .map((c) => ({ category: c.category, score: Number(c.score) || 0 }));
        }
      } catch {}
    }

    const formatDate = (d: unknown): string => {
      if (!d) return "";
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return String(d).slice(0, 10);
    };

    const formatDateFull = (d: unknown): string | null => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString();
      return String(d) || null;
    };

    return {
      sourceId: row.source_id,
      url: row.url,
      title: row.title,
      listPublishedAt: formatDate(row.list_published_at),
      firstSeenAt: row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : String(row.first_seen_at),
      departmentName: row.department_name,
      channelName: row.channel_name,
      displayName: row.display_name,
      importanceLevel: row.importance_level || "普通内容",
      keywordScore: Number(row.keyword_score) || 0,
      summary: row.summary ?? null,
      documentStatus: row.document_status ?? null,
      hasFunding: Boolean(row.has_funding),
      hasProcurement: Boolean(row.has_procurement),
      hasPilot: Boolean(row.has_pilot),
      hasStandards: Boolean(row.has_standards),
      forecastHigh: row.forecast_high ?? null,
      forecastMidHigh: row.forecast_mid_high ?? null,
      forecastMid: row.forecast_mid ?? null,
      forecastLow: row.forecast_low ?? null,
      forecastNotes: row.forecast_notes ?? null,
      forecastSources: row.forecast_sources_json ?? null,
      forecastUpdatedAt: formatDateFull(row.forecast_updated_at),
      topCategories: categories,
    };
  });
}

export type ChannelSectionItem = {
  sourceId: string;
  url: string;
  title: string;
  summary: string | null;
  listPublishedAt: string;
  firstSeenAt: string;
  importanceLevel: string;
  keywordScore: number;
  isStarred: boolean;
  channelName: string;
  displayName: string;
};

export async function getItemsByDepartmentAndChannel(
  departmentName: string,
  channelName: string,
  limit = 50,
): Promise<{ items: ChannelSectionItem[]; todayCount: number; totalCount: number; sourceIds: string[] }> {
  const pool = getPgPool();
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [itemsRes, totalRes, todayRes, sourcesRes] = await Promise.all([
    pool.query(
      `select mi.source_id,
              mi.url,
              mi.title,
              coalesce(left(mi.summary, 220), left(mi.title, 220)) as summary,
              mi.list_published_at,
              mi.first_seen_at,
              mi.importance_level,
              mi.keyword_score,
              mi.is_starred,
              coalesce(ms.channel_name, mi.source_id) as channel_name,
              coalesce(ms.display_name, concat(coalesce(ms.department_name, '未分类部委'), '·', coalesce(ms.channel_name, ''))) as display_name
       from monitor_items mi
       left join monitor_sources ms on ms.id = mi.source_id
       where (ms.department_name = $1 or (ms.department_name is null and $1 = '未分类部委'))
         and coalesce(ms.channel_name, mi.source_id) = $2
       order by mi.list_published_at desc, mi.first_seen_at desc
       limit $3`,
      [departmentName, channelName, limit],
    ),
    pool.query(
      `select count(*) as cnt
       from monitor_items mi
       left join monitor_sources ms on ms.id = mi.source_id
       where (ms.department_name = $1 or (ms.department_name is null and $1 = '未分类部委'))
         and coalesce(ms.channel_name, mi.source_id) = $2`,
      [departmentName, channelName],
    ),
    pool.query(
      `select count(*) as cnt
       from monitor_items mi
       left join monitor_sources ms on ms.id = mi.source_id
       where (ms.department_name = $1 or (ms.department_name is null and $1 = '未分类部委'))
         and coalesce(ms.channel_name, mi.source_id) = $2
         and date(mi.list_published_at) = $3`,
      [departmentName, channelName, todayStr],
    ),
    pool.query(
      `select ms.id
       from monitor_sources ms
       where (ms.department_name = $1 or (ms.department_name is null and $1 = '未分类部委'))
         and coalesce(ms.channel_name, ms.id) = $2
       order by ms.created_at asc`,
      [departmentName, channelName],
    ),
  ]);

  const items: ChannelSectionItem[] = itemsRes.rows.map((row) => ({
    sourceId: row.source_id,
    url: row.url,
    title: row.title,
    summary: row.summary ?? null,
    listPublishedAt: row.list_published_at instanceof Date ? row.list_published_at.toISOString().slice(0, 10) : String(row.list_published_at).slice(0, 10),
    firstSeenAt: row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : String(row.first_seen_at),
    importanceLevel: row.importance_level || "普通内容",
    keywordScore: Number(row.keyword_score) || 0,
    isStarred: Boolean(row.is_starred),
    channelName: row.channel_name,
    displayName: row.display_name,
  }));

  return {
    items,
    totalCount: Number(totalRes.rows[0]?.cnt ?? 0),
    todayCount: Number(todayRes.rows[0]?.cnt ?? 0),
    sourceIds: sourcesRes.rows.map((r) => String(r.id)),
  };
}

export async function getRelatedItemsByItem(params: {
  sourceId: string;
  url: string;
  departmentName: string;
  categories?: string[];
  limit?: number;
}) {
  const pool = getPgPool();
  const limit = params.limit ?? 6;
  const categories = (params.categories ?? []).filter((c) => c && c.length > 0).slice(0, 5);
  const values: unknown[] = [params.sourceId, params.url, params.departmentName, limit];

  const categoryMapForQuery: Record<string, string[]> = {
    "A·AI工具更新": ["A·AI工具更新", "signal_exec", "signal_start", "signal-exec"],
    "B·创作机会": ["B·创作机会", "signal_support", "signal_opportunity", "signal-support"],
    "C·申报截止预警": ["C·申报截止预警", "signal_risk", "security", "signal-risk"],
    "D·行业观察": ["D·行业观察", "signal_explore", "D·行业动态", "signal_pre", "data", "industry", "topic-data", "topic-industry", "signal-explore"],
    "平台政策/版权": ["平台政策/版权", "signal_launch", "regulations", "gov_service", "topic-gov", "topic-regulation", "signal-launch"],
    "AI音乐生成工具": ["AI音乐生成工具", "topic_music", "byte-related", "ai", "byte_related", "topic-ai"],
    "视频/视觉AI工具": ["视频/视觉AI工具", "topic_craft"],
    "流媒体/发行平台": ["流媒体/发行平台", "topic_site", "platform"],
    "音乐比赛/节庆": ["音乐比赛/节庆", "topic_festival"],
    "版权/法律": ["版权/法律", "topic_education", "innovation"],
    "海外市场/国际": ["海外市场/国际", "topic_unesco"],
    "地方/省级/区域": ["地方/省级/区域", "region_general", "region_bjj", "region-bjj"],
    "噪音词汇": ["噪音词汇", "negative"],
  };
  const expandedCategories: string[] = [];
  for (const c of categories) {
    expandedCategories.push(...(categoryMapForQuery[c] ?? [c]));
  }

  const categoryClauses: string[] = [];
  if (expandedCategories.length > 0) {
    const placeholders = expandedCategories.map((_, i) => `$${values.length + i + 1}`).join(",");
    values.push(...expandedCategories);
    categoryClauses.push(
      `exists (select 1 from jsonb_array_elements(case when jsonb_typeof(mi.matched_categories) = 'array' then mi.matched_categories else '[]'::jsonb end) as c where c->>'category' in (${placeholders}))`,
    );
  }
  const whereExtra = categoryClauses.length > 0 ? `and ${categoryClauses.join(" and ")}` : "";
  const res = await pool.query(
    `select distinct on (mi.url)
            mi.source_id,
            mi.url,
            mi.title,
            mi.list_published_at,
            mi.first_seen_at,
            mi.importance_level,
            coalesce(mi.keyword_score, 0) as keyword_score,
            mi.matched_categories,
            coalesce(ms.department_name, '未分类部委') as department_name,
            coalesce(ms.channel_name, mi.source_id) as channel_name,
            coalesce(ms.display_name, concat(coalesce(ms.department_name, '未分类部委'), '·', coalesce(ms.channel_name, ''))) as display_name
     from monitor_items mi
     inner join monitor_sources ms on ms.id = mi.source_id
     where mi.source_id <> $1
       and mi.url <> $2
       and ms.department_name = $3
       and mi.list_published_at >= ms.start_date
       ${whereExtra}
     order by
       mi.url asc,
       case when mi.importance_level in ('核心关注', '加急推荐') then 3
            when mi.importance_level = '重点内容' then 2
            when mi.importance_level = '中等重点' then 1
            else 0 end desc,
       coalesce(mi.keyword_score, 0) desc,
       mi.list_published_at desc
     limit $4`,
    values,
  );
  return res.rows.map((row) => {
    let cats: string[] = [];
    if (row.matched_categories) {
      try {
        const raw = row.matched_categories;
        const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw));
        if (Array.isArray(parsed)) cats = parsed
          .filter((c) => c && typeof (c as { category?: unknown }).category === "string")
          .map((c) => String((c as { category: string }).category));
      } catch {}
    }
    return {
      sourceId: row.source_id,
      url: row.url,
      title: row.title,
      listPublishedAt: row.list_published_at instanceof Date ? row.list_published_at.toISOString().slice(0, 10) : String(row.list_published_at).slice(0, 10),
      firstSeenAt: row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : String(row.first_seen_at),
      importanceLevel: row.importance_level || "普通内容",
      keywordScore: Number(row.keyword_score) || 0,
      departmentName: row.department_name,
      channelName: row.channel_name,
      displayName: row.display_name,
      categories: cats,
    };
  });
}

export async function getSameTopicItems(params: {
  sourceId: string;
  url: string;
  categories?: string[];
  limit?: number;
}) {
  const pool = getPgPool();
  const limit = params.limit ?? 6;
  const categories = (params.categories ?? []).filter((c) => c && c.length > 0).slice(0, 5);

  if (categories.length === 0) {
    return [];
  }

  const values: unknown[] = [params.sourceId, params.url, limit];

  const categoryMapForQuery: Record<string, string[]> = {
    "A·AI工具更新": ["A·AI工具更新", "signal_exec", "signal_start", "signal-exec"],
    "B·创作机会": ["B·创作机会", "signal_support", "signal_opportunity", "signal-support"],
    "C·申报截止预警": ["C·申报截止预警", "signal_risk", "security", "signal-risk"],
    "D·行业观察": ["D·行业观察", "signal_explore", "D·行业动态", "signal_pre", "data", "industry", "topic-data", "topic-industry", "signal-explore"],
    "平台政策/版权": ["平台政策/版权", "signal_launch", "regulations", "gov_service", "topic-gov", "topic-regulation", "signal-launch"],
    "AI音乐生成工具": ["AI音乐生成工具", "topic_music", "byte-related", "ai", "byte_related", "topic-ai"],
    "视频/视觉AI工具": ["视频/视觉AI工具", "topic_craft"],
    "流媒体/发行平台": ["流媒体/发行平台", "topic_site", "platform"],
    "音乐比赛/节庆": ["音乐比赛/节庆", "topic_festival"],
    "版权/法律": ["版权/法律", "topic_education", "innovation"],
    "海外市场/国际": ["海外市场/国际", "topic_unesco"],
    "地方/省级/区域": ["地方/省级/区域", "region_general", "region_bjj", "region-bjj"],
    "噪音词汇": ["噪音词汇", "negative"],
  };
  const expandedCategories: string[] = [];
  for (const c of categories) {
    expandedCategories.push(...(categoryMapForQuery[c] ?? [c]));
  }

  let whereExtra = "";
  if (expandedCategories.length > 0) {
    const placeholders = expandedCategories.map((_, i) => `$${values.length + i + 1}`).join(",");
    values.push(...expandedCategories);
    whereExtra = `and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(mi.matched_categories) = 'array' then mi.matched_categories else '[]'::jsonb end) as c where c->>'category' in (${placeholders}))`;
  }

  const res = await pool.query(
    `select distinct on (mi.url)
            mi.source_id,
            mi.url,
            mi.title,
            mi.list_published_at,
            mi.first_seen_at,
            mi.importance_level,
            coalesce(mi.keyword_score, 0) as keyword_score,
            mi.matched_categories,
            coalesce(ms.department_name, '未分类部委') as department_name,
            coalesce(ms.channel_name, mi.source_id) as channel_name,
            coalesce(ms.display_name, concat(coalesce(ms.department_name, '未分类部委'), '·', coalesce(ms.channel_name, ''))) as display_name
     from monitor_items mi
     inner join monitor_sources ms on ms.id = mi.source_id
     where mi.source_id <> $1
       and mi.url <> $2
       and mi.list_published_at >= ms.start_date
       ${whereExtra}
     order by
       mi.url asc,
       case when mi.importance_level in ('核心关注', '加急推荐') then 3
            when mi.importance_level = '重点内容' then 2
            when mi.importance_level = '中等重点' then 1
            else 0 end desc,
       coalesce(mi.keyword_score, 0) desc,
       mi.list_published_at desc
     limit $3`,
    values,
  );

  return res.rows.map((row) => {
    let cats: string[] = [];
    if (row.matched_categories) {
      try {
        const raw = row.matched_categories;
        const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw));
        if (Array.isArray(parsed)) cats = parsed
          .filter((c) => c && typeof (c as { category?: unknown }).category === "string")
          .map((c) => String((c as { category: string }).category));
      } catch {}
    }
    return {
      sourceId: row.source_id,
      url: row.url,
      title: row.title,
      listPublishedAt: row.list_published_at instanceof Date ? row.list_published_at.toISOString().slice(0, 10) : String(row.list_published_at).slice(0, 10),
      firstSeenAt: row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : String(row.first_seen_at),
      importanceLevel: row.importance_level || "普通内容",
      keywordScore: Number(row.keyword_score) || 0,
      departmentName: row.department_name,
      channelName: row.channel_name,
      displayName: row.display_name,
      categories: cats,
    };
  });
}

export async function getLatestItemsByDepartment(
  departmentName: string,
  excludeUrl?: string,
  limit = 6,
) {
  const pool = getPgPool();
  const values: unknown[] = [departmentName, limit];
  let urlFilter = "";
  if (excludeUrl) {
    values.push(excludeUrl);
    urlFilter = `and mi.url <> $${values.length}`;
  }

  const res = await pool.query(
    `select mi.source_id,
            mi.url,
            mi.title,
            mi.list_published_at,
            mi.first_seen_at,
            mi.importance_level,
            coalesce(mi.keyword_score, 0) as keyword_score,
            coalesce(ms.department_name, '未分类部委') as department_name,
            coalesce(ms.channel_name, mi.source_id) as channel_name,
            coalesce(ms.display_name, concat(coalesce(ms.department_name, '未分类部委'), '·', coalesce(ms.channel_name, ''))) as display_name
     from monitor_items mi
     inner join monitor_sources ms on ms.id = mi.source_id
     where (ms.department_name = $1 or (ms.department_name is null and $1 = '未分类部委'))
       and mi.list_published_at >= ms.start_date
       ${urlFilter}
     order by mi.list_published_at desc, mi.first_seen_at desc
     limit $2`,
    values,
  );

  return res.rows.map((row) => ({
    sourceId: row.source_id,
    url: row.url,
    title: row.title,
    listPublishedAt: row.list_published_at instanceof Date ? row.list_published_at.toISOString().slice(0, 10) : String(row.list_published_at).slice(0, 10),
    firstSeenAt: row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : String(row.first_seen_at),
    importanceLevel: row.importance_level || "普通内容",
    keywordScore: Number(row.keyword_score) || 0,
    departmentName: row.department_name,
    channelName: row.channel_name,
    displayName: row.display_name,
  }));
}

export async function upsertItemDetail(
  sourceId: string,
  url: string,
  data: {
    pageTitle?: string | null;
    paragraphs: string[];
    attachments: Array<{ url: string; text: string; kind: string }>;
    externalLinks?: Array<{ text: string; url: string }>;
    contentQuality: string;
    captureNote: string;
    capturedAtIso: string;
    finalUrl?: string | null;
  },
) {
  const pool = getPgPool();
  const targetUrl = normalizeItemUrl(url);
  const title = data.pageTitle ?? "";
  const deduplicationKey = computeDeduplicationKey(title, data.paragraphs);
  const tags = extractTags(title, data.paragraphs);

  await pool.query(
    `update monitor_items
     set page_title = $3,
         content_json = $4::jsonb,
         content_quality = $5,
         capture_note = $6,
         attachments_json = $7::jsonb,
         external_links_json = $8::jsonb,
         captured_at = $9::timestamptz,
         final_url = $10::text,
         deduplication_key = $11::text,
         extracted_tags_json = $12::jsonb
     where source_id = $1 and url = $2`,
    [
      sourceId,
      targetUrl,
      data.pageTitle ?? null,
      JSON.stringify(data.paragraphs),
      data.contentQuality,
      data.captureNote,
      JSON.stringify(data.attachments),
      JSON.stringify(data.externalLinks ?? []),
      data.capturedAtIso,
      data.finalUrl ?? null,
      deduplicationKey,
      JSON.stringify(tags),
    ],
  );

  const duplicate = await findDuplicateByKey(pool, deduplicationKey, sourceId, targetUrl);
  if (duplicate) {
    await updateItemDuplicateStatus(pool, sourceId, targetUrl, true, `${duplicate.sourceId}|${duplicate.url}`);
    logger.info(`[deduplication] 发现重复: ${sourceId}|${targetUrl} -> ${duplicate.sourceId}|${duplicate.url}`);
  } else {
    await updateItemDuplicateStatus(pool, sourceId, targetUrl, false, null);
  }
}

export type StructuredDates = {
  effectiveFrom: string | null;
  effectiveTo: string | null;
  deadlineDate: string | null;
  allMatches: Array<{ type: string; date: string; raw: string }>;
};

export async function updateItemStructuredDates(
  sourceId: string,
  url: string,
  dates: StructuredDates,
) {
  const pool = getPgPool();
  const targetUrl = normalizeItemUrl(url);
  await pool.query(
    `update monitor_items
     set effective_from = $3::date,
         effective_to = $4::date,
         deadline_date = $5::date,
         extracted_dates_json = $6::jsonb
     where source_id = $1 and url = $2`,
    [
      sourceId,
      targetUrl,
      dates.effectiveFrom ?? null,
      dates.effectiveTo ?? null,
      dates.deadlineDate ?? null,
      JSON.stringify(dates.allMatches),
    ],
  );
}