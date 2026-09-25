# Creator Radar · 创作者雷达

> **Radar** 框架的创作者实例 —— 一个给独立创作者的 AI 情报台：抓取 AI 工具与行业动态，用「创作者雷达」把每条翻译成「这对我做音乐 / 做 MV 意味着什么」。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-teal)](https://tailwindcss.com/)

---

## 它解决什么问题

独立创作者每天被大量 AI 工具动态淹没——Suno 发新版、Krea 出模型、Runway 改政策。信息不稀缺，**稀缺的是「这跟我有什么关系」**。

Creator Radar 把「找 → 核实 → 关联 → 分析」这条情报工作流半自动化，并在最后加一层别的聚合器没有的东西：**创作者视角**。每条动态不只是一条标题，而是一句用你的立场写的判断：

> Runway Gen-4 发布：视频时长延至 2 分钟
> 〔创作者视角〕 能做更长的 MV 单镜了，但转场和画风统一还得你后期盯。

---

## 核心差异化：Creator Radar（创作者视角层）

这是本项目的护城河。它不是一个「关键词匹配分类器」，而是一个**基于 LLM 的创作者视角生成层**：

- **三层知识库**（`knowledge/lens/`）—— 改文件即可调视角，不碰代码：
  - `persona.md` · 个人层：你是谁、怎么说话（每个创作者一份）
  - `objective.md` · 客观层：分析框架 + 事实性知识（带来源 / 时间标注，可共享）
  - `examples.md` · 样例层：你认可的范例，风格越用越稳
- **客观 ⊕ 个人解耦**：共享一份客观底座，每人一份个人视角 =「每个人自己的知识库」
- **价值分级**：LLM 同时判断「这条对创作者是高 / 中 / 低价值」，用于排序与「高优先级」标记

---

## 真实数据

**15 个活跃源、917 条真实数据**（截至 2026-09-25），全部来自公开接口 / 公开 RSS / 公开网页：

| 类型 | 源 |
|---|---|
| AI 工具官方 | Suno · ElevenLabs · Pika · Krea · Luma · Runway · Mubert · Splice · Stability AI |
| 行业媒体 | CDM · Synthtopia · Music Ally · PetaPixel · 量子位 |
| 创作机会 | 国家艺术基金 |

**合规声明**：不涉及登录、绕过反爬、或抓取任何私密数据。被强反爬拦截的源（Midjourney / Ideogram / Leonardo）与不可用的 SPA 死链源（CAPA）已主动排除——详见 [`docs/数据源说明-已知局限.md`](docs/数据源说明-已知局限.md)。

---

## 架构

```
数据层（list + runner 爬虫架构）
  ├─ 官方博客 / RSS / sitemap / 公开 API  → 列表抓取
  └─ 详情抓取（正文提取 + 评论区/样板过滤）
        ↓
视角层（creator-lens + 三层知识库 + DeepSeek）
  ├─ 创作者视角一句话
  └─ 价值分级（高 / 中 / 低）
        ↓
呈现层（情报流 / 详情 / 信号雷达）
  └─ 每条动态 = 标题 + 来源 + 创作者视角
```

---

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | Next.js 16（App Router）+ TypeScript 5 |
| 数据库 | PostgreSQL 16 |
| 样式 | Tailwind CSS 4 |
| AI | DeepSeek（OpenAI 兼容协议） |
| 测试 | Vitest（820 个用例） |

---

## 快速开始

```bash
npm install
cp .env.local.example .env.local   # 配置 DATABASE_URL 与 LLM_API_KEY
npm run dev                        # 开发模式
npm run build                      # 生产构建
npm run test                       # 单元测试
```

---

## 文档

- [`docs/数据源说明-已知局限.md`](docs/数据源说明-已知局限.md) — 数据源总览、合规声明、设计取舍与踩坑复盘

---

## License

MIT
