import { describe, expect, it } from "vitest";
import { detectCreatorSignals } from "./creator-signals";

describe("detectCreatorSignals", () => {
  it("认出工具发布与定价", () => {
    const s = detectCreatorSignals({ title: "Suno launches v5 with new credits pricing" });
    expect(s.newFeature).toBe(true);
    expect(s.pricing).toBe(true);
    expect(s.copyright).toBe(false);
  });

  it("认出中文的比赛、截止和版权", () => {
    const s = detectCreatorSignals({ title: "AI 音乐大赛开始征集", summary: "报名截止 12 月 1 日；作品版权归作者" });
    expect(s.opportunity).toBe(true);
    expect(s.deadline).toBe(true);
    expect(s.copyright).toBe(true);
  });

  it("有 deadlineDate 字段时一定算截止", () => {
    expect(detectCreatorSignals({ title: "Spring showcase", deadlineDate: "2026-12-01" }).deadline).toBe(true);
  });

  it("普通的「更新」「发布」不算新功能（旧规则太松）", () => {
    const s = detectCreatorSignals({ title: "行业报告更新：流媒体收入继续增长" });
    expect(s.newFeature).toBe(false);
  });

  it("开源新模型算新功能", () => {
    expect(detectCreatorSignals({ title: "MiniMax开源SOTA生图模型，原生4K" }).newFeature).toBe(true);
    expect(detectCreatorSignals({ title: "Stability open-sources a new audio model" }).newFeature).toBe(true);
  });

  it("lawsuit / licensing 归到版权", () => {
    expect(detectCreatorSignals({ title: "Reservoir hits Suno with copyright lawsuit" }).copyright).toBe(true);
    expect(detectCreatorSignals({ summary: "new licensing deal with labels" }).copyright).toBe(true);
  });
});
