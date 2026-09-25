import type { CompareItemBasic } from "./compare-analysis";

export const DEMO_POLICY_1: CompareItemBasic & {
  channelName: string;
  firstSeenAt: string;
  documentStatus: string | null;
  isRead: boolean;
  isStarred: boolean;
} = {
  sourceId: "demo-suno-v4",
  url: "https://suno.com/blog/suno-v4",
  title: "Suno v4: Major Leap in AI Music Generation Quality",
  departmentName: "Suno",
  channelName: "产品更新",
  listPublishedAt: "2025-10-15T00:00:00Z",
  firstSeenAt: "2025-10-15T08:30:00Z",
  importanceLevel: "核心关注",
  keywordScore: 92,
  summary:
    "Suno v4 brings a significant leap in audio quality, coherence, and controllability. Key upgrades include: stems separation now available for all tracks, custom BPM/key controls, improved lyric adherence, and a new 'style transfer' mode that lets you apply the feel of a reference track without copyright issues. Pricing remains unchanged for existing subscribers. API access expanded to all Pro tier users.",
  paragraphs: [
    "What's new in Suno v4",
    "We're excited to announce Suno v4, our most capable music generation model to date. This release focuses on three pillars: audio fidelity, creative control, and creator workflow.",
    "Audio quality improvements",
    "v4 doubles the effective audio bandwidth compared to v3.5, resulting in crisper highs, fuller lows, and more natural instrument separation. Vocal clarity has improved dramatically — AI-generated vocals now pass double-blind listening tests against demo recordings at a significantly higher rate.",
    "Creative control features",
    "You can now specify BPM (40–220), key signature, and time signature directly in the prompt. The new 'style transfer' mode lets you upload a reference track and capture its vibe, energy, and production style — without reproducing copyrighted material.",
    "Stems and remix",
    "All tracks generated with v4 include downloadable stems (vocals, drums, bass, melody). This makes Suno-generated content directly usable in professional DAW workflows.",
    "API and pricing",
    "API access is now available to all Pro subscribers at no additional cost. Rate limits have been raised to 500 generations/day for Pro and 2,000/day for Premier. Pricing tiers remain unchanged.",
    "Copyright and ownership",
    "All tracks generated on paid plans are fully owned by the creator and can be used commercially without royalty obligations to Suno.",
  ],
  categories: [
    { category: "A·AI工具更新", score: 98 },
    { category: "AI音乐生成工具", score: 95 },
    { category: "流媒体/发行平台", score: 40 },
  ],
  matchedKeywords: [
    { keyword: "Suno", category: "A·AI工具更新" },
    { keyword: "版本发布", category: "A·AI工具更新" },
    { keyword: "新功能", category: "A·AI工具更新" },
    { keyword: "API", category: "A·AI工具更新" },
    { keyword: "版权", category: "平台政策/版权" },
  ],
  effectiveFrom: "2025-10-15",
  effectiveTo: null,
  deadlineDate: null,
  hasFunding: false,
  hasPilot: false,
  hasProcurement: false,
  documentStatus: null,
  isRead: false,
  isStarred: true,
};

export const DEMO_POLICY_2: CompareItemBasic & {
  channelName: string;
  firstSeenAt: string;
  documentStatus: string | null;
  isRead: boolean;
  isStarred: boolean;
} = {
  sourceId: "demo-udio-v2",
  url: "https://udio.com/blog/udio-2-announcement",
  title: "Introducing Udio 2: Real-Time Collaboration and Extended Track Length",
  departmentName: "Udio",
  channelName: "产品更新",
  listPublishedAt: "2025-11-02T00:00:00Z",
  firstSeenAt: "2025-11-02T09:00:00Z",
  importanceLevel: "核心关注",
  keywordScore: 88,
  summary:
    "Udio 2 launches with real-time collaborative generation — multiple users can co-create a track simultaneously. Maximum track length extended to 12 minutes. New 'Infinity Mode' auto-extends tracks coherently. Udio 2 also ships a stems export feature and expands its genre palette with 40 new style tags. Pricing restructured: new Starter tier at $8/mo, Creator at $20/mo, and Studio at $48/mo.",
  paragraphs: [
    "Udio 2: Built for Collaboration",
    "Today we launch Udio 2, a ground-up rebuild that puts collaboration at the center of AI music creation. Whether you're jamming remotely with a bandmate or iterating with a producer, Udio 2 makes it possible.",
    "Real-time collaboration",
    "Up to 4 users can now work on the same generation session simultaneously. Each collaborator can add prompts, tweak parameters, or upvote variations — Udio 2 synthesizes these inputs in real time to produce tracks that reflect the group's creative direction.",
    "Extended length and Infinity Mode",
    "Maximum track length has increased from 4 minutes to 12 minutes. Infinity Mode uses a proprietary continuation model to extend any track indefinitely while maintaining harmonic and rhythmic coherence.",
    "Stems and professional workflow",
    "Udio 2 exports 6-stem bundles: vocals, drums, bass, chords, lead melody, and FX. Files are delivered in 48kHz/24-bit WAV. We're partnering with major DAW providers for one-click import.",
    "New genre tags and style system",
    "We've added 40 new style tags including shoegaze, afrobeats, city pop, and hyperpop. Style tags can now be weighted (e.g., 70% jazz + 30% bossa nova) for granular blending.",
    "Pricing restructure",
    "New pricing: Starter ($8/mo, 200 credits), Creator ($20/mo, 600 credits), Studio ($48/mo, 2000 credits + API). Legacy subscribers are grandfathered at their current rate through June 2026.",
    "Ownership and licensing",
    "Commercial use is included in all paid plans. Udio 2 tracks are registered with a blockchain-based provenance system so ownership is verifiable.",
  ],
  categories: [
    { category: "A·AI工具更新", score: 95 },
    { category: "AI音乐生成工具", score: 92 },
    { category: "平台政策/版权", score: 60 },
  ],
  matchedKeywords: [
    { keyword: "Udio", category: "A·AI工具更新" },
    { keyword: "版本发布", category: "A·AI工具更新" },
    { keyword: "定价调整", category: "A·AI工具更新" },
    { keyword: "API", category: "A·AI工具更新" },
    { keyword: "版权", category: "平台政策/版权" },
  ],
  effectiveFrom: "2025-11-02",
  effectiveTo: null,
  deadlineDate: null,
  hasFunding: false,
  hasPilot: false,
  hasProcurement: false,
  documentStatus: null,
  isRead: false,
  isStarred: true,
};

export const DEMO_POLICIES = [DEMO_POLICY_1, DEMO_POLICY_2];
