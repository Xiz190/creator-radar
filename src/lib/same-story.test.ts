import { describe, expect, it } from "vitest";
import { isSameStory, pickDistinctStories } from "./same-story";

describe("isSameStory", () => {
  it("同一次发布、不同来源的标题算同一件事", () => {
    expect(isSameStory(
      "Suno v6 Explained: v6, v6-wild and v6-mini Replace v5.5, Lawsuit Included",
      "Suno launches its v6 AI-music models. Here's what you need to know...",
    )).toBe(true);
  });
  it("同一个品牌的不同新闻不算", () => {
    expect(isSameStory("Suno v6 Explained", "Reservoir hits Suno and Anthropic with copyright lawsuits")).toBe(false);
  });
  it("完全无关的不算", () => {
    expect(isSameStory("Introducing Eleven v4, our most emotive model", "Suno launches its v6 AI-music models")).toBe(false);
  });
});

describe("pickDistinctStories", () => {
  it("跳过重复，往后补", () => {
    const items = [
      { title: "Suno v6 Explained: v6-wild and v6-mini" },
      { title: "Suno launches its v6 AI-music models" },
      { title: "Introducing Eleven v4" },
      { title: "Pika Soundtrack is here" },
    ];
    expect(pickDistinctStories(items, 3).map((i) => i.title)).toEqual([
      "Suno v6 Explained: v6-wild and v6-mini",
      "Introducing Eleven v4",
      "Pika Soundtrack is here",
    ]);
  });

  it("来源名也算识别词：官方博客的短标题也能认出来", () => {
    const items = [
      { title: "Suno v6 Explained: v6-wild and v6-mini", departmentName: "Mubert" },
      { title: "Introducing Eleven v4", departmentName: "ElevenLabs" },
      { title: "Introducing v6", departmentName: "Suno" },
      { title: "Pika Soundtrack is here", departmentName: "Pika" },
    ];
    expect(pickDistinctStories(items, 3).map((i) => i.title)).toEqual([
      "Suno v6 Explained: v6-wild and v6-mini",
      "Introducing Eleven v4",
      "Pika Soundtrack is here",
    ]);
  });
});
