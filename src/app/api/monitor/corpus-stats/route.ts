import { NextResponse } from "next/server";
import { ensureMonitorSchema, getCorpusStats, type CorpusStats } from "@/lib/monitor/db";
import { isDbAvailable } from "@/lib/db";
import { mockDelay } from "@/lib/mock";

export const dynamic = "force-dynamic";

// 无 DB 时的兜底快照（保证首页情报速览永远有内容可展示）
const MOCK: CorpusStats = {
  scale: { total: 284, displayable: 231, sources: 15, yearLabel: "2026" },
  sourceRoles: [
    { label: "工具官方", value: 9 },
    { label: "垂直媒体", value: 5 },
    { label: "机会", value: 1 },
  ],
  topSources: [
    { label: "PetaPixel", value: 39 },
    { label: "Krea", value: 33 },
    { label: "Luma", value: 30 },
    { label: "ElevenLabs", value: 30 },
    { label: "量子位", value: 24 },
    { label: "Synthtopia", value: 24 },
  ],
  timeline: [
    { label: "2026-01", value: 7 },
    { label: "2026-02", value: 9 },
    { label: "2026-03", value: 14 },
    { label: "2026-04", value: 8 },
    { label: "2026-05", value: 22 },
    { label: "2026-06", value: 29 },
    { label: "2026-07", value: 13 },
    { label: "2026-08", value: 182 },
  ],
};

export async function GET() {
  await ensureMonitorSchema();

  if (!isDbAvailable()) {
    await mockDelay();
    return NextResponse.json(MOCK);
  }

  const stats = await getCorpusStats();
  return NextResponse.json(stats);
}
