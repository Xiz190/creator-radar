import { getPgPool } from "@/lib/db";
import { DEFAULT_MONITOR_SOURCES } from "@/lib/monitor/config";
import {
  SCHEMA_ENSURE_TTL_MS,
  SOURCES_SYNC_TTL_MS,
} from "./utils";

let schemaEnsuredAt: number | null = null;
let schemaEnsurePromise: Promise<void> | null = null;
let sourcesSyncedAt: number | null = null;
let sourcesSyncPromise: Promise<void> | null = null;

export async function ensureMonitorSchema() {
  if (process.env.FORCE_MOCK_API === "1" || process.env.FORCE_MOCK_API === "true") return;
  const now = Date.now();
  let needSchema = schemaEnsuredAt === null || now - schemaEnsuredAt >= SCHEMA_ENSURE_TTL_MS;
  let needSources = sourcesSyncedAt === null || now - sourcesSyncedAt >= SOURCES_SYNC_TTL_MS;

  if (!needSchema && !needSources) return;

  if (needSchema && schemaEnsurePromise) {
    await schemaEnsurePromise;
    needSchema = false;
  }
  if (needSources && sourcesSyncPromise) {
    await sourcesSyncPromise;
    needSources = false;
  }
  if (!needSchema && !needSources) return;

  if (needSchema) {
    const schemaPromise = (async () => {
      try {
        await ensureMonitorSchemaInternal();
        schemaEnsuredAt = Date.now();
      } finally {
        setTimeout(() => { schemaEnsurePromise = null; }, 1000);
      }
    })();
    schemaEnsurePromise = schemaPromise;
    await schemaPromise;
  }

  if (needSources) {
    const sourcesPromise = (async () => {
      try {
        await ensureMonitorSourcesInternal();
        sourcesSyncedAt = Date.now();
      } finally {
        setTimeout(() => { sourcesSyncPromise = null; }, 1000);
      }
    })();
    sourcesSyncPromise = sourcesPromise;
    await sourcesPromise;
  }
}

async function ensureMonitorSourcesInternal() {
  const pool = getPgPool();
  for (const src of DEFAULT_MONITOR_SOURCES) {
    try {
      const exist = await pool.query(
        `select id from monitor_sources where id = $1 limit 1`,
        [src.id],
      );
      if (exist.rowCount && exist.rowCount > 0) {
        await pool.query(
          `update monitor_sources
           set department_name = $2,
               channel_group = $3,
               channel_name = $4,
               display_name = $5,
               type = $6,
               list_url = $7,
               start_date = $8::date,
               max_items = $9,
               notes = coalesce($10, notes),
               updated_at = now()
           where id = $1`,
          [
            src.id,
            src.departmentName || "未分类部委",
            src.channelGroup || null,
            src.channelName || "未命名栏目",
            src.displayName || `${src.departmentName || ""}·${src.channelName || ""}`,
            src.type || "mct_szyw",
            src.listUrl,
            src.startDate,
            Number(src.maxItems) || 10,
            src.notes || null,
          ],
        );
      } else {
        await pool.query(
          `insert into monitor_sources (
             id, department_name, channel_group, channel_name, display_name, type, list_url,
             enabled, auto_monitor, is_key, start_date, max_items, notes
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13)`,
          [
            src.id,
            src.departmentName || "未分类部委",
            src.channelGroup || null,
            src.channelName || "未命名栏目",
            src.displayName || `${src.departmentName || ""}·${src.channelName || ""}`,
            src.type || "mct_szyw",
            src.listUrl,
            src.enabled === false ? false : true,
            src.autoMonitor === true ? true : false,
            src.isKey === true ? true : false,
            src.startDate,
            Number(src.maxItems) || 10,
            src.notes || null,
          ],
        );
      }
    } catch {
      // ignore
    }
  }
}

async function ensureMonitorSchemaInternal() {
  const pool = getPgPool();
  await pool.query(`
    create table if not exists monitor_sources (
      id text primary key,
      department_name text not null,
      channel_group text,
      channel_name text not null,
      display_name text not null,
      type text not null,
      list_url text not null,
      enabled boolean not null default true,
      auto_monitor boolean not null default false,
      is_key boolean not null default false,
      start_date date not null,
      max_items integer not null,
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists monitor_runs (
      id text primary key,
      started_at timestamptz not null,
      finished_at timestamptz,
      status text not null,
      error_message text,
      results jsonb
    );
  `);

  // 「交接」：手机端把一条推给桌面端（伴侣版工具栏的 On desktop）。
  //
  // ⚠️ 诚实边界：这是**队列 + 桌面端轮询**，不是 Web Push。
  // 它依赖桌面端的标签页开着；浏览器完全关掉时不会弹出来。
  // 真推送需要 VAPID 密钥 + 推送服务，且 iOS Safari 要求站点先装到主屏——
  // 那是另一个量级的工作，没做。别在文案里说成"随时送达的系统通知"。
  await pool.query(`
    create table if not exists handoffs (
      id bigserial primary key,
      source_id text not null,
      url text not null,
      title text not null,
      created_at timestamptz not null default now(),
      consumed_at timestamptz
    );
  `);
  await pool.query(`
    create index if not exists handoffs_pending_idx
      on handoffs (created_at desc) where consumed_at is null
  `);

  await pool.query(`
    create table if not exists analysis_templates (
      id text primary key,
      name text not null,
      description text,
      category text not null,
      config_json jsonb not null,
      is_active boolean not null default true,
      sort_order integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists chat_logs (
      id text primary key,
      session_id text not null,
      source_id text,
      item_url text,
      user_message text not null,
      assistant_response text not null,
      context_json jsonb,
      created_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists monitor_items (
      source_id text not null,
      url text not null,
      title text not null,
      list_published_at date not null,
      first_seen_at timestamptz not null,
      is_read boolean not null default false,
      is_starred boolean not null default false,
      page_title text,
      content_json jsonb,
      content_quality text,
      capture_note text,
      attachments_json jsonb,
      captured_at timestamptz,
      primary key (source_id, url)
    );
  `);

  try {
    await pool.query(`alter table monitor_sources add column if not exists channel_group text`);
  } catch {
    // ignore
  }
  try {
    await pool.query(`alter table monitor_sources add column if not exists language text not null default 'zh'`);
  } catch {
    // ignore
  }
  try {
    await pool.query(`alter table monitor_sources add column if not exists region text not null default 'domestic'`);
  } catch {
    // ignore
  }
  try {
    await pool.query(`alter table monitor_sources add column if not exists content_category text not null default 'general'`);
  } catch {
    // ignore
  }
  // 来源的英文显示名。display_name 是中文（自己编的标签，不是抓来的内容），
  // 所以英文界面下该有对应的一份——同 lens 的双语思路。
  try {
    await pool.query(`alter table monitor_sources add column if not exists display_name_en text`);
  } catch {
    // ignore
  }

  try {
    await pool.query(`alter table monitor_items add column if not exists channel_group text`);
  } catch {
    // ignore
  }

  const colsToAdd: Array<{ name: string; type: string; default?: string }> = [
    { name: "is_read", type: "boolean", default: "false" },
    { name: "is_starred", type: "boolean", default: "false" },
    { name: "page_title", type: "text" },
    { name: "content_json", type: "jsonb" },
    { name: "content_quality", type: "text" },
    { name: "capture_note", type: "text" },
    { name: "attachments_json", type: "jsonb" },
    { name: "external_links_json", type: "jsonb" },
    { name: "captured_at", type: "timestamptz" },
    { name: "keyword_score", type: "integer", default: "0" },
    { name: "matched_keywords", type: "jsonb" },
    { name: "matched_categories", type: "jsonb" },
    { name: "matched_genres", type: "jsonb" },
    { name: "signal_hits", type: "jsonb" },
    { name: "importance_level", type: "text" },
    // 创作者视角的英文版（中文版 creator_lens 是历史遗留、当年手工加的列，没走这里）。
    // 桌面站按界面语言二选一显示，伴侣版（固定英文）用它。
    // 两份都从原始标题+正文生成，各写各的母语——不是互为翻译。
    { name: "creator_lens_en", type: "text" },
    // 「我的备注」——用户在条目上写的话（伴侣版 Saved 屏的核心，决策 D8）。
    // 单用户场景，所以直接挂在 items 上，不另开表。
    { name: "user_note", type: "text" },
    { name: "summary", type: "text" },
    { name: "effective_from", type: "date" },
    { name: "effective_to", type: "date" },
    { name: "deadline_date", type: "date" },
    { name: "extracted_dates_json", type: "jsonb" },
    { name: "document_status", type: "text" },
    { name: "scope", type: "text" },
    { name: "support_objects", type: "text" },
    { name: "support_tools", type: "text" },
    { name: "constraints", type: "text" },
    { name: "execution_handles", type: "text" },
    { name: "has_funding", type: "boolean", default: "false" },
    { name: "has_procurement", type: "boolean", default: "false" },
    { name: "has_pilot", type: "boolean", default: "false" },
    { name: "has_standards", type: "boolean", default: "false" },
    { name: "forecast_high", type: "text" },
    { name: "forecast_mid_high", type: "text" },
    { name: "forecast_mid", type: "text" },
    { name: "forecast_low", type: "text" },
    { name: "forecast_notes", type: "text" },
    { name: "forecast_sources_json", type: "jsonb" },
    { name: "policy_chain_json", type: "jsonb" },
    { name: "industry_impact_json", type: "jsonb" },
    { name: "pre_signals_json", type: "jsonb" },
    { name: "forecast_updated_at", type: "timestamptz" },
  ];

  for (const col of colsToAdd) {
    try {
      const ddl = col.default
        ? `alter table monitor_items add column if not exists ${col.name} ${col.type} not null default ${col.default}`
        : `alter table monitor_items add column if not exists ${col.name} ${col.type}`;
      await pool.query(ddl);
    } catch {
      // ignore
    }
  }

  const ensureJsonbColumn = async (col: string) => {
    const r = await pool.query(
      `select data_type from information_schema.columns where table_name = 'monitor_items' and column_name = $1`,
      [col],
    );
    if (r.rows[0]?.data_type === "jsonb") return;
    try {
      await pool.query(
        `alter table monitor_items alter column ${col} type jsonb using case when ${col} is null then '[]'::jsonb when ${col} = '' then '[]'::jsonb else ${col}::jsonb end`,
      );
    } catch {
      // ignore
    }
  };

  await ensureJsonbColumn("content_json");
  await ensureJsonbColumn("attachments_json");
  await ensureJsonbColumn("external_links_json");
  await ensureJsonbColumn("policy_chain_json");
  await ensureJsonbColumn("industry_impact_json");
  await ensureJsonbColumn("pre_signals_json");

  try {
    const r = await pool.query(
      `select data_type from information_schema.columns where table_name = 'monitor_items' and column_name = 'captured_at'`,
    );
    if (r.rows[0]?.data_type !== "timestamp with time zone") {
      await pool.query(`alter table monitor_items alter column captured_at type timestamptz using captured_at::timestamptz`);
    }
  } catch {
    // ignore
  }

  await pool.query(`create index if not exists monitor_sources_enabled_idx on monitor_sources(enabled, auto_monitor);`);
  await pool.query(`create index if not exists monitor_items_first_seen_at on monitor_items(first_seen_at desc);`);
  await pool.query(`create index if not exists monitor_items_list_published_at on monitor_items(list_published_at desc);`);
  await pool.query(`create index if not exists monitor_items_is_read on monitor_items(is_read);`);
  await pool.query(`create index if not exists monitor_items_is_starred on monitor_items(is_starred);`);
  await pool.query(`create index if not exists monitor_items_keyword_score on monitor_items(keyword_score desc nulls last);`);
  await pool.query(`create index if not exists monitor_items_document_status on monitor_items(document_status);`);
  await pool.query(`create index if not exists monitor_items_has_funding on monitor_items(has_funding) where has_funding = true;`);
  await pool.query(`create index if not exists monitor_items_has_procurement on monitor_items(has_procurement) where has_procurement = true;`);
  await pool.query(`create index if not exists monitor_items_has_pilot on monitor_items(has_pilot) where has_pilot = true;`);
  await pool.query(`create index if not exists monitor_items_has_standards on monitor_items(has_standards) where has_standards = true;`);
  await pool.query(`create index if not exists monitor_items_importance on monitor_items(importance_level);`);
  await pool.query(`create index if not exists monitor_items_matched_genres on monitor_items using gin(matched_genres);`);

  try {
    await pool.query(`alter table monitor_items add column if not exists department_name text`);
  } catch {}
  try {
    await pool.query(`
      update monitor_items mi
      set department_name = ms.department_name
      from monitor_sources ms
      where mi.source_id = ms.id
        and mi.department_name is null
    `);
  } catch {}
  await pool.query(`create index if not exists monitor_items_department_name on monitor_items(department_name);`);
  await pool.query(`create index if not exists monitor_items_dept_first_seen_idx on monitor_items(department_name, first_seen_at desc);`);

  try {
    await pool.query(`create extension if not exists pg_trgm`);
    await pool.query(`create index if not exists monitor_items_title_trgm_idx on monitor_items using gin (lower(title) gin_trgm_ops);`);
  } catch {
    // ignore
  }

  await pool.query(`create index if not exists monitor_items_importance_first_seen_idx on monitor_items(importance_level, first_seen_at desc);`);
  await pool.query(`create index if not exists monitor_items_starred_first_seen_idx on monitor_items(first_seen_at desc) where is_starred = true;`);
  await pool.query(`create index if not exists monitor_items_unread_first_seen_idx on monitor_items(first_seen_at desc) where is_read = false;`);
  await pool.query(`create index if not exists monitor_items_score_first_seen_idx on monitor_items(keyword_score desc nulls last, first_seen_at desc);`);
  await pool.query(`create index if not exists monitor_items_default_sort_idx on monitor_items(importance_level desc, is_starred desc, keyword_score desc nulls last, first_seen_at desc);`);

  await pool.query(`create index if not exists monitor_items_dept_cover_idx on monitor_items(department_name, first_seen_at desc) include (
    source_id, title, url, list_published_at,
    is_read, is_starred, keyword_score, importance_level,
    matched_categories, matched_genres, matched_keywords,
    signal_hits, effective_from, effective_to, deadline_date
  );`);
  await pool.query(`create index if not exists monitor_items_default_sort_cover_idx on monitor_items(importance_level desc, is_starred desc, keyword_score desc nulls last, first_seen_at desc) include (
    source_id, department_name, title, url, list_published_at,
    is_read, is_starred, keyword_score, importance_level,
    matched_categories, matched_genres, matched_keywords,
    signal_hits, effective_from, effective_to, deadline_date
  );`);

  await pool.query(`
    create table if not exists monitor_keywords (
      id text primary key,
      department_name text not null,
      keyword text not null,
      weight integer not null default 1,
      category text not null default 'general',
      match_mode text not null default 'phrase',
      created_at timestamptz not null default now()
    );
  `);
  try { await pool.query(`alter table monitor_keywords add column if not exists weight integer not null default 1`); } catch {}
  try { await pool.query(`alter table monitor_keywords add column if not exists category text not null default 'general'`); } catch {}
  try { await pool.query(`alter table monitor_keywords add column if not exists match_mode text not null default 'phrase'`); } catch {}
  await pool.query(`create index if not exists monitor_keywords_department_idx on monitor_keywords(department_name);`);
  await pool.query(`create index if not exists monitor_keywords_category_idx on monitor_keywords(category);`);
  await pool.query(`create unique index if not exists monitor_keywords_unique_idx on monitor_keywords(department_name, keyword);`);

  await pool.query(`
    create table if not exists monitor_subscriptions (
      id text primary key,
      user_id text not null default 'default',
      type text not null,
      target text not null,
      target_name text,
      enabled boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`create index if not exists monitor_subscriptions_user_type_idx on monitor_subscriptions(user_id, type);`);
  await pool.query(`create unique index if not exists monitor_subscriptions_user_target_idx on monitor_subscriptions(user_id, type, target);`);

}

export function normalizeItemUrl(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);

    const trackingKeys = new Set([
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "spm", "clickid", "gclid", "fbclid", "from", "ref", "referer", "referrer",
    ]);

    const keys = Array.from(u.searchParams.keys());
    for (const k of keys) {
      if (trackingKeys.has(k.toLowerCase())) u.searchParams.delete(k);
      const v = u.searchParams.get(k);
      if (v === null || v === "") u.searchParams.delete(k);
    }
    u.searchParams.sort();

    let p = u.pathname.replace(/\/+/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    u.pathname = p;

    return u.toString();
  } catch {
    return trimmed;
  }
}

export async function seedDefaultKeywordsIfEmpty() {
  const pool = getPgPool();

  await pool.query(`delete from monitor_keywords where department_name = '__global__'`);

  const shared: Array<{ keyword: string; weight: number; category: string; matchMode: string }> = [];
  const pushList = (kws: string[], weight: number, category: string) => {
    for (const kw of kws) shared.push({ keyword: kw, weight, category, matchMode: "phrase" });
  };
  const pushRegex = (kws: string[], weight: number, category: string) => {
    for (const kw of kws) shared.push({ keyword: kw, weight, category, matchMode: "regex" });
  };

  // ——————————————————————————————————————————
  // A·AI工具更新（最高权重，独立音乐人最需第一时间掌握）
  // ——————————————————————————————————————————
  pushList(
    [
      // AI 音乐生成
      "Suno", "Udio", "Stable Audio", "MusicGen", "AudioCraft", "Riffusion",
      "AI音乐", "AI作曲", "AI生成音乐", "AI伴奏", "AI混音",
      // AI 视频 / 图像
      "Runway", "Pika", "Kling", "Sora", "Lumiere", "Gen-3", "Gen-2",
      "AI视频", "AI生成视频", "文生视频", "图生视频",
      // AI 形象 / 声音
      "HeyGen", "ElevenLabs", "Resemble AI", "AI变声", "AI配音", "声音克隆",
      "数字人", "AI虚拟形象",
      // AI 图像
      "Midjourney", "Stable Diffusion", "DALL-E", "Ideogram", "Adobe Firefly",
      // 通用 AI 工具
      "ChatGPT", "Claude", "Gemini", "AI助手",
    ],
    6,
    "A·AI工具更新",
  );
  pushList(
    [
      "功能更新", "新功能", "版本发布", "版本更新", "重大更新", "全新上线",
      "正式发布", "抢先体验", "内测", "公测", "开放测试",
      "定价调整", "价格变化", "订阅涨价", "订阅降价", "免费额度",
      "API更新", "API发布", "开放API", "开发者文档",
      "模型升级", "算法优化", "生成质量提升",
      "changelog", "release notes", "product update",
    ],
    5,
    "A·AI工具更新",
  );
  pushRegex(
    [
      "v\\d+\\.\\d+",           // 版本号如 v4.0、v2.1
      "\\d+\\.\\d+ (release|update|版本)",
    ],
    5,
    "A·AI工具更新",
  );

  // ——————————————————————————————————————————
  // B·创作机会（比赛、招募、驻留、资助）
  // ——————————————————————————————————————————
  pushList(
    [
      // 比赛/征集
      "音乐比赛", "音乐大赛", "作品大赛", "创作大赛", "词曲大赛",
      "作品征集", "音乐征集", "创作征集", "全球征集",
      "投稿", "投稿通道", "作品投递",
      // 厂牌/合作
      "厂牌招募", "独立厂牌", "发行招募", "艺人招募", "demo征集",
      "寻找原创", "寻找独立音乐人", "合作邀请",
      // 驻留/孵化
      "驻留项目", "音乐驻留", "艺术家驻留", "创作驻留",
      "孵化计划", "音乐孵化", "创作营", "音乐创作营",
      // 资助/基金
      "资助申请", "音乐资助", "创作基金", "艺术基金",
      "奖金", "奖励资金", "项目资金", "申请资金",
      "grant", "funding", "residency", "fellowship",
      // 演出/展演
      "演出征集", "乐队征集", "音乐节征集", "开放报名",
      "乐队大赛", "原创音乐节", "showcase",
    ],
    6,
    "B·创作机会",
  );
  pushList(
    [
      "现正招募", "现开放报名", "征集作品", "欢迎投稿", "接受投稿",
      "开放申请", "接受申请", "线上投递", "扫码报名",
      "competition", "submission", "apply now", "open call",
    ],
    5,
    "B·创作机会",
  );

  // ——————————————————————————————————————————
  // C·申报截止预警（截止日期临近，权重最高）
  // ——————————————————————————————————————————
  pushList(
    [
      "报名截止", "投稿截止", "申请截止", "征集截止", "提交截止",
      "截止日期", "截止时间", "最终截止",
      "最后一天", "最后机会", "即将截止", "倒计时",
      "deadline", "last day", "closing date", "submissions close",
      "closes soon", "final deadline",
    ],
    8,
    "C·申报截止预警",
  );
  pushRegex(
    [
      "截止.*\\d{4}年\\d{1,2}月\\d{1,2}日",
      "deadline[：: ]+\\d{4}",
      "close[sd]? on \\w+ \\d+",
    ],
    8,
    "C·申报截止预警",
  );

  // ——————————————————————————————————————————
  // D·行业动态（流媒体、版权、发行平台）
  // ——————————————————————————————————————————
  pushList(
    [
      // 流媒体平台
      "Spotify", "Apple Music", "YouTube Music", "网易云音乐", "QQ音乐",
      "虾米音乐", "Amazon Music", "Tidal", "Deezer",
      // 发行平台
      "DistroKid", "TuneCore", "CDBaby", "Amuse", "UnitedMasters",
      "发行平台", "独立发行", "数字发行",
      // 版权
      "版权政策", "版权费", "版税", "版权收益", "流媒体版税",
      "版权分成", "收益分配", "royalty", "licensing",
      // 行业数据
      "Billboard", "流媒体数据", "播放量", "独立音乐人收益",
      "音乐行业报告", "音乐市场", "IFPI",
    ],
    4,
    "D·行业观察",
  );

  // ——————————————————————————————————————————
  // 降噪：无关内容
  // ——————————————————————————————————————————
  pushList(
    [
      "广告", "推广", "招商", "赞助商招募", "商业合作咨询",
      "点击领取", "限时优惠", "扫码添加客服",
    ],
    -5,
    "噪音词汇",
  );


  const insertStmt = `
    insert into monitor_keywords (id, department_name, keyword, weight, category, match_mode)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (department_name, keyword) do nothing
  `;
  for (const item of shared) {
    const id = `gbl_${item.category}_${Buffer.from(item.keyword).toString("base64url")}`;
    await pool.query(insertStmt, [id, "__global__", item.keyword, item.weight, item.category, item.matchMode]);
  }
}
