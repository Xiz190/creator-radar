import { describe, expect, it } from "vitest";
import { pickLens, pickSourceName } from "@/lib/localized-fields";

describe("按界面语言挑创作者视角", () => {
  const both = { creatorLens: "中文句", creatorLensEn: "English line" };

  it("两种语言都在时各取各的", () => {
    expect(pickLens(both, "zh")).toBe("中文句");
    expect(pickLens(both, "en")).toBe("English line");
  });

  it("英文缺失时回退中文——不能因为缺英文就让整块消失", () => {
    expect(pickLens({ creatorLens: "中文句", creatorLensEn: null }, "en")).toBe("中文句");
    expect(pickLens({ creatorLens: "中文句" }, "en")).toBe("中文句");
  });

  it("中文缺失时回退英文", () => {
    expect(pickLens({ creatorLens: null, creatorLensEn: "English line" }, "zh")).toBe("English line");
  });

  it("两种都没有才返回 null", () => {
    expect(pickLens({}, "zh")).toBeNull();
    expect(pickLens({ creatorLens: "", creatorLensEn: "" }, "en")).toBeNull();
    expect(pickLens({ creatorLens: null, creatorLensEn: null }, "zh")).toBeNull();
  });

  it("纯空白的 lens 视同缺失", () => {
    expect(pickLens({ creatorLens: "   ", creatorLensEn: "English line" }, "zh")).toBe("English line");
    expect(pickLens({ creatorLens: "中文句", creatorLensEn: "  " }, "en")).toBe("中文句");
  });
});

describe("按界面语言挑来源名", () => {
  const both = { displayName: "Luma·官方新闻", displayNameEn: "Luma · News" };

  it("两种语言都在时各取各的", () => {
    expect(pickSourceName(both, "zh")).toBe("Luma·官方新闻");
    expect(pickSourceName(both, "en")).toBe("Luma · News");
  });

  it("缺一种时回退另一种（来源名不该在界面上消失）", () => {
    expect(pickSourceName({ displayName: "Suno·官方博客", displayNameEn: null }, "en")).toBe("Suno·官方博客");
    expect(pickSourceName({ displayName: null, displayNameEn: "Suno · Blog" }, "zh")).toBe("Suno · Blog");
  });

  it("两种都没有才返回 null", () => {
    expect(pickSourceName({}, "en")).toBeNull();
    expect(pickSourceName({ displayName: "  ", displayNameEn: "" }, "zh")).toBeNull();
  });

  it("传 null / undefined 不崩（调用方常在条件渲染里直接传可空对象）", () => {
    expect(pickSourceName(null, "en")).toBeNull();
    expect(pickSourceName(undefined, "zh")).toBeNull();
    expect(pickLens(null, "en")).toBeNull();
    expect(pickLens(undefined, "zh")).toBeNull();
  });
});
