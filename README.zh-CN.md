# Creator Radar · 创作者雷达

**中文** · [English](README.md)

> 一个给独立音乐人的 AI 情报台：定时从官方渠道和专业媒体抓取 AI 工具和行业动态，每条都告诉你——这对你做音乐、做 MV 意味着什么。

**在线演示**：<https://creator-radar-xiz.vercel.app>（演示模式：访客可浏览、搜索、使用问答助手；写操作与管理后台仅作者可用） 手机伴侣版：[/m](https://creator-radar-xiz.vercel.app/m)。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-teal)](https://tailwindcss.com/)

---

## 它解决什么问题

AI 和互联网发展太快，每天都有新东西冒出来，信息早就过载了。

但独立创作者真正的问题不是信息少，而是——Suno 发新版、Krea 出模型、Runway 改政策，这些跟我做音乐、做 MV 到底有什么关系？

Creator Radar 把「找 → 核实 → 关联 → 分析」这条情报工作流半自动化，并在最后加一层别的聚合器没有的东西：创作者视角。

每条动态不只是一条标题，而是一句用你的立场写的判断。比如线上真实的一条：

> ElevenLabs unveils ‘Music v2.5’ – but UMG wasn’t involved  
> 〔创作者视角〕盯它人声和声学乐器的真实度，拿它出编曲草稿，人声和混音还得你自己收尾。

一句话：帮你盯 AI 动态，再翻译成「这跟我做音乐、做 MV 有什么关系」。

- **不用自己追**：定时抓取，频率可以自己设。本地可以随时跑；线上演示用的是免费部署，所以每 6 小时抓一次
- **不用自己辨真假**：只收 AI 工具的官方渠道和固定几家专业媒体，每条都标明来源，避开网上那些 AI 生成、转述走样或不官方的信息
- **先帮你理解一遍**：每条附一句创作者视角的解读。它由 LLM 按视角层的设定生成，带着立场和人的口气，是帮你快速判断的参考，不是标准答案

---

## 核心差异化：Creator Radar（创作者视角层）

这是本项目的核心。它不是一个「关键词匹配分类器」，而是一个**基于 LLM 的创作者视角生成层**：

- **三层知识库**（`knowledge/lens/`）—— 改文件即可调视角，不碰代码（步骤见[换成你自己的视角](#换成你自己的视角)）：
  - `persona.md` · 个人层：你是谁、怎么说话（每个创作者一份）
  - `objective.md` · 客观层：分析框架 + 事实性知识（带来源 / 时间标注，可共享）
  - `examples.md` · 样例层：你认可的范例。加进来的范例越多，风格越稳
- **客观 ⊕ 个人解耦**：共享一份客观底座，每人一份个人视角 =「每个人自己的知识库」
- **价值分级**：LLM 同时判断「这条对创作者是高 / 中 / 低价值」，再结合关键词识别出的重大发布信号，定出 核心 / 重点 / 中等 / 普通 四档，用于排序与「高优先级」标记

---

## 真实数据

**15 个活跃源，每条都带创作者视角**；线上每 6 小时自动增长，全部来自公开接口 / 公开 RSS / 公开网页。实时数据量见 [`/api/monitor/corpus-stats`](https://creator-radar-xiz.vercel.app/api/monitor/corpus-stats)：

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
  └─ 详情抓取（正文提取 + 过滤评论区和大部分样板内容）
        ↓
视角层（creator-lens + 三层知识库 + DeepSeek）
  ├─ 创作者视角一句话
  └─ 价值分级（高 / 中 / 低）
        ↓
呈现层（情报流 / 详情 / 信号雷达）
  └─ 每条动态 = 标题 + 来源 + 创作者视角
```

---

## 这个项目是怎么做出来的

我是 UC San Diego ICAM（跨学科计算与艺术）专业的学生，不是科班出身的软件工程师。这个项目起源于我实习时给自己做的一个小工具（完整经过见 [政策雷达](https://github.com/Xiz190/policy-radar)）。后来我发现，它的本质跟政策无关，而是「盯住我在乎的来源，告诉我什么变了、为什么重要」，于是针对自己的领域——音乐和 AI 辅助创作——从零重做了一遍。

**我负责的部分**：
- 问题怎么定义、做哪个领域
- 收哪些数据源、哪些子页面能正确抓取、砍掉哪些
- 分类体系，以及创作者视角的设计（三层知识库和价值分级），把我自己的立场和背景写进视角层
- 「相关动态」：很多网站之间有联动或前后承接，所以每条动态会按同一主题、同一来源、互相引用三种关系，连到相关内容
- 用户体验、前端设计和交互，包括手机伴侣版的迭代，以及为了让范围可控而砍掉的功能
- 核对数据：我会定期打开原网页，看爬下来的内容和原文是否一致。正是这样，我发现正文里混进了「See all」「Show details」「Discussion」这类界面文字。现在大部分已经过滤掉，但个别网站还会漏一些

**AI 做的部分**：大部分代码是 Claude Code（Anthropic）按我的要求写的。我负责审阅改动、运行和检查测试、决定上线什么。

**下一步**：把情报推送到微信、飞书，并接入 OpenClaw（龙虾）这类 AI 代理，让它们能在这些情报的基础上做整体分析。

---

## 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | Next.js 16（App Router）+ TypeScript 5 |
| 数据库 | PostgreSQL 16 |
| 样式 | Tailwind CSS 4 |
| AI | DeepSeek（OpenAI 兼容协议） |
| 测试 | Vitest（854 个用例） |

---

## 快速开始

需要准备：Node.js、PostgreSQL 16、一个 OpenAI 兼容协议的大模型 API key（DeepSeek、OpenAI 等都可以）。

```bash
npm install
cp .env.local.example .env.local                  # 填 DATABASE_URL 和 LLM_*（见下）

createdb creator_radar                            # 库名随意，和 DATABASE_URL 对上
psql -d creator_radar -f schema.sql               # 建表
psql -d creator_radar -f creator-seed.sql         # 写入 15 个数据源和关键词

npx tsx --env-file=.env.local scripts/crawl.ts    # 抓一轮，并自动生成创作者视角
npm run dev                                       # 打开 http://localhost:3000
```

`.env.local` 里大模型这三行默认是注释掉的，取消注释并填上。以 DeepSeek 为例：

```bash
LLM_API_KEY=sk-你的key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

- 大模型 API 一般**按用量付费**，用的是你自己的 key、花你自己的额度。每条动态会中英文各调用一次，单条成本很低，但请留意余额。
- 不配 key 也能抓取和浏览，只是动态下面不会有创作者视角那一句。
- `init-data.sql` 是早期政务版遗留的初始数据，这个项目**不需要**执行它，用 `creator-seed.sql` 就够了。
- 环境变量示例有三份：本地开发用 `.env.local.example`；用 Docker 部署用 `.env.docker.example`；`.env.example` 是精简版，内容是前者的子集。
- **演示模式**：在线演示里访客只能浏览，靠的是 `PUBLIC_DEMO=1` 加 `ADMIN_TOKEN`。作者在 `/unlock` 页输入口令后解锁全部功能。自己部署时如果需要同样的效果，在 `.env.local.example` 第 3 节有说明；本地开发不用开。

其他命令：`npm run build`（生产构建）、`npm run test`（单元测试）。

---

## 换成你自己的视角

仓库里的 `knowledge/lens/persona.md` 是一份**虚构的示例创作者**，不是作者本人。要让判断按你的立场来写，按下面的步骤做：

**1. 改身份。** 编辑 `knowledge/lens/persona.md`（中文视角）和 `persona.en.md`（英文视角），把「你的身份与立场」换成你自己：做什么、用什么工具、在乎什么。文件里的口吻规则和信息量底线建议保留，它们决定句子是否短、准、有用。

**2. （可选）加范例。** 在 `examples.md` / `examples.en.md` 里加几句你认可的点评。范例越多，风格越稳。`objective.md` 是共享的分析框架和事实知识，一般不用动。

**3. 不用改代码。** 每次生成时，`src/lib/monitor/creator-lens.ts` 会读取这几份文件作为系统提示，再连同动态的标题和正文前 1500 字一起发给大模型，生成的那一句会存进数据库，前端只负责显示。

**4. 新动态自动用新视角。** 之后每次运行 `scripts/crawl.ts`，抓完都会自动给新条目补视角（每轮中英各最多 40 条，没补完的下一轮继续）。第一次抓取条目较多时，可以手动一次补完：

```bash
npx tsx --env-file=.env.local scripts/gen-lens.ts all      # 中文
npx tsx --env-file=.env.local scripts/gen-lens-en.ts all   # 英文
```

**5. 旧动态不会自动重写。** 补视角只处理「还没有视角」的条目，已经写好的（包括你手动改过的）不会被覆盖。如果想让旧条目也按新立场重写，先清空，再运行第 4 步的两条命令：

```sql
-- ⚠️ 会清掉所有已有的视角，包括你手动校准过的句子；重新生成要再调用一遍大模型
update monitor_items set creator_lens = null, creator_lens_en = null
where list_published_at >= '2026-01-01';
```

**6. 定时抓取需要自己配。** 这个公开仓库不带定时任务。在线演示的定时抓取放在作者的私有部署里跑，因为它要用到数据库地址和 API 密钥，所以没有放进公开仓库。想让它定期更新，可以用系统的 cron、GitHub Actions 等方式定时运行 `scripts/crawl.ts`，记得把 `DATABASE_URL` 和 `LLM_*` 配进对应环境。如果你的抓取是在 GitHub 上跑的，改完 persona **要提交并推送**，它才会读到新文件。

---

## 文档

- [`docs/数据源说明-已知局限.md`](docs/数据源说明-已知局限.md) — 数据源总览、合规声明、设计取舍与踩坑复盘

---

## License

MIT
