import { describe, it, expect } from "vitest";
import { passesSourceTopicGate } from "@/lib/monitor/topic-gate";

// 按来源的主题门槛：PetaPixel 只收 AI 影像相关，其余来源不受影响

describe("passesSourceTopicGate", () => {
  it("PetaPixel：AI 影像相关的标题放行", () => {
    for (const t of [
      "Instagram Launches AI Assistant That Analyzes Your Reels",
      "The A.I. Chatbot Dilemma",
      "Evoto Adds Portrait Retouching to Video, Intelligent Culling, Mobile Tethering, and More",
      "You Can Edit Your Photos With Lightroom and Photoshop Inside Google Gemini",
      "Meta’s Oversight Board Orders the Company to Remove Deepfake Videos From Facebook",
      "I Turned Jordan Drake Into a Knight Using ChatGPT’s New Image Model",
    ]) {
      expect(passesSourceTopicGate("petapixel_feed", t), t).toBe(true);
    }
  });

  it("PetaPixel：纯摄影/硬件/野生动物新闻挡掉", () => {
    for (const t of [
      "Early Print of Dorthea Lange’s Migrant Mother Valued at $150K",
      "Award-Winning Photo of City-Dwelling Beavers Celebrates Wildlife’s Strength",
      "Fujifilm Increases Japanese Camera Prices by up to 23%",
      "Apple iPhone 18 Pro Camera Review: Small Changes, Big Differences",
      "Photographer Retraces William the Conqueror’s Route Across England",
    ]) {
      expect(passesSourceTopicGate("petapixel_feed", t), t).toBe(false);
    }
  });

  it("「AI」按整词匹配，不会误中 Thai / Daily / Hawaii 这类词", () => {
    expect(passesSourceTopicGate("petapixel_feed", "A Daily Walk Through Hawaii and Thailand")).toBe(false);
  });

  it("没设门槛的来源一律放行（AI 工具官方博客本身就对口）", () => {
    expect(passesSourceTopicGate("suno_blog", "Introducing Speech (beta)")).toBe(true);
    expect(passesSourceTopicGate("elevenlabs_blog", "")).toBe(true);
  });
});
