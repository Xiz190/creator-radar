import { mockDelay, getMockDelayMs } from "@/lib/mock";
import type { ForecastItem, ForecastStats } from "./types";

export { mockDelay, getMockDelayMs };
export type { MockArticle };

type MockArticle = {
  title: string;
  dept: string;
  channel: string;
  url: string;
  summary: string;
  paragraphs: string[];
  region: "domestic" | "global";
};

const MOCK_ARTICLES: MockArticle[] = [
  {
    title: "Suno v4.5 重大更新：支持人声克隆与实时歌词编辑，定价结构同步调整",
    dept: "Suno Blog",
    channel: "AI工具更新",
    url: "https://blog.suno.ai/suno-v4-5-major-update",
    region: "global" as const,
    summary: "Suno 发布 v4.5 版本，新增人声克隆（Voice Clone）功能，用户可上传10秒参考音频生成专属音色；实时歌词编辑器支持逐行时间轴调整；定价同步上调，Pro 计划月费从 $10 升至 $15。",
    paragraphs: [
      "Suno 今日正式发布 v4.5 版本，带来三项核心功能更新，标志着 AI 音乐生成进入“个性化音色\”时代。",
      "人声克隆（Voice Clone）：用户只需上传 10 秒以上的清晰人声样本，Suno 即可生成与该音色高度相似的 AI 演唱版本。隐私政策规定，克隆音色仅可用于个人创作，不得商业化分发。",
      "实时歌词编辑器：新界面支持逐行拖拽调整时间轴，每个小节可单独修改韵脚和音节，生成后仍可继续微调，大幅降低返工率。",
      "定价调整：Pro 计划月费由 $10 升至 $15，Premier 由 $30 升至 $40。存量用户锁价至2026年3月，新用户即日起执行新价格。",
      "开发者 API 同步更新，新增 voice_clone_id 参数，支持将克隆音色嵌入批量生成工作流。",
    ],
  },
  {
    title: "【截止预警】草莓音乐节2026新人乐队招募报名本周五截止",
    dept: "秀动/大麦",
    channel: "创作机会",
    url: "https://www.strawberrymusicfestival.com/2026/apply",
    region: "domestic" as const,
    summary: "草莓音乐节2026北京/上海/广州三地新人乐队报名本周五（8月9日）截止，提供演出费、住宿及曝光资源，需提交Demo和乐队简介。",
    paragraphs: [
      "草莓音乐节2026全国巡演新人乐队征集活动将于本周五8月9日23:59截止报名，目前已收到超过400支乐队投递。",
      "本届招募覆盖北京（草莓农场主舞台）、上海（世博公园）、广州（广钢新城）三站，每站录取10支新人乐队，演出时长45分钟。",
      "入选待遇：演出费5000-15000元（视站点和场次），提供双人住宿和餐饮，演出视频版权归乐队所有，官方渠道同步宣发。",
      "报名材料：Demo（不少于2首完整作品，SoundCloud/网易云链接均可）、乐队简介（500字内）、成员照片、往期演出视频（选填）。",
      "评审团由草莓音乐节艺术总监、独立厂牌A&R及乐评人组成，结果将于8月20日前通知入选乐队。",
    ],
  },
  {
    title: "Runway Gen-4 正式发布：视频生成时长延至2分钟，MV制作流程全面升级",
    dept: "Runway",
    channel: "AI工具更新",
    url: "https://runwayml.com/blog/introducing-gen-4",
    region: "global" as const,
    summary: "Runway Gen-4 正式上线，单次生成视频时长从10秒提升至2分钟，新增镜头语言控制、场景连贯性保持和音乐节拍对齐三项功能，对MV制作工作流影响显著。",
    paragraphs: [
      "Runway 正式发布第四代视频生成模型 Gen-4，在生成时长、镜头控制和场景连贯性方面实现重大突破。",
      "最大单次生成时长从10秒提升至120秒（2分钟），配合自动场景拼接功能，理论上可生成任意时长视频，为MV制作提供了端到端的可能性。",
      "新增“音乐节拍对齐\”功能：上传音频轨道后，Gen-4 会自动分析鼓点、律动变化，在对应时间点产生视觉切换或动效，替代了此前需要手动逐帧对齐的操作。",
      "镜头语言控制：支持指定推拉摇移、景别（全景/中景/近景/特写）及运镜速度，提示词中加入镜头参数即可生效。",
      "标准计划（$15/月）用户每月获得750积分，Gen-4 标准分辨率消耗5积分/秒；Ultra 计划（$35/月）不限量使用低分辨率版本。",
    ],
  },
  {
    title: "DistroKid 新增AI音乐标注政策：未标注者将面临下架风险",
    dept: "行业媒体",
    channel: "行业观察",
    url: "https://distrokid.com/blog/ai-music-disclosure-policy",
    region: "global" as const,
    summary: "DistroKid 宣布自9月1日起强制要求所有上传作品标注AI生成比例，未标注或虚假标注者将面临作品下架及账号封禁，各大流媒体平台将同步接收标注数据。",
    paragraphs: [
      "DistroKid 于官方博客宣布新的AI音乐披露政策，将于2026年9月1日正式执行，影响平台超过1200万创作者账号。",
      "核心要求：上传时须在元数据中注明作品是否包含AI生成内容（人声、器乐、混音）及大致比例（0%/部分/全部）。现有作品需在8月31日前完成补充标注。",
      "违规后果：首次违规收到警告并要求72小时内整改；二次违规下架该作品；三次违规封禁账号。申诉通道维持原有流程。",
      "Spotify、Apple Music、YouTube Music 已确认将接入 DistroKid 的标注数据，并在各自平台上展示“AI参与\”标识，但暂不影响推荐算法权重。",
      "独立音乐人协会（A2IM）表示支持该政策，但呼吁平台统一标注标准，避免不同分销商之间的定义分歧造成执行混乱。",
    ],
  },
  {
    title: "【创作机会】音乐人驻留项目招募：上海国际艺术节提供3个月驻留名额",
    dept: "秀动/大麦",
    channel: "创作机会",
    url: "https://www.sh-festival.com/residency-2026",
    region: "domestic" as const,
    summary: "上海国际艺术节2026创作驻留项目面向独立音乐人开放招募，提供3个月驻留空间、2万元创作资助及专场演出机会，截止日期9月30日。",
    paragraphs: [
      "上海国际艺术节宣布开放2026年度创作驻留项目（Music Residency），面向35岁以下独立音乐人招募，名额共6席。",
      "驻留内容：2026年11月-2027年1月，提供上海市中心独立创作空间（含录音室、排练厅），全程2万元创作资助，分两期发放。",
      "配套资源：驻留期间可申请使用节日品牌进行联合宣传；驻留结束后在国际艺术节主会期举办专场演出（小剧场，约300座）。",
      "申请条件：已发行不少于1张EP或专辑；有完整的创作规划书（中/英文均可）；能在驻留期间在上海完成驻地创作。",
      "申请方式：发送作品集、创作规划书至官方邮箱，截止9月30日，初审结果11月初公布。",
    ],
  },
  {
    title: "Spotify 2025算法报告：短片段（<90秒）播放次数不再计入流媒体收益",
    dept: "行业媒体",
    channel: "行业观察",
    url: "https://newsroom.spotify.com/2025-royalty-threshold-update",
    region: "global" as const,
    summary: "Spotify 正式确认，自2026年1月起，时长低于90秒的曲目播放量不计入版税结算，此举预计影响约12%的现有曲库，以遏制AI批量生成短音频刷流行为。",
    paragraphs: [
      "Spotify 在2025年年度创作者报告中正式确认“90秒门槛\”政策，并将于2026年1月1日起全平台执行。",
      "政策细节：曲目总时长须≥90秒，且单次完整播放须≥30秒，方可计入版税池；两项条件须同时满足。原有“30秒门槛\”规则不变，仅新增时长下限。",
      "背景：平台2024年检测到大量AI生成短音频（30-89秒）账号通过机器人刷流套取版税，整体规模估计超过全年版税池的0.8%。",
      "影响评估：Spotify 数据显示约12%的现有曲库（约1.2亿首）时长低于90秒，但其中绝大多数（约85%）播放量本身极低，实际版税损失集中在约5000个账号。",
      "建议：独立音乐人制作的单曲、间奏曲、环境音乐如时长较短，可考虑在发行前延长至90秒以上，或拼接为合辑形式上传。",
    ],
  },
  {
    title: "HeyGen 2.5版本：数字形象口型同步精度提升40%，支持多语言实时翻译",
    dept: "Runway",
    channel: "AI工具更新",
    url: "https://heygen.com/blog/heygen-2-5-release",
    region: "global" as const,
    summary: "HeyGen 发布 2.5 版本，口型同步精度大幅提升，新增30种语言实时翻译配音，对需要制作多语言MV或推广视频的独立音乐人具有较强实用价值。",
    paragraphs: [
      "HeyGen 正式发布 2.5 版本，核心改进集中在数字形象的口型同步和多语言翻译配音两个方向。",
      "口型同步精度：通过升级的唇形预测模型（Lip Sync 3.0），在正面和侧面角度的口型还原精度均提升约40%，尤其在快速演唱段落表现更自然。",
      "多语言实时翻译：上传一段中文或英文视频后，系统可自动生成30种语言的配音版本，同时保留原始说话者的音色特征，适合制作多语言宣传片。",
      "对音乐创作者的应用：可将中文歌词MV自动转换为英语/日语/韩语配音版本，降低海外推广制作成本；也可用于制作Lyric Video、演出花絮的多语言字幕版。",
      "定价：基础翻译功能包含在 Business 计划（$89/月）中；超过30分钟/月的用量按 $2/分钟 计费。",
    ],
  },
  {
    title: "【申报截止】文化和旅游部独立音乐人资助基金Q3轮次：8月31日截止",
    dept: "行业媒体",
    channel: "行业观察",
    url: "https://www.mct.gov.cn/zx/ssgs/202608/t20260801_indie-music-fund.htm",
    region: "domestic" as const,
    summary: "文化和旅游部独立音乐人专项资助基金2026年Q3轮次申报窗口将于8月31日关闭，单项资助额度5-20万元，重点支持原创专辑制作、巡演启动及海外推广项目。",
    paragraphs: [
      "文化和旅游部艺术司发布通知，独立音乐人专项资助基金2026年第三季度申报通道将于2026年8月31日17:00截止，请有意向的创作者尽快提交材料。",
      "资助方向：① 原创专辑制作（含录音、混音、母带）；② 全国巡演启动（含制作、宣发、场地押金）；③ 海外音乐节参演及推广。",
      "资助额度：单项5-20万元，按项目预算的60%给予配套资助，其余40%须申请人自筹，项目完成后结算尾款。",
      "申报条件：申请人须为中国大陆独立音乐人（不隶属于唱片公司或经纪公司），过去3年内有公开发行作品，无税务违规记录。",
      "材料提交：通过全国艺术基金信息管理系统在线申报，纸质材料邮寄至各省文旅厅汇总后统一上报，具体联系方式见各省公告。",
    ],
  },
  {
    title: "Pika 1.5 更新：新增音乐驱动视觉节拍同步功能",
    dept: "Runway",
    channel: "AI工具更新",
    url: "https://pika.art/blog/pika-1-5-music-driven",
    region: "global" as const,
    summary: "Pika 1.5 上线音乐驱动模式（Music-Driven Mode），用户上传音频后系统自动识别鼓点与节拍变化，生成与音乐律动同步的视觉动效，专为MV创作设计。",
    paragraphs: [
      "Pika 正式发布 1.5 版本，重点功能“音乐驱动模式\”（Music-Driven Mode）专为音乐视频创作场景设计，是其在音乐行业垂直化的重要信号。",
      "功能原理：系统对上传音频进行节拍分析，提取 BPM、能量峰值、音色转变点等特征，将这些时间节点映射为视觉画面切换、颜色渐变或运镜变化的触发点。",
      "用户操作流程：上传音频（支持 MP3/WAV/FLAC）→ 选择视觉风格模板（抽象/写实/MV风格等）→ 预览节拍对齐效果 → 微调节点后导出4K视频。",
      "与 Runway 的差异：Pika 侧重“音频→视觉\”的自动映射，操控颗粒度相对粗；Runway Gen-4 提供更精细的镜头语言控制，但需要更多手动配置。两者适用场景有所不同。",
      "定价：Music-Driven Mode 包含在 Standard 计划（$8/月）中，导出时长上限为3分钟；Extended 计划（$20/月）不限时长并支持商业授权。",
    ],
  },
  {
    title: "迷笛音乐节2026阵容招募正式开放，独立乐队可投递Demo",
    dept: "秀动/大麦",
    channel: "创作机会",
    url: "https://www.midifestival.com/2026/band-apply",
    region: "domestic" as const,
    summary: "迷笛音乐节2026全国四城巡演开放乐队报名，提供演出费、住宿及媒体曝光，重点扶持首次参加音乐节的新人乐队，截止日期9月15日。",
    paragraphs: [
      "迷笛音乐节官方宣布，2026年全国四城巡演（北京、成都、深圳、武汉）正式启动乐队招募，接受独立乐队Demo投递。",
      "招募对象：以原创音乐为主的独立乐队，2人以上编制，风格不限（摇滚、电子、民谣、说唱均可），鼓励首次参加音乐节的新人乐队报名。",
      "演出条件：演出时长30-60分钟，设备由主办方提供（吉他音箱/鼓组），乐手自带乐器；演出费2000-8000元（视舞台级别），住宿统一安排。",
      "投递材料：Demo（2首完整作品，SoundCloud/网易云链接）、乐队简介（含风格、组建时间、现场演出经历）、成员照片一张。",
      "时间节点：报名截止9月15日，入围通知10月初发出，正式演出档期2027年4-6月。投递邮箱：band@midifestival.com。",
    ],
  },
  {
    title: "Apple Music 宣布提高独立音乐人版税比例至20%，无需分销商",
    dept: "行业媒体",
    channel: "行业观察",
    url: "https://artists.apple.com/support/apple-music-for-artists-royalty-update",
    region: "global" as const,
    summary: "Apple Music 宣布推出独立音乐人直接分发通道，绕过传统分销商可获得20%版税分成（较传统渠道高出约5-8%），需通过 Apple Music for Artists 完成身份认证。",
    paragraphs: [
      "Apple Music 在 WWDC 2026 开发者大会上宣布面向独立音乐人的新版税政策，允许通过官方渠道直接上传并获得更高版税分成。",
      "版税比例：通过 Apple Music 直接分发渠道（Direct Upload），版税比例提升至收入的20%，高于经 DistroKid/TuneCore 等分销商的12-15%（分销商抽成后的实际到手比例）。",
      "准入门槛：Apple Music for Artists 账号需完成实名认证，历史发行作品须有合法版权归属记录，无内容侵权记录。",
      "局限性：直接分发功能暂不覆盖 Spotify、YouTube Music 等其他平台，需要多平台发行的音乐人仍需配合传统分销商；物理专辑及黑胶不在此政策范围内。",
      "开通方式：前往 Apple Music for Artists → Distribution Settings → Apply for Direct Upload，审核周期约2-3个工作日。",
    ],
  },
  {
    title: "Udio 推出合作模式：支持多用户实时共同编辑AI生成伴奏",
    dept: "Suno Blog",
    channel: "AI工具更新",
    url: "https://www.udio.com/blog/collab-mode-launch",
    region: "global" as const,
    summary: "Udio 上线实时合作模式，多位创作者可同时在同一项目中调整AI生成伴奏，并附带版本历史和角色权限管理，是首个支持实时多人协作的AI音乐生成平台。",
    paragraphs: [
      "AI 音乐生成平台 Udio 正式推出实时多人协作模式（Collab Mode），成为同类平台中首个支持多用户同时编辑的产品。",
      "核心功能：最多8位用户可同时在同一项目中进行操作，包括调整风格提示词、修改人声/器乐权重、选择段落变体等；实时同步延迟控制在200ms以内。",
      "权限管理：项目创建者为“Owner\”，可邀请\“Editor\”（可修改）和\“Viewer\”（只读）角色，适合乐队、制作团队或教学场景。",
      "版本历史：系统自动记录每次修改，支持回滚至任意历史节点，防止多人协作时误操作导致内容丢失。",
      "商业授权：合作模式生成的内容版权默认归所有参与者共同所有，可在导出时自定义版权协议（需 Pro 计划）。",
    ],
  },
  {
    title: "【行业报告】2025年Q1 AI辅助音乐发行数据：独立厂牌份额首次超40%",
    dept: "行业媒体",
    channel: "行业观察",
    url: "https://www.midiaresearch.com/reports/ai-music-q1-2025-indie-label-share",
    region: "global" as const,
    summary: "MIDiA Research 2025年Q1报告显示，AI工具辅助制作的音乐中独立厂牌（含个人音乐人）份额首次超过40%，超越三大主流厂牌联合份额，标志着AI赋能独立音乐生产力的结构性变化。",
    paragraphs: [
      "音乐产业研究机构 MIDiA Research 发布2025年Q1全球录制音乐市场报告，首次将AI辅助创作占比作为独立统计维度纳入分析。",
      "核心数据：2025年Q1，标注含AI辅助创作（人声/制作/混音任一环节）的新发行曲目中，独立厂牌及个人音乐人占比达41.2%，首次超过环球（23.4%）、索尼（19.7%）、华纳（15.7%）三家合计的58.8%。",
      "背景分析：独立音乐人对AI工具的接受度更高，采用周期更短；头部唱片公司受版权风险顾虑，AI创作政策相对保守，内部流程冗长。",
      "流媒体表现：AI辅助独立音乐的平均跳过率（Skip Rate）为38%，略高于全平台均值35%，但头部10%作品的跳过率仅28%，说明内容质量分化较大。",
      "展望：MIDiA 预测2025年全年独立音乐在AI辅助创作中的份额有望达到45%，但版税池稀释问题和平台算法偏好调整或成为制约增长的主要变量。",
    ],
  },
  {
    title: "YouTube Music 更新内容政策：AI生成音乐需在元数据中强制披露",
    dept: "行业媒体",
    channel: "行业观察",
    url: "https://blog.youtube/news/ai-generated-music-disclosure-policy",
    region: "global" as const,
    summary: "YouTube 宣布自2026年10月起，上传至 YouTube Music 的AI生成或AI辅助音乐须在元数据中标注，平台将通过自动检测+人工审核双机制执行，违规作品将被标注或下架。",
    paragraphs: [
      "YouTube 官方博客宣布，YouTube Music 将于2026年10月1日起实施AI音乐内容披露政策，要求创作者在上传时主动申报AI参与程度。",
      "披露分级：① AI全自动生成（人声+编曲均由AI完成）；② AI辅助生成（部分AI，部分人工）；③ 人工创作（AI工具仅用于后期处理，如AI混音/母带）。不同分级将在播放页面显示不同标识。",
      "检测机制：平台部署AudioGen检测模型，自动识别AI生成特征；对于检测结果与申报不一致的作品，转人工审核。初次不一致给予7天整改窗口，复查后仍不一致则强制添加平台标注。",
      "版税影响：当前披露状态不影响版税分成比例，但 YouTube 表示“未来可能根据内容性质调整算法推荐权重\”，预示后续政策可能进一步演进。",
      "创作者建议：即便AI参与比例很低（如仅使用AI混音），也建议选择“AI辅助\”而非\“人工创作\”申报，以规避平台自动检测误判带来的处罚风险。",
    ],
  },
  {
    title: "秀动开放驻演品牌合作招募，提供演出曝光+创作资助双通道",
    dept: "秀动/大麦",
    channel: "创作机会",
    url: "https://www.showstart.com/artist/residency-brand-2026",
    region: "domestic" as const,
    summary: "秀动平台与多个音乐品牌合作推出“驻演计划\”，为独立音乐人提供每月2-4场演出机会、品牌联名曝光及最高3万元创作资助，报名截止9月20日。",
    paragraphs: [
      "秀动平台宣布与 Fender、Roland、铁三角等音乐器材品牌合作，推出2026年度“驻演计划\”，面向独立音乐人开放报名。",
      "驻演内容：入选音乐人每月在合作场馆（北京愚公移山、上海育音堂等）演出2-4场，场次由双方协商确定；品牌在演出期间提供器材赞助和现场视觉支持。",
      "资助结构：基础补贴2000元/场（含场地费）；创作资助最高3万元，用于录音/EP制作，需在驻演结束后6个月内完成并在秀动平台首发。",
      "曝光资源：秀动平台首页驻演专区展示（月UV约500万）；品牌官方社交媒体（合计粉丝约200万）同步宣推；演出视频版权归音乐人所有。",
      "申请方式：秀动App → 音乐人中心 → 驻演计划 → 提交资料，截止9月20日；也可扫描海报二维码投递，审核结果10月10日前通知。",
    ],
  },
];

const MOCK_TITLES = MOCK_ARTICLES.map((a) => a.title);
const MOCK_DEPARTMENTS = ["Suno Blog", "Runway", "秀动/大麦", "行业媒体"];
const MOCK_DEPARTMENTS_WITH_COUNT = MOCK_DEPARTMENTS.map((name, i) => ({
  departmentName: name,
  count: [120, 85, 43, 67][i] ?? 50,
}));
const MOCK_CHANNELS = ["AI工具更新", "创作机会", "平台动态", "行业观察"];
const MOCK_GENRES = ["更新公告", "招募公告", "平台通知", "行业报告", "数据分析"];
const MOCK_IMPORTANCE_LEVELS = ["核心关注", "重点内容", "普通内容"];

const MOCK_SIGNAL_CATEGORIES = [
  "A·AI工具更新",
  "B·创作机会",
  "C·申报截止预警",
  "D·行业观察",
  "平台政策/版权",
];

const MOCK_TOPIC_CATEGORIES = [
  "AI音乐生成工具",
  "视频/视觉AI工具",
  "流媒体/发行平台",
  "音乐比赛/节庆",
  "版权/法律",
  "海外市场/国际",
];

const MOCK_KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  "A·AI工具更新": ["新功能", "版本更新", "定价调整", "正式发布", "重大更新"],
  "B·创作机会": ["招募", "驻留", "报名", "资助", "投递"],
  "C·申报截止预警": ["截止", "报名截止", "本周五", "最后机会", "截止日期"],
  "D·行业观察": ["行业报告", "数据", "市场趋势", "份额", "算法"],
  "平台政策/版权": ["政策", "版权", "下架", "合规", "标注"],
  "AI音乐生成工具": ["Suno", "Udio", "Stable Audio", "AI生成", "人声克隆"],
  "视频/视觉AI工具": ["Runway", "Pika", "HeyGen", "MV制作", "数字形象"],
  "流媒体/发行平台": ["Spotify", "Apple Music", "DistroKid", "流媒体", "版税"],
  "音乐比赛/节庆": ["草莓音乐节", "迷笛", "招募", "新人乐队", "演出"],
  "版权/法律": ["版权", "授权", "AI生成", "披露", "合规"],
  "海外市场/国际": ["国际", "海外", "出海", "跨文化", "全球"],
};

export { MOCK_ARTICLES };

export function generateMockItems(count: number = 15, region?: "domestic" | "global") {
  const pool = region ? MOCK_ARTICLES.filter((a) => a.region === region) : MOCK_ARTICLES;
  const titles = pool.map((a) => a.title);
  const departments = MOCK_DEPARTMENTS;
  const channels = MOCK_CHANNELS;

  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    let keywordScore: number;
    if (i < 2) {
      keywordScore = 90 + Math.floor(Math.random() * 11);
    } else if (i < 5) {
      keywordScore = 50 + Math.floor(Math.random() * 21);
    } else if (i < 10) {
      keywordScore = 15 + Math.floor(Math.random() * 21);
    } else {
      keywordScore = Math.floor(Math.random() * 11);
    }

    const hasFunding = i < 3 || Math.random() > 0.7;
    const hasProcurement = i === 1 || i === 4 || Math.random() > 0.85;
    const hasPilot = i === 0 || i === 3 || Math.random() > 0.8;
    const hasStandards = i === 2 || Math.random() > 0.85;

    const importanceLevel =
      i < 2
        ? MOCK_IMPORTANCE_LEVELS[0]
        : i < 5
        ? MOCK_IMPORTANCE_LEVELS[1]
        : MOCK_IMPORTANCE_LEVELS[2];

    const categories: Array<{ category: string; score: number; topKeywords?: string[] }> = [];

    const signalCount = i < 5 ? 2 : 1;
    const signalShuffled = [...MOCK_SIGNAL_CATEGORIES].sort(() => Math.random() - 0.5);
    for (let j = 0; j < signalCount; j++) {
      const cat = signalShuffled[j];
      categories.push({
        category: cat,
        score: Math.floor(60 + Math.random() * 35),
        topKeywords: MOCK_KEYWORDS_BY_CATEGORY[cat]?.slice(0, 3),
      });
    }

    const topicCount = Math.min(2 + Math.floor(Math.random() * 2), MOCK_TOPIC_CATEGORIES.length);
    const topicShuffled = [...MOCK_TOPIC_CATEGORIES].sort(() => Math.random() - 0.5);
    for (let j = 0; j < topicCount; j++) {
      const cat = topicShuffled[j];
      categories.push({
        category: cat,
        score: Math.floor(30 + Math.random() * 50),
        topKeywords: MOCK_KEYWORDS_BY_CATEGORY[cat]?.slice(0, 3),
      });
    }

    const article = pool[i];
    const dept = article?.dept ?? departments[i % departments.length];
    const channel = article?.channel ?? channels[i % channels.length];
    const url = article?.url ?? `https://example.com/item/${i}`;

    return {
      sourceId: `src_mock_${i}`,
      departmentName: dept,
      channelName: channel,
      displayName: `${dept}·${channel}`,
      url,
      finalUrl: url,
      title: titles[i],
      listPublishedAt: date.toISOString(),
      firstSeenAt: date.toISOString(),
      isRead: Math.random() > 0.3,
      isStarred: i < 3,
      keywordScore,
      importanceLevel,
      categories,
      genres: [MOCK_GENRES[Math.floor(Math.random() * MOCK_GENRES.length)]],
      hasFunding,
      hasProcurement,
      hasPilot,
      hasStandards,
    };
  });
}

export function generateMockSourcesTree() {
  return [
    {
      departmentName: "AI工具动态",
      displayName: "AI工具动态",
      totalCount: 180,
      totalUnread: 32,
      unread: 32,
      channels: [
        { sourceId: "src_suno_blog", channelName: "Suno 官方博客", count: 90, unread: 18 },
        { sourceId: "src_runway_updates", channelName: "Runway 更新日志", count: 90, unread: 14 },
      ],
    },
    {
      departmentName: "创作机会",
      displayName: "创作机会",
      totalCount: 120,
      totalUnread: 22,
      unread: 22,
      channels: [
        { sourceId: "src_xiudong", channelName: "秀动 演出招募", count: 70, unread: 14 },
        { sourceId: "src_damai", channelName: "大麦 音乐活动", count: 50, unread: 8 },
      ],
    },
    {
      departmentName: "平台动态",
      displayName: "平台动态",
      totalCount: 85,
      totalUnread: 15,
      unread: 15,
      channels: [
        { sourceId: "src_spotify_news", channelName: "Spotify 新闻室", count: 50, unread: 9 },
        { sourceId: "src_distrokid", channelName: "DistroKid 动态", count: 35, unread: 6 },
      ],
    },
    {
      departmentName: "行业媒体",
      displayName: "行业媒体",
      totalCount: 150,
      totalUnread: 28,
      unread: 28,
      channels: [
        { sourceId: "src_musicweek", channelName: "Music Week", count: 80, unread: 16 },
        { sourceId: "src_pitchfork", channelName: "Pitchfork 行业", count: 70, unread: 12 },
      ],
    },
  ];
}

export function generateMockDetail(sourceId: string, url: string) {
  return {
    sourceId,
    url,
    title: "Suno v4.5 重大更新：支持人声克隆与实时歌词编辑，定价结构同步调整",
    departmentName: "Suno Blog",
    channelName: "AI工具更新",
    listPublishedAt: new Date().toISOString(),
    summary:
      "Suno 今日正式推出 v4.5 版本，核心新增功能包括：基于30秒样本的人声风格克隆、实时歌词逐句编辑、以及支持上传参考音频进行风格迁移。同时宣布调整订阅定价...",
    paragraphs: [
      "一、核心新功能概览",
      "v4.5 版本带来了三项创作者期待已久的核心功能。首先是人声风格克隆：上传30秒以上的人声样本，Suno 可提取声纹特征并应用至生成轨道，声线相似度在测试中达到85%以上。",
      "二、实时歌词编辑器",
      "新版编辑界面支持逐句点击修改歌词，修改后系统在约8秒内重新渲染对应段落，无需重新生成整首曲目。这一功能对于需要精确控制歌词内容的独立音乐人来说意义重大。",
      "三、参考音频风格迁移",
      "上传一段参考音频（无版权限制），系统将提取其节奏型、和声色彩、编曲密度等特征用于指导生成，而非直接采样，从而规避版权风险。",
      "四、定价调整",
      "Pro 计划月费从 $8 上调至 $11，年付用户保持原价不变。免费计划每日生成额度从10首降至5首。现有 Pro 订阅用户本月内升级至新版价格前享有30天缓冲期。",
    ],
    matchedKeywords: [
      { keyword: "人声克隆", weight: 95, category: "A·AI工具更新" },
      { keyword: "Suno", weight: 90, category: "AI音乐生成工具" },
      { keyword: "定价调整", weight: 75, category: "平台政策/版权" },
    ],
    categories: [
      { category: "A·AI工具更新", score: 95 },
      { category: "AI音乐生成工具", score: 90 },
      { category: "平台政策/版权", score: 75 },
    ],
    attachments: [
      { text: "Suno v4.5 官方发布说明（英文）", url: "https://example.com/suno-v45-release.pdf" },
      { text: "新定价方案对比表", url: "https://example.com/pricing-comparison.pdf" },
    ],
    isRead: false,
    isStarred: false,
  };
}

export function generateMockDimensions() {
  return {
    sourcesTree: generateMockSourcesTree(),
    categoriesWithCounts: [
      { category: "structure", count: 300 },
      { category: "opportunity", count: 150 },
      { category: "risk", count: 80 },
      { category: "standard", count: 120 },
    ],
    genresWithCounts: [
      { genre: "通知", count: 200 },
      { genre: "公告", count: 150 },
      { genre: "意见", count: 100 },
      { genre: "办法", count: 80 },
      { genre: "方案", count: 70 },
    ],
    departments: MOCK_DEPARTMENTS_WITH_COUNT,
  };
}

export function generateMockGrouped() {
  return {
    summary: [
      {
        departmentName: "AI工具动态",
        totalCount: 180,
        unreadCount: 32,
        starredCount: 8,
        latestFirstSeenAt: new Date().toISOString(),
        channels: [
          {
            sourceId: "src_suno_blog",
            channelName: "Suno 官方博客",
            displayName: "AI工具·Suno",
            count: 90,
            unread: 18,
            starred: 5,
            items: [],
          },
          {
            sourceId: "src_runway_updates",
            channelName: "Runway 更新日志",
            displayName: "AI工具·Runway",
            count: 90,
            unread: 14,
            starred: 3,
            items: [],
          },
        ],
      },
      {
        departmentName: "创作机会",
        totalCount: 150,
        unreadCount: 28,
        starredCount: 9,
        latestFirstSeenAt: new Date().toISOString(),
        channels: [
          {
            sourceId: "src_xiudong",
            channelName: "秀动 演出招募",
            displayName: "创作机会·秀动",
            count: 80,
            unread: 16,
            starred: 5,
            items: [],
          },
          {
            sourceId: "src_damai",
            channelName: "大麦 音乐活动",
            displayName: "创作机会·大麦",
            count: 70,
            unread: 12,
            starred: 4,
            items: [],
          },
        ],
      },
    ],
    departments: MOCK_DEPARTMENTS,
    recentKeywordHits: [],
    sourcesTree: generateMockSourcesTree(),
    categoriesWithCounts: [],
    genresWithCounts: [],
  };
}

// ================ 预估中心 Mock 数据 ================

const MOCK_FORECAST_TITLES = [
  "【截止预警】草莓音乐节2025新人乐队招募——报名截止8月9日（周五）",
  "【创作机会】上海国际艺术节驻留项目：独立音乐人申请截止8月15日",
  "Suno Pro 订阅用户注意：新定价8月20日生效，年付锁价窗口仅剩11天",
  "【资助申请】文化部独立音乐人创作基金Q2轮次，申报截止8月15日",
  "迷笛2026阵容招募正式开放，Demo投递窗口持续至9月30日",
  "DistroKid AI音乐标注新规：9月1日起未标注将自动下架",
  "HeyGen 数字形象年费套餐限时折扣，本周日截止",
  "【演出机会】秀动驻演品牌合作招募：8月31日截止投递",
  "Runway Gen-4 早鸟体验资格申请开放，名额限500人",
  "【国际机会】SXSW 2026 Band Showcase 报名开放，截止10月15日",
];

export function generateMockForecastItems(): ForecastItem[] {
  const departments = ["秀动/大麦", "Suno Blog", "行业媒体"];
  const channels = ["创作机会", "AI工具更新", "平台动态"];

  return MOCK_FORECAST_TITLES.map((title, i) => {
    let keywordScore: number;
    if (i < 2) {
      keywordScore = 92 + Math.floor(Math.random() * 9);
    } else if (i < 5) {
      keywordScore = 55 + Math.floor(Math.random() * 21);
    } else if (i < 8) {
      keywordScore = 18 + Math.floor(Math.random() * 22);
    } else {
      keywordScore = Math.floor(Math.random() * 12);
    }

    return {
      sourceId: `src_mock_${i}`,
      departmentName: departments[i % departments.length],
      channelName: channels[i % channels.length],
      displayName: `${departments[i % departments.length]}·${channels[i % channels.length]}`,
      url: `https://example.com/forecast/${i}`,
      finalUrl: `https://example.com/forecast/${i}`,
      title,
      listPublishedAt: new Date(Date.now() - i * 86400000).toISOString(),
      firstSeenAt: new Date(Date.now() - i * 86400000).toISOString(),
      importanceLevel: i < 3 ? "核心关注" : i < 6 ? "重点内容" : "普通内容",
      keywordScore,
      documentStatus: null,
      hasFunding: i < 3 || i % 4 === 0,
      hasProcurement: i === 1 || i === 4 || i % 5 === 0,
      hasPilot: i === 0 || i === 3 || i % 4 === 2,
      hasStandards: i === 2 || i % 5 === 3,
      forecastHigh: i < 3 ? "高预估" : null,
      forecastMidHigh: i >= 3 && i < 6 ? "中高预估" : null,
      forecastMid: i >= 6 && i < 9 ? "中预估" : null,
      forecastLow: i >= 9 ? "低预估" : null,
      forecastNotes: null,
      forecastSources: null,
      forecastUpdatedAt: null,
      summary: "这是一条模拟的预估信号内容",
      topCategories: [],
    };
  });
}

export function calculateForecastStats(items: ForecastItem[]): ForecastStats {
  const stats: ForecastStats = {
    forecast: 0,
    signal: 0,
    funding: 0,
    procurement: 0,
    pilot: 0,
    standards: 0,
  };
  for (const it of items) {
    const hasForecast = it.forecastHigh || it.forecastMidHigh || it.forecastMid || it.forecastLow;
    const hasSignal = it.hasFunding || it.hasProcurement || it.hasPilot || it.hasStandards;
    if (hasForecast) stats.forecast++;
    if (hasSignal && !hasForecast) stats.signal++;
    if (it.hasFunding) stats.funding++;
    if (it.hasProcurement) stats.procurement++;
    if (it.hasPilot) stats.pilot++;
    if (it.hasStandards) stats.standards++;
  }
  return stats;
}

export function generateMockForecast(limit = 500): { items: ForecastItem[]; stats: ForecastStats } {
  const items = generateMockForecastItems().slice(0, limit);
  const stats = calculateForecastStats(items);
  return { items, stats };
}

// ================ Dashboard Mock 数据 ================

const MOCK_DASHBOARD_DEPARTMENTS = [
  { name: "Suno", total: 320, today: 24 },
  { name: "Udio", total: 285, today: 18 },
  { name: "Runway", total: 240, today: 15 },
  { name: "Spotify", total: 180, today: 12 },
  { name: "DistroKid", total: 145, today: 8 },
  { name: "ElevenLabs", total: 128, today: 7 },
  { name: "HeyGen", total: 115, today: 6 },
  { name: "网易云音乐", total: 105, today: 5 },
  { name: "Apple Music", total: 98, today: 5 },
  { name: "Stable Audio", total: 88, today: 4 },
  { name: "Pika", total: 80, today: 3 },
  { name: "SoundCloud", total: 72, today: 3 },
];

const MOCK_TOP_KEYWORDS = [
  { keyword: "Suno", category: "A·AI工具更新", count: 285 },
  { keyword: "新功能", category: "A·AI工具更新", count: 234 },
  { keyword: "版本发布", category: "A·AI工具更新", count: 198 },
  { keyword: "比赛", category: "B·创作机会", count: 176 },
  { keyword: "征集", category: "B·创作机会", count: 165 },
  { keyword: "API", category: "A·AI工具更新", count: 152 },
  { keyword: "Runway", category: "A·AI工具更新", count: 143 },
  { keyword: "截止", category: "C·申报截止预警", count: 128 },
  { keyword: "deadline", category: "C·申报截止预警", count: 117 },
  { keyword: "Spotify", category: "D·行业观察", count: 105 },
  { keyword: "版权", category: "平台政策/版权", count: 94 },
  { keyword: "资助", category: "B·创作机会", count: 87 },
  { keyword: "定价", category: "A·AI工具更新", count: 76 },
  { keyword: "发行", category: "D·行业观察", count: 68 },
  { keyword: "驻留", category: "B·创作机会", count: 59 },
  { keyword: "Udio", category: "A·AI工具更新", count: 142 },
  { keyword: "ElevenLabs", category: "A·AI工具更新", count: 126 },
  { keyword: "流媒体", category: "D·行业观察", count: 98 },
  { keyword: "stems", category: "A·AI工具更新", count: 85 },
  { keyword: "changelog", category: "A·AI工具更新", count: 72 },
];

export function generateMockDashboard(days: number = 14, topKeywordsLimit: number = 20) {
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split("T")[0];
  });

  const departmentStats = MOCK_DASHBOARD_DEPARTMENTS.map((d) => ({
    departmentName: d.name,
    total: d.total,
    todayCount: d.today,
    series: dates.map((date, idx) => ({
      date,
      count: Math.floor(d.total / days + Math.sin(idx / 2) * 5 + Math.random() * 8),
    })),
  }));

  const signalTrendValues = (base: number, variance: number) =>
    dates.map((_, idx) => Math.max(0, Math.floor(base + Math.sin(idx / 2) * variance + Math.random() * variance * 0.5)));

  return {
    periodDays: days,
    counts: { total: 2073, unread: 312, starred: 86, urgent: 72, highlight: 245 },
    departmentStats,
    importanceDistribution: [
      { level: "core", label: "核心关注", count: 72, color: "#ef4444" },
      { level: "highlight", label: "重点内容", count: 245, color: "#f97316" },
      { level: "normal", label: "普通内容", count: 1380, color: "#64748b" },
      { level: "low", label: "次要信息", count: 376, color: "#94a3b8" },
    ],
    signalTrend: {
      dates,
      series: [
        { key: "endangered", label: "濒危预警", color: "#ef4444", values: signalTrendValues(10, 4) },
        { key: "heritage", label: "认定公布", color: "#8b5cf6", values: signalTrendValues(8, 3) },
        { key: "support", label: "资助保护", color: "#22c55e", values: signalTrendValues(17, 5) },
      ],
    },
    topKeywords: MOCK_TOP_KEYWORDS.slice(0, topKeywordsLimit),
  };
}

// ================ Daily Summary Mock 数据 ================

const MOCK_TOP_ITEM_TITLES = [
  "Suno v4: Major Leap in AI Music Generation Quality",
  "Udio 2: Real-Time Collaboration and Extended Track Length",
  "Runway Gen-3 Alpha Turbo: Faster Generation at Lower Cost",
  "ElevenLabs 音色克隆 v3 发布：情绪控制与多语言支持",
  "Spotify 独立音乐人直传计划更新：收益分成比例调整",
  "2025 全球独立音乐人创作大赛征稿通知（截止 2025-12-31）",
  "DistroKid AI音乐标注新规：未标注者将面临下架风险",
  "国际电子音乐驻留项目开放申请（资助金额 $5000）",
];

const MOCK_TOP_DEPARTMENTS = [
  "Suno",
  "Udio",
  "Runway",
  "Spotify",
  "DistroKid",
  "ElevenLabs",
];

const MOCK_TOP_CHANNELS = [
  "产品更新",
  "更新公告",
  "行业动态",
  "创作机会",
  "版权动态",
];

const MOCK_CATEGORIES = [
  { category: "A·AI工具更新", score: 40 },
  { category: "B·创作机会", score: 35 },
  { category: "平台政策/版权", score: 30 },
  { category: "C·申报截止预警", score: 25 },
  { category: "D·行业观察", score: 20 },
  { category: "AI音乐生成工具", score: 25 },
];

export function generateMockDailySummary(sinceHours: number = 24, limit: number = 10) {
  const days = Math.ceil(sinceHours / 24);
  const totalDays = Math.min(30, Math.max(3, days + 6));

  const dates = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (totalDays - 1 - i));
    return d.toISOString().split("T")[0];
  });

  const dailySeries = dates.map((date) => ({
    date,
    count: Math.floor(Math.random() * 30) + 50,
    urgent: Math.floor(Math.random() * 5) + 2,
    highlight: Math.floor(Math.random() * 10) + 5,
  }));

  const departmentStats = MOCK_DASHBOARD_DEPARTMENTS.slice(0, 12).map((d) => ({
    departmentName: d.name,
    todayCount: d.today,
    last7DaysCount: Math.floor(d.total * 0.2),
    urgentCount: Math.floor(d.today * 0.15),
    highlightCount: Math.floor(d.today * 0.3),
    totalCount: d.total,
    channelCount: Math.floor(Math.random() * 4) + 2,
  }));

  const topItems = Array.from(
    { length: Math.min(limit, MOCK_TOP_ITEM_TITLES.length) },
    (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 3));
      const hasFunding = i < 3 || i % 4 === 0;
      const hasProcurement = i === 0 || i === 2 || i === 5;
      const hasPilot = i === 0 || i === 3 || i === 6;
      const hasStandards = i === 1 || i === 4;
      const keywordScore = i < 2
        ? 92 + Math.floor(Math.random() * 9)
        : i < 4
        ? 55 + Math.floor(Math.random() * 21)
        : i < 6
        ? 20 + Math.floor(Math.random() * 21)
        : Math.floor(Math.random() * 12);
      const importanceLevel =
        i < 2 ? "核心关注" : i < 4 ? "加急推荐" : i < 7 ? "重点内容" : "普通内容";

      const itemCategories = MOCK_CATEGORIES.slice(
        0,
        Math.floor(Math.random() * 3) + 2
      ).map((c, idx) => ({
        category: c.category,
        score: c.score - idx * 5,
        topKeywords:
          idx === 0
            ? ["更新", "工具", "发行"].slice(0, Math.floor(Math.random() * 3) + 1)
            : undefined,
      }));

      return {
        sourceId: `src_mock_top_${i}`,
        departmentName:
          MOCK_TOP_DEPARTMENTS[i % MOCK_TOP_DEPARTMENTS.length],
        channelName: MOCK_TOP_CHANNELS[i % MOCK_TOP_CHANNELS.length],
        title: MOCK_TOP_ITEM_TITLES[i],
        url: `https://example.com/top-item/${i}`,
        finalUrl: `https://example.com/top-item/${i}`,
        listPublishedAt: date.toISOString(),
        firstSeenAt: date.toISOString(),
        importanceLevel,
        keywordScore,
        categories: itemCategories,
        hasFunding,
        hasProcurement,
        hasPilot,
        hasStandards,
        isStarred: i === 0,
        forecastHigh: i < 3 ? "高预估内容" : null,
      };
    }
  );

  const urgentCount = topItems.filter(
    (it) => it.importanceLevel === "核心关注" || it.importanceLevel === "加急推荐"
  ).length;
  const highlightCount = topItems.filter(
    (it) => it.importanceLevel === "重点内容"
  ).length;
  const unreadCount = Math.floor(Math.random() * 50) + 100;

  return {
    date: new Date().toISOString().slice(0, 10),
    sinceHours,
    urgentCount,
    highlightCount,
    unreadCount,
    dailySeries,
    departmentStats,
    topItems,
  };
}

// ================ Sources Mock 数据 ================

export function generateMockSources() {
  return [
    {
      id: "src_suno_blog",
      departmentName: "Suno",
      channelGroup: "产品更新",
      channelName: "官方博客",
      displayName: "Suno·官方博客",
      type: "generic_list",
      listUrl: "",
      enabled: true,
      autoMonitor: true,
      isKey: true,
      startDate: "2024-01-01",
      maxItems: 30,
      notes: "",
    },
    {
      id: "src_udio_blog",
      departmentName: "Udio",
      channelGroup: "产品更新",
      channelName: "官方博客",
      displayName: "Udio·官方博客",
      type: "generic_list",
      listUrl: "",
      enabled: true,
      autoMonitor: true,
      isKey: true,
      startDate: "2024-01-01",
      maxItems: 30,
      notes: "",
    },
    {
      id: "src_runway_changelog",
      departmentName: "Runway",
      channelGroup: "产品更新",
      channelName: "更新日志",
      displayName: "Runway·更新日志",
      type: "generic_list",
      listUrl: "",
      enabled: true,
      autoMonitor: true,
      isKey: false,
      startDate: "2024-01-01",
      maxItems: 30,
      notes: "",
    },
    {
      id: "src_spotify_newsroom",
      departmentName: "Spotify",
      channelGroup: "行业动态",
      channelName: "新闻室",
      displayName: "Spotify·新闻室",
      type: "generic_list",
      listUrl: "",
      enabled: true,
      autoMonitor: true,
      isKey: false,
      startDate: "2024-01-01",
      maxItems: 20,
      notes: "行业观察来源",
    },
  ];
}
