# YUNA 分部帽

燕山大学网络与信息协会招新用的分部帽小游戏。10 道选择题，判定你属于哪个部门。

策划文档在 [docs/](docs/) —— **`.md` 是唯一信息源**（`.docx` 只是同一份内容的导出件）。

## 开发

```bash
npm install
npm run dev        # http://localhost:5173/yuna_sorting_hat/
npm test           # 题库不变量 + 计分引擎 + 分享码
npm run build      # tsc -b && vite build
npm run preview    # 按 base 路径预览产物，部署前用这个复核
```

注意 dev/preview 的地址都带 `/yuna_sorting_hat/` 前缀 —— 与 GitHub Pages 上的
`base` 一致，见 [vite.config.ts](vite.config.ts)。

## 判定规则

题目、权重与并列决胜规则的权威定义在 [docs/题目.md](docs/题目.md)，代码里对应：

| 关注点 | 位置 |
| --- | --- |
| 题库（题面／选项／低语／权重指针） | [src/data/questions.ts](src/data/questions.ts) |
| 部门元信息、标语、待填文案槽 | [src/data/departments.ts](src/data/departments.ts) |
| 计分、归一化、并列决胜 | [src/lib/scoring.ts](src/lib/scoring.ts) |
| 题库不变量校验 | [src/lib/validateBank.ts](src/lib/validateBank.ts) |

三条容易踩的硬约束：

1. **归一化除的是单部门满分（题数 × 3 = 30），不是总分。** 除总分会把雷达四轴压扁。
2. **决胜全程零随机**，否则同一份答案刷新会变结果、分享链接无法复现。
3. 每题必须「4 个选项各主推一个不同部门 + 4 个副推构成无固定点置换」。
   `npm test` 会守住这条；改题后请务必跑一次。

加题不需要改判定逻辑 —— 满分自动变成 `题数 × 3`。决胜题由数据里的
`decider: true` 标记，不是硬编码的题号。

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

已完成：封面 → 开场独白 → 答题 → 结果（雷达图 + 四项读数）。

**未做（留了接缝）**：分享卡 UI、招新二维码、结果揭示仪式动画、音效。
分享所需的答案编解码已在 [src/lib/shareCode.ts](src/lib/shareCode.ts) 就位，
URL 带 `?a=<10位码>` 即可直接复现某份结果，做 UI 时不用回头改状态设计。

待社团填写：各部门的 `intro`（部门介绍）与 `links`（招新/作品链接），
见 `src/data/departments.ts`。未填写时结果页不渲染对应区块，不会留半截空白；
开发模式下控制台会列出还缺哪些。

## 本地视觉验证（可选）

两个脚本用真实浏览器跑一遍应用。需要 Playwright，但**不进** `package.json`
（否则 CI 每次都要装）：

```bash
npm i --no-save playwright          # 复用系统已安装的 Edge，不额外下载浏览器
node shoot.mjs                      # 四屏截图 + 320px 横向溢出检查
node check-depts.mjs                # 用分享链接逐个验四个部门的主题与立绘
```

输出在 `screenshots/`（已 gitignore）。
