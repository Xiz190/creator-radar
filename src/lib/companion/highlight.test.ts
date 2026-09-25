import { describe, expect, it } from "vitest";
import { keywordStrings, segmentByKeywords } from "@/lib/companion/highlight";

describe("正文关键词切分", () => {
  it("没有关键词时整段原样返回", () => {
    expect(segmentByKeywords("hello world", [])).toEqual([{ text: "hello world", hit: false }]);
    expect(segmentByKeywords("hello", ["   "])).toEqual([{ text: "hello", hit: false }]);
  });

  it("命中一个词时切成 前/中/后 三段", () => {
    expect(segmentByKeywords("a stem here", ["stem"])).toEqual([
      { text: "a ", hit: false },
      { text: "stem", hit: true },
      { text: " here", hit: false },
    ]);
  });

  it("词在开头或结尾时不产生空片段", () => {
    expect(segmentByKeywords("stem edit", ["stem"])).toEqual([
      { text: "stem", hit: true },
      { text: " edit", hit: false },
    ]);
    expect(segmentByKeywords("use stem", ["stem"])).toEqual([
      { text: "use ", hit: false },
      { text: "stem", hit: true },
    ]);
  });

  it("同一个词出现多次全部命中", () => {
    const segs = segmentByKeywords("stem and stem", ["stem"]);
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(["stem", "stem"]);
  });

  it("长词优先：短的嵌套词不会把长词切碎", () => {
    const segs = segmentByKeywords("AI music tools", ["AI", "AI music"]);
    const hits = segs.filter((s) => s.hit).map((s) => s.text);
    expect(hits).toEqual(["AI music"]);
    // 拼接后必须与原文完全一致（切分不丢字、不重字）
    expect(segs.map((s) => s.text).join("")).toBe("AI music tools");
  });

  it("重复关键词只算一次", () => {
    const segs = segmentByKeywords("stem", ["stem", "stem", " stem "]);
    expect(segs).toEqual([{ text: "stem", hit: true }]);
  });

  it("没命中的词不影响切分", () => {
    const segs = segmentByKeywords("nothing here", ["absent"]);
    expect(segs).toEqual([{ text: "nothing here", hit: false }]);
  });

  it("任何情况下片段拼接都等于原文（不丢字不重字）", () => {
    const text = "Suno v5 adds stem-level editing and per-section regeneration for producers";
    for (const kws of [[], ["stem"], ["Suno", "editing"], ["editing", "edit"], ["a", "an", "and"]]) {
      const joined = segmentByKeywords(text, kws)
        .map((s) => s.text)
        .join("");
      expect(joined, `关键词 ${JSON.stringify(kws)} 时切分失真`).toBe(text);
    }
  });

  it("空文本返回空数组", () => {
    expect(segmentByKeywords("", ["x"])).toEqual([]);
  });

  it("区分大小写（与桌面端口径一致，不能两端不一样）", () => {
    expect(segmentByKeywords("Stem", ["stem"])).toEqual([{ text: "Stem", hit: false }]);
  });
});

describe("从 matchedKeywords 取关键词", () => {
  it("取出并去掉空值", () => {
    expect(keywordStrings([{ keyword: "a" }, { keyword: "" }, { keyword: " b " }, {}])).toEqual(["a", "b"]);
  });

  it("undefined 返回空数组", () => {
    expect(keywordStrings(undefined)).toEqual([]);
  });
});
