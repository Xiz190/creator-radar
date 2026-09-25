export type Language = "zh" | "en";

const translations = {
  // ── Site ──
  "site.title":        { zh: "创作者雷达",        en: "Creator Radar" },
  "site.title.short":  { zh: "雷达",              en: "Radar" },
  "site.footer":       { zh: "Radar · 创作者雷达",  en: "Radar · Creator Radar" },
  "site.demo-banner":  { zh: "演示模式",         en: "Demo Mode" },
  "site.demo-desc":    { zh: "当前展示模拟数据，可浏览完整功能界面。", en: "Showing demo data. All features are available." },

  // ── Navigation ──
  "nav.workspace":      { zh: "我的工作台",   en: "Workspace" },
  "nav.inbox":          { zh: "动态资讯",     en: "News Feed" },
  "nav.subscribe":      { zh: "关注设置",     en: "Subscriptions" },
  "nav.signals":        { zh: "信号雷达",     en: "Signal Radar" },
  "nav.dashboard":      { zh: "数据趋势",     en: "Dashboard" },
  "nav.monitor":        { zh: "系统管理",     en: "Admin" },
  "nav.notifications":  { zh: "通知",         en: "Alerts" },
  "nav.settings":       { zh: "设置",         en: "Settings" },
  "nav.research":       { zh: "研究",         en: "Research" },
  "nav.forecast":       { zh: "预测",         en: "Forecast" },
  "nav.starred":        { zh: "收藏",         en: "Starred" },

  // ── 手机 → 桌面 交接 ──
  "handoff.arrived":   { zh: "手机发来一条",   en: "Sent from your phone" },
  "handoff.open":      { zh: "打开",          en: "Open" },
  "handoff.dismiss":   { zh: "忽略",          en: "Dismiss" },

  // ── Mobile bottom-nav (short labels) ──
  "nav.tab.workspace":  { zh: "工作台",   en: "Workspace" },
  "nav.tab.inbox":      { zh: "动态资讯", en: "Feed" },
  "nav.tab.signals":    { zh: "信号",     en: "Signals" },
  "nav.tab.monitor":    { zh: "监测",     en: "Monitor" },

  // ── Inbox / Feed page ──
  "inbox.title":       { zh: "动态资讯", en: "News Feed" },
  "inbox.subtitle":    { zh: "全部动态的统一入口，按视图快速切换，支持多维度筛选与检索。", en: "One unified feed — switch views and filter or search across every dimension." },
  "inbox.stat.total":  { zh: "当前内容", en: "Total items" },
  "inbox.stat.unread": { zh: "本页未读", en: "Unread on page" },
  "inbox.stat.key":    { zh: "本页重点 / 核心关注", en: "Key items / Priority" },

  // ── Mobile companion (/m) ──
  "companion.tab.today":        { zh: "今日",       en: "Today" },
  "companion.tab.feed":         { zh: "动态",       en: "Feed" },
  "companion.tab.saved":        { zh: "收藏",       en: "Saved" },

  "companion.brand":            { zh: "创作者雷达",  en: "Creator Radar" },
  "companion.today.ranked":     { zh: "为你排序",    en: "Ranked for you" },
  "companion.today.seeAll":     { zh: "在动态里看全部", en: "See all in Feed" },
  "companion.today.recentlyViewed": { zh: "最近浏览", en: "Recently viewed" },
  "companion.today.recentCount":{ zh: "{n} 条",     en: "{n} items" },
  "companion.stat.unread":      { zh: "{n} 条未读",  en: "{n} unread" },
  "companion.stat.key":         { zh: "{n} 条重点",  en: "{n} key today" },
  "companion.forYou":           { zh: "给你的话",    en: "For you" },
  "companion.empty":            { zh: "这里暂无内容", en: "Nothing here yet" },
  "companion.loading":          { zh: "载入中",      en: "Loading" },
  "companion.error":            { zh: "内容暂时取不到", en: "Couldn't load content" },

  // ── Companion · Feed ──
  "companion.feed.title":       { zh: "动态",         en: "Feed" },
  "companion.feed.all":         { zh: "全部",         en: "All" },
  "companion.feed.following":   { zh: "关注",         en: "Following" },
  "companion.feed.signals":     { zh: "信号",         en: "Signals" },
  "companion.feed.search":      { zh: "搜索",         en: "Search" },
  "companion.feed.loadMoreN":   { zh: "加载更多（{n}/{total}）", en: "Load more ({n}/{total})" },

  // ── Companion · Filters sheet ──
  "companion.filters.title":    { zh: "筛选",         en: "Filters" },
  "companion.filters.reset":    { zh: "重置",         en: "Reset" },
  "companion.filters.scope":    { zh: "范围",         en: "Scope" },
  "companion.filters.show":     { zh: "显示",         en: "Show" },
  "companion.filters.category": { zh: "分类",         en: "Category" },
  "companion.filters.dateRange":{ zh: "日期范围",     en: "Date range" },
  "companion.filters.sort":     { zh: "排序",         en: "Sort" },
  "companion.filters.apply":    { zh: "查看结果",     en: "Show results" },
  "companion.filters.applyN":   { zh: "查看 {n} 条结果", en: "Show {n} results" },
  "companion.filters.startDate":{ zh: "开始日期",     en: "Start date" },
  "companion.filters.endDate":  { zh: "结束日期",     en: "End date" },

  // ── Companion · Detail ──
  "companion.detail.save":          { zh: "收藏",       en: "Save" },
  "companion.detail.saved":         { zh: "已收藏",     en: "Saved" },
  "companion.detail.markRead":      { zh: "标为已读",   en: "Mark read" },
  "companion.detail.markUnread":    { zh: "标为未读",   en: "Mark unread" },
  "companion.detail.onDesktop":     { zh: "发到桌面",   en: "On desktop" },
  "companion.detail.sent":          { zh: "已发送",     en: "Sent" },
  "companion.detail.sendFailed":    { zh: "发送失败",   en: "Send failed" },
  "companion.detail.openOriginal":  { zh: "打开原文",   en: "Open original" },
  "companion.detail.openOn":        { zh: "在 {src} 打开原文", en: "Open original on {src}" },
  "companion.detail.minRead":       { zh: "{n} 分钟读完", en: "{n} min read" },
  "companion.detail.noBody":        { zh: "这条没抓到正文，去点原文看", en: "No body captured for this one — open the original." },

  // ── Companion · Note ──
  "companion.note.add":         { zh: "加备注",     en: "Add note" },
  "companion.note.edit":        { zh: "改备注",     en: "Edit note" },
  "companion.note.save":        { zh: "保存备注",   en: "Save note" },
  "companion.note.cancel":      { zh: "取消",       en: "Cancel" },
  "companion.note.placeholder": { zh: "写给自己一句…", en: "A line for yourself…" },

  // ── Companion · Filters · option labels ──
  "companion.opt.scope.all":    { zh: "全部",         en: "All" },
  "companion.opt.scope.cn":     { zh: "国内",         en: "China" },
  "companion.opt.scope.global": { zh: "全球",         en: "Global" },
  "companion.opt.unreadOnly":   { zh: "仅未读",       en: "Unread only" },
  "companion.opt.keyOnly":      { zh: "仅重点",       en: "Key only" },
  "companion.opt.cat.all":      { zh: "全部",         en: "All" },
  "companion.opt.cat.tools":    { zh: "工具",         en: "Tools" },
  "companion.opt.cat.opps":     { zh: "机会",         en: "Opportunities" },
  "companion.opt.cat.deadlines":{ zh: "截止",         en: "Deadlines" },
  "companion.opt.cat.policy":   { zh: "政策",         en: "Policy" },
  "companion.opt.sort.latest":  { zh: "最新",         en: "Latest" },
  "companion.opt.sort.relevance":{ zh: "相关度",      en: "Relevance" },
  "companion.opt.sort.firstSeen":{ zh: "首次发现",    en: "First seen" },

  // ── Greeting ──
  "greeting.latenight":  { zh: "夜深了",  en: "Late night" },
  "greeting.earlymorning":{ zh: "早上好", en: "Good morning" },
  "greeting.morning":    { zh: "上午好",  en: "Good morning" },
  "greeting.noon":       { zh: "中午好",  en: "Good noon" },
  "greeting.afternoon":  { zh: "下午好",  en: "Good afternoon" },
  "greeting.evening":    { zh: "晚上好",  en: "Good evening" },

  // ── Home page hero ──
  "home.loading.title":  { zh: "正在加载今日数据",   en: "Loading today's data" },
  "home.loading.sub":    { zh: "正在同步最新动态...", en: "Syncing latest updates..." },
  "home.today-updates":  { zh: "今天有 {n} 条新动态",en: "{n} new updates today" },
  "home.priority-note":  { zh: "其中 {n} 条值得重点关注，已为你智能排序", en: "{n} worth your attention, sorted by relevance" },

  // ── Home page stat cards ──
  "home.stat.new-label":    { zh: "今日新增",  en: "New Today" },
  "home.stat.new-unit":     { zh: "条动态更新", en: "updates" },
  "home.stat.priority-label": { zh: "高优先级",  en: "High Priority" },
  "home.stat.priority-unit":  { zh: "条重点内容", en: "priority items" },

  // ── Home page quick links ──
  "home.link.signals":       { zh: "浏览信号雷达",            en: "Signal Radar" },
  "home.link.signals-desc":  { zh: "按信号类型发现AI工具更新和创作机会", en: "Discover AI tool updates and creative opportunities" },
  "home.link.research":      { zh: "打开我的研究",            en: "Open Research" },
  "home.link.research-desc": { zh: "收藏、待跟进、备注、对比",  en: "Starred, follow-ups, notes, compare" },

  // ── Workspace tabs ──
  "tabs.followup":    { zh: "待我处理", en: "Follow-ups" },
  "tabs.today":       { zh: "今日重点", en: "Today" },
  "tabs.starred":     { zh: "我的收藏", en: "Starred" },
  "tabs.empty.followup": { zh: "暂无待处理的内容", en: "Nothing to follow up" },
  "tabs.empty.followup-sub": { zh: "标记待跟进的内容，这里会自动汇总", en: "Mark items as follow-up and they'll appear here" },
  "tabs.empty.today":     { zh: "今日暂无重点内容",  en: "No highlights today" },
  "tabs.empty.today-sub": { zh: "高优先级内容会自动出现在这里", en: "High-priority items will appear here automatically" },
  "tabs.empty.starred":     { zh: "暂无收藏的内容", en: "No starred items yet" },
  "tabs.empty.starred-sub": { zh: "收藏重点内容，方便随时回看", en: "Star important items to revisit them anytime" },
  "tabs.followup.hint": { zh: "关注的来源或关键词有新动态时，会在这里提醒你", en: "New updates from your followed sources and keywords will appear here" },
  "tabs.today.count":  { zh: "今日有 {n} 条动态与你的关注相关", en: "{n} updates match your subscriptions today" },
  "tabs.today.sources": { zh: "来自你关注的 {d} 个来源和 {k} 个关键词", en: "from {d} sources and {k} keywords you follow" },
  "tabs.today.setup":  { zh: "设置关注，让重要动态主动找到你", en: "Set up subscriptions to stay informed" },
  "tabs.today.setup-sub": { zh: "关注来源和关键词后，相关内容会优先展示和提醒", en: "Follow sources and keywords to get relevant updates first" },

  // ── Accessibility panel ──
  "a11y.title":             { zh: "辅助功能",   en: "Accessibility" },
  "a11y.fontSize":          { zh: "字体大小",   en: "Font Size" },
  "a11y.fontSize.sm":       { zh: "小",         en: "S" },
  "a11y.fontSize.md":       { zh: "中",         en: "M" },
  "a11y.fontSize.lg":       { zh: "大",         en: "L" },
  "a11y.fontSize.xl":       { zh: "超大",       en: "XL" },
  "a11y.darkMode":          { zh: "深色模式",   en: "Dark Mode" },
  "a11y.darkMode.system":   { zh: "跟随系统",   en: "System" },
  "a11y.darkMode.light":    { zh: "浅色",       en: "Light" },
  "a11y.darkMode.dark":     { zh: "深色",       en: "Dark" },
  "a11y.highContrast":      { zh: "高对比度",   en: "High Contrast" },
  "a11y.reducedMotion":     { zh: "减少动画",   en: "Reduce Motion" },
  "a11y.language":          { zh: "界面语言", en: "Interface Language" },
  "a11y.language.note":     { zh: "仅切换固定界面文字和 AI 助手语言，动态内容保持原始语言", en: "Switches static UI text and AI replies only. Dynamic content remains in its original language." },
  "a11y.reset":             { zh: "重置默认",   en: "Reset" },

  // ── Workspace followup stat badge ──
  "home.stat.followup-label": { zh: "待跟进",  en: "Follow-ups" },
  "home.stat.followup-unit":  { zh: "条需处理", en: "items" },
  "home.stat.followup-done":  { zh: "全部完成", en: "All done!" },

  // ── Brief card ──
  "home.brief.title":   { zh: "今日情报速览",  en: "Today's Signals" },
  "home.brief.viewall": { zh: "查看全部信号 →", en: "All signals →" },

  // ── Notification card ──
  "notif.title":    { zh: "新提醒",     en: "Alerts" },
  "notif.empty":    { zh: "暂无",       en: "None" },
  "notif.setup":    { zh: "去设置关注 →", en: "Set up →" },
  "notif.viewall":  { zh: "查看全部 →", en: "View all →" },
  "notif.unread":   { zh: "条未读",     en: "unread" },

  // ── Workspace tab view-all / nav links ──
  "tabs.viewall.followup": { zh: "查看全部待跟进 →",  en: "View all follow-ups →" },
  "tabs.viewall.today":    { zh: "浏览全部信号雷达 →", en: "Browse all signals →" },
  "tabs.viewall.starred":  { zh: "查看全部收藏 →",    en: "View all starred →" },
  "tabs.goto.inbox":       { zh: "去动态资讯看看 →",  en: "Browse News Feed →" },
  "tabs.subscribe.btn":    { zh: "去设置 →",          en: "Set up →" },
  "tabs.today.view-btn":   { zh: "查看 →",            en: "View →" },

  // ── Item action buttons ──
  "tabs.item.add-read":    { zh: "加入待读",   en: "Add to Queue" },
  "tabs.item.added-read":  { zh: "已加入待读", en: "In Queue" },
  "tabs.item.clear":       { zh: "清除",       en: "Remove" },
  "tabs.item.updated":     { zh: "更新于",     en: "Updated" },

  // ── Common ──
  "common.on":   { zh: "开", en: "On" },
  "common.off":  { zh: "关", en: "Off" },
  "common.more": { zh: "更多", en: "More" },
} satisfies Record<string, Record<Language, string>>;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language, vars?: Record<string, string | number>): string {
  let str = translations[key]?.[lang] ?? translations[key]?.["zh"] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

export function useT(lang: Language) {
  return (key: TranslationKey, vars?: Record<string, string | number>) => t(key, lang, vars);
}
