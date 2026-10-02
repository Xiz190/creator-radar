// 按来源的主题门槛：综合类媒体只收与本台主题相关的标题，其余不入库。
//
// 为什么只给个别来源设：Suno / ElevenLabs / Runway 这类 AI 工具官方博客本身就对口，不需要过滤；
// 而 PetaPixel 是综合摄影媒体，2026-10 实测线上 309 条里只有约 31 条与 AI 影像相关，
// 其余是相机评测、野生动物、摄影比赛——在动态资讯里很显眼，创作者视角只能写「不是你的方向」。
// （政策雷达是全局门槛：所有来源都要命中 __domain__ 词表；这里是按来源的，两者用途不同。）

/** AI 影像 / 生成式工具相关：标题命中其一才入库 */
const AI_IMAGING = new RegExp(
  [
    String.raw`\b(AI|GenAI|gen-?AI|LLM)\b`,
    String.raw`\bA\.I\.`, // 「The A.I. Chatbot Dilemma」：结尾的点后面没有词边界，不能用 \b 收尾
    "artificial intelligence",
    "intelligent", // 「Intelligent Culling」等 AI 功能的说法
    "generative",
    "machine learning",
    "neural",
    "deepfake",
    "synthetic",
    "chatbot",
    "diffusion",
    String.raw`text-to-(image|video)`,
    "upscal",
    "algorithm",
    "computational",
    // 具体模型/产品名
    "midjourney",
    String.raw`dall-?e`,
    "firefly",
    String.raw`\bsora\b`,
    String.raw`\brunway\b`,
    String.raw`\bveo\b`,
    "imagen",
    String.raw`\bflux\b`,
    "chatgpt",
    "openai",
    "gemini",
    "nano banana",
  ].join("|"),
  "i",
);

const SOURCE_TOPIC_GATES: Record<string, RegExp> = {
  petapixel_feed: AI_IMAGING,
};

/** 该来源的条目能否入库：没设门槛的来源一律放行 */
export function passesSourceTopicGate(sourceId: string, title: string | null | undefined): boolean {
  const gate = SOURCE_TOPIC_GATES[sourceId];
  return !gate || gate.test(title ?? "");
}
