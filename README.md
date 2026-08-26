# YUNA 分部帽

燕山大学网络与信息协会招新用的分部帽小游戏。10 道选择题，判定你属于哪个部门。

它不只是一个测试页 —— 完整链路是：

```
封面 → 开场 → 答题 → 分院仪式 → 结果 → 了解部门 → 招新入口 → 分享
```

「结果」是中间节点而不是终点：用户看完要知道**为什么是这个部门**、
**这个部门在做什么**、**接下来去哪报名**。

策划文档在 [docs/](docs/) —— **`.md` 是唯一信息源**（`.docx` 只是同一份内容的导出件）。

## 开发

```bash
npm install
npm run dev        # http://localhost:5173/yuna_sorting_hat/
npm test           # 题库不变量 + 计分引擎 + 结果解释 + 分享码
npm run build      # tsc -b && vite build
npm run preview    # 按 base 路径预览产物，部署前用这个复核
```

注意 dev/preview 的地址都带 `/yuna_sorting_hat/` 前缀 —— 与 GitHub Pages 上的
`base` 一致，见 [vite.config.ts](vite.config.ts)。

## 目录结构

| 关注点 | 位置 |
| --- | --- |
| 五阶段流程与状态机 | [src/App.tsx](src/App.tsx) |
| 分院仪式（揭晓前的过场） | [src/screens/RevealScreen.tsx](src/screens/RevealScreen.tsx) |
| 结果页九层信息 | [src/screens/ResultScreen.tsx](src/screens/ResultScreen.tsx) |
| 题库（题面／选项／低语／权重指针） | [src/data/questions.ts](src/data/questions.ts) |
| 部门信息、招新入口、待填文案槽 | [src/data/departments.ts](src/data/departments.ts) |
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
4 四部门契合度    5 关于这个部门          6 招新入口
7 分享结果        8 再测一次
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

当前四个部门的介绍是**占位草稿**（`contentDraft: true`）。正式资料即将加入；部门详细介绍将优先链接到社团官网，结果页只保留必要摘要和行动入口。
开发模式下控制台会逐条列出还缺什么。

## 分享

结果链接形如 `?a=<10位码>`，只编码「每题选了哪个选项」。因为判定零随机、
选项洗牌只影响显示顺序，同一份码在任何设备上都还原出同一个结果。

结果页提供「复制结果链接」，支持 `navigator.share` 的浏览器还会多一个「分享到…」。
剪贴板不可用时（非 HTTPS、部分内置浏览器）会降级成一个只读输入框让用户手动复制 ——
不会只在控制台报错、界面毫无反应。

> 分享码不含题库版本号。**改题会让旧链接的结果变化**，招新期内请不要动题库。

## 部署

推到 `main` 即由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
自动构建并发布到 GitHub Pages（仓库 Settings → Pages → Source 选 **GitHub Actions**）。

换仓库名或上自定义域名（根路径）时，设环境变量 `VITE_BASE` 覆盖即可。

## 字体

**刻意不引 Google Fonts。** fonts.googleapis.com 在中国大陆不可达，而受众正是
国内高校新生 —— render-blocking 的外链样式表会把首屏拖到超时。中文与拉丁展示字
都走系统衬线栈。将来若要换字体，请**自托管 woff2** 打进产物；
`--font-display` 已把 `'Cinzel'` 放在首位，丢进字体文件即自动生效。

## 本轮范围

已完成：封面 → 开场独白 → 答题 → **分院仪式** → 结果（解释 + 雷达图 + 部门介绍 +
招新入口 + 分享链接）。

**下一阶段**：接入部门正式资料和社团官网链接；设计分享卡、二维码与保存图片。
分享卡中的雷达图计划突出并标注 **50 分辅助线**，帮助用户直观看出兴趣倾向。
音效和访问统计暂缓。题目本轮**未改动** —— 改题会影响已发出的分享链接，需单独排期。

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
