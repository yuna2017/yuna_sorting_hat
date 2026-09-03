# YUNA 分部帽

燕山大学网络与信息协会招新用的分部帽小游戏。12 道选择题，判定你属于哪个部门。

它不只是一个测试页 —— 完整链路是：

```
封面 → 开场 → 答题 → 分院仪式 → 结果 → 了解部门 → 招新入口 → 分享
```

**核心设计**：结果是中间节点而不是终点。用户看完要知道**为什么是这个部门**、**这个部门在做什么**、**接下来去哪报名**。

**权威文档**在 [docs/](docs/)。见 [文档索引](docs/README.md) —— **Markdown 是唯一信息源**（代码和导出件从这里同步）。

## 项目状态

✅ **核心功能已完成**：五阶段流程、零随机判定、分享码复现、题库校验、单元测试。

✅ **P0 已完成**：
- 四个部门正式资料输入代码（来自 [docs/部门收集材料.md](docs/部门收集材料.md)）
- 外链检查与安全配置（target/rel）
- 移动端与桌面端浏览器验收（Android、iOS、微信等环境）
- v3 题库冻结与发布记录

详见 [docs/TODO.md](docs/TODO.md)。

## 开发

```bash
npm install
npm run dev        # http://localhost:5173/yuna_sorting_hat/
npm test           # 题库不变量 + 计分引擎 + 结果解释 + 分享码
npm run simulate   # 题库分布模拟（四部门胜率、并列率等）
npm run build      # tsc -b && vite build
npm run preview    # 按 base 路径预览产物，部署前用这个复核
```

**注意**：dev/preview 地址带 `/yuna_sorting_hat/` 前缀，与 GitHub Pages 上的 `base` 一致（见 [vite.config.ts](vite.config.ts)）。

## 目录结构

| 关注点 | 位置 |
| --- | --- |
| 五阶段流程与状态机 | [src/App.tsx](src/App.tsx) |
| 分院仪式（揭晓前的过场） | [src/screens/RevealScreen.tsx](src/screens/RevealScreen.tsx) |
| 结果页十层信息 | [src/screens/ResultScreen.tsx](src/screens/ResultScreen.tsx) |
| 题库（题面／选项／低语／权重指针） | [src/data/questions.ts](src/data/questions.ts) |
| 部门信息、招新入口、活动期配置 | [src/data/departments.ts](src/data/departments.ts)、[src/data/campaign.ts](src/data/campaign.ts) |
| 计分、归一化、并列决胜 | [src/lib/scoring.ts](src/lib/scoring.ts) |
| 「为什么是这个部门」的解释 | [src/lib/explain.ts](src/lib/explain.ts) |
| 分享码与分享文案 | [src/lib/shareCode.ts](src/lib/shareCode.ts) |
| 题库不变量校验 | [src/lib/validateBank.ts](src/lib/validateBank.ts) |

## 判定规则

题目、权重与并列决胜规则的权威定义在 [docs/题目.md](docs/题目.md)。

三条容易踩的硬约束：

1. **归一化除的是单部门满分（题数 × 3 = 30），不是总分。** 除总分会把雷达四轴压扁。
2. **决胜全程零随机**，否则同一份答案刷新会变结果、分享链接无法复现。
3. 每题必须「4 个选项各主推一个不同部门 + 4 个副推构成无固定点置换」。
   `npm test` 会守住这条；**改题后请务必跑一次**。

加题不需要改判定逻辑 —— 满分自动变成 `题数 × 3`。决胜题由数据里的
`decider: true` 标记，不是硬编码的题号。

分院仪式与结果解释都**不参与判定**：`verdict` 在 `App` 里由 `resolveWinner()`
一次算好，仪式只是延迟说出来，`explainVerdict()` 只是回读用户自己的选择。
所以跳过仪式、开启「减少动态效果」、用分享链接直达，结果都完全一致。

## 结果页信息层级

按「先讲故事、再展示数据、最后引导行动」排列：

```
1 你的部门        2 帽子为什么这么判      3 关键词
4 四部门契合度    5 关于这个部门          6 代表项目 / 招新入口
7 分享结果              8 再测一次
```

雷达图**刻意不放在最前面** —— 它是参考，不是结论。页尾那句「仅用于娱乐与自我探索」
也请保留，避免把分数读成心理测评。

## 修改部门信息

改 [src/data/departments.ts](src/data/departments.ts) 一处即可，组件不用动。

每个部门需要：

| 字段 | 说明 |
| --- | --- |
| `tagline` | 一句话定位，讲事实（`slogan` 负责氛围，两者分工） |
| `intro` | 我们主要做什么。不要写「充满活力、团结协作」这类宣传稿 |
| `doing` | 进来会接触到的具体事情，2～4 条 |
| `suitedFor` | 适合什么样的人，让新生自己判断 |
| `actions` | 招新入口，见下 |
| `contentDraft` | 内容经社团核对后改成 `false` |

`actions` 里每条的 `href` 允许暂时为 `null` —— 结果页会渲染成「入口待补充」的
静态条目，而不是一个点进去 404 的死链。填了真实 URL 才变成可点的外链。

> **公开页面注意**：这一页会被部署并到处分享。招新入口只放协会**公共**渠道
> （官网、公众号、报名表、公开仓库）。不要写个人手机号、私人 QQ/微信、群管理链接、
> 内网地址或任何凭据。

当前四个部门已接入正式摘要、官网详情、部门文章和 2026 届公共招新入口，`contentDraft` 均已改为 `false`。
开发模式下仍会逐条报告后来新增的空字段、失效占位或未核对内容。

## 分享

结果链接形如 `?v=3&s=<抽题种子>&a=<12位答案码>`：`s` 决定从题池抽出哪 12 道题，`a` 编码每题
的选择。判定零随机，同一链接在任何设备上都还原出同一个结果；v1/v2 未正式发布，旧链接直接拒绝。

结果页提供两种分享模式：
· **网页模式** —— 复制 / 系统分享可复现链接；
· **图片模式** —— 本地合成 1080×1920 竖版海报（可填昵称），支持系统分享图片、保存图片，
  以及微信 / iOS 里的长按保存降级。
海报二维码由 `VITE_PUBLIC_ORIGIN` 控制（见「部署」），题库冻结后配置才启用，避免把
开发地址永久印进一张会被无限转发的图片。

## 部署

推到 `main` 即由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
自动构建并发布到 GitHub Pages（仓库 Settings → Pages → Source 选 **GitHub Actions**）。

其他平台（Cloudflare Pages / Vercel / Netlify / 自有服务器等）部署**无需改代码**，
只需在平台设置以下构建环境变量后重新构建：

| 环境变量 | 含义 | 根路径部署（自定义域名 / *.pages.dev） | 子路径部署（GitHub Pages） |
|---|---|---|---|
| `VITE_BASE` | 资源路径（同 vite.config.ts 的 base） | `/` | `/yuna_sorting_hat/` |
| `VITE_PUBLIC_PATH` | 海报二维码路径（需与 base 一致） | 不设（默认 `/`） | `/yuna_sorting_hat/` |
| `VITE_PUBLIC_ORIGIN` | 海报二维码域名（不含路径）；不设则不启用海报二维码 | `https://你的域名` | 同左 |

`VITE_PUBLIC_ORIGIN` 是海报功能的发布闸门：不设置时生产环境不出现「图片模式」
入口，也不会把本地开发地址印进二维码。换仓库名或上自定义域名时同样只改环境变量。

## 字体

**刻意不引 Google Fonts。** fonts.googleapis.com 在中国大陆不可达，而受众正是
国内高校新生 —— render-blocking 的外链样式表会把首屏拖到超时。中文与拉丁展示字
都走系统衬线栈。将来若要换字体，请**自托管 woff2** 打进产物；
`--font-display` 已把 `'Cinzel'` 放在首位，丢进字体文件即自动生效。

## 本轮范围

已完成：封面（昵称）→ 开场独白 → 答题（12 题，随进度有帽子旁白）→ **分院仪式**（帽子「记得你」）
→ 结果（解释 + 行为身份 + 四部门契合度雷达 + 五特质画像雷达/倾向 → 「关于部门」+ 招新入口 + 分享）。

题库为 **v3 槽位化**（12 槽 × 2 候选，每场抽 12 题）；题面 / 选项 / 低语 / 点评文案已全量打磨为
「贴合语境、像人说话、收尾圆润」；部门与特质解耦（p/s 决部门、traits 决画像）。

本轮新增 / 收尾：
· **帽子人格状态机 + 记得玩家**（`src/lib/hatVoice.ts`）：答题进度旁白、揭晓前按主导特质
  说一句「记得你」，全程零随机、不参与判定；
· **五特质画像雷达**（`TraitRadar`）加入结果页「你的五个倾向」区，与四部门雷达并列展示；
· **题库分布模拟补全**：决胜层级 / 领先分差统计 + 策略测试（单一倾向、边界确定性），
  基线见 [`docs/题库模拟基线.md`](docs/题库模拟基线.md)；
· **行为身份红线测试**（`identity.test.ts`）：防心理诊断 / 能力评判措辞写歪。

**下一阶段**：维护已冻结的 v3 题库和发布记录，根据协会确认补充代表项目或作品链接。分享卡、保存图片、行为身份、部门微型故事骨架和海报底部招新群卡片已接入；引流到其他项目暂不纳入本阶段。

后续可选增强是核对每部门 2～3 个结果后微型故事。它们只用于解释和代入，不重新判定部门，也不把项目扩展为完整人生模拟器。音效和访问统计暂缓。当前 v3 题库已冻结，后续变更必须升级题库版本并评估旧分享链接影响。

## 本地视觉验证（可选）

两个脚本用真实浏览器跑一遍应用。需要 Playwright，但**不进** `package.json`
（否则 CI 每次都要装）：

```bash
npm i --no-save playwright          # 复用系统已安装的 Edge，不额外下载浏览器
node shoot.mjs                      # 全流程截图 + 分享交互 + 320/360/390/412 溢出检查
node check-depts.mjs                # 逐个验四个部门的主题、立绘、介绍与招新入口
```

`shoot.mjs` 还会检查：仪式能否跳过、`prefers-reduced-motion` 下是否被压缩、
复制的链接是否真的可复现、外链是否带 `rel=noopener`。输出在 `screenshots/`（已 gitignore）。

部分移动端尺寸已验证可正常使用；iOS Safari、Android Chrome 与微信内置浏览器仍需继续完成真机验收。
