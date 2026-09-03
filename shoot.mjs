// 本地视觉验证：用真实浏览器驱动应用。
//   1) 全流程截图（含分院仪式）+ 四档窄屏横向溢出检查
//   2) 结果页新增分层、招新入口与分享交互
//   3) 用分享链接逐个验四个部门的主题、立绘与判定
//
// 需要 Playwright，但不进 package.json（否则 CI 每次都要装）：
//   npm i --no-save playwright
//   node shoot.mjs
import { chromium } from 'playwright'

const BASE = process.env.TARGET ?? 'http://localhost:5173/yuna_sorting_hat/'
const OUT = process.env.OUT ?? 'screenshots'

/* 需求文档点名的四档窄屏。320 是下限，412 是主流 Android。
   只测 390 会漏掉 320 的横向溢出 —— 这是移动端最常见的翻车点。 */
const VIEWPORTS = [320, 360, 390, 412]

/* 必须跟 src/data/questions.ts 对齐：抽题数（槽位数）= 分享码长度，v = QUESTION_POOL.version。
   当前 v3 槽位化阶段共 3 槽（q1/q2/q12），补齐到 12 槽时改这两个数。
   DRAW_SEED 是抽题种子：v3 起分享链接必须带 &s=，否则无法重建对方做过的那组题。 */
const QUESTION_COUNT = 12
const BANK_VERSION = 3
const DRAW_SEED = 1

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14 逻辑像素
  deviceScaleFactor: 2,
  /* 注意：这里**不开** reducedMotion —— 分院仪式在 reduce 下会被压缩掉，
     开着就永远验不到仪式的真实时序。reduce 分支单独在下面验。
     代价是打字机不再瞬间完成，所以开场要显式点「跳过」。 */
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()

const errors = []
page.on('console', (m) => {
  // 开发模式那条「待填文案」warn 是预期的，不算错误
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log(`  ✓ ${name}.png`)
}

/** 走完全部题目。每题点第一个选项，说明卡展开后再点吸底的推进按钮。 */
async function answerAll(p) {
  for (let i = 0; i < QUESTION_COUNT; i++) {
    /* 每题都必须显式选 + 显式推进：已经没有自动前进了，
       而推进按钮改成了常驻（未作答时 disabled），
       所以不能再用「按钮是否可见」来判断这题答没答。 */
    await p.locator('main ul li button').first().click()
    const next = p.getByRole('button', { name: /下一题|揭晓结果/ })
    const label = await next.textContent()
    await next.click() // Playwright 会自动等它从 disabled 变为 enabled
    await p.waitForTimeout(250)
    if (label?.includes('揭晓')) return
  }
}

console.log('封面：')
// 不能用 networkidle —— Vite 的 HMR websocket 常开，网络永远不会 idle
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: '戴上帽子' }).waitFor({ timeout: 15000 })
await page.waitForTimeout(600) // 等字体与 SVG 稳定
await shot('1-cover')

console.log('开场：')
await page.getByRole('button', { name: '戴上帽子' }).click()
await page.waitForTimeout(400)
await shot('2-opening')
await page.getByRole('button', { name: '跳过 →' }).click()

console.log('答题：')
await page.getByRole('button', { name: '开始' }).click()
await page.waitForTimeout(300)
await shot('3-quiz-unanswered')

// 先看一次「已选 + 说明卡展开」的状态。
// 等 900ms 而不是 400ms：要让展开动画走完、低语大致打出来，
// 否则截到的是一张半开的卡片。
await page.locator('main ul li button').first().click()
await page.waitForTimeout(900)
await shot('4-quiz-answered')

await answerAll(page)

console.log('分院仪式：')
// 候选部门已经出现、但还没宣判的那一刻
await page.waitForTimeout(2400)
const inReveal = await page.getByRole('button', { name: '跳过 →' }).isVisible()
// 编号用 4b 而不是重排后面的序号 —— screenshots/ 里那几个文件名已被跟踪，
// 改名只会留下一批再也不会更新的旧图
await shot('4b-reveal')
console.log(`  ${inReveal ? '✓' : '✗'} 仪式在最后一题后出现，且可跳过`)

console.log('结果：')
// 不等满 5.4 秒，直接跳过 —— 顺带验证跳过真的能提前结束仪式
await page.getByRole('button', { name: '跳过 →' }).click()
await page.locator('h1').waitFor({ timeout: 8000 })
await page.waitForTimeout(700)
await shot('5-result')

// 结果页的新增分层是否都在
const sections = await page.locator('h2').allInnerTexts()
const wanted = [
  '帽子在你身上看见了什么？',
  '四部门契合度',
  '你的五个倾向',
  '关于',
  '感兴趣？',
  '分享你的结果',
]
const missingSections = wanted.filter((w) => !sections.some((s) => s.includes(w)))
console.log(
  missingSections.length === 0
    ? `  ✓ 结果页分层齐全（${sections.length} 个区块）`
    : `  ✗ 结果页缺少区块：${missingSections.join('、')}`,
)

console.log('分享：')
/* 自动打开：结果页尾部加了约半页空白，滚到页面最底部时
   「打开分享窗口」按钮会到达画面约 1/3 处，弹窗应自动打开（每次加载仅一次）。 */
await page
  .getByRole('button', { name: '再测一次' })
  .scrollIntoViewIfNeeded()
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await page.waitForTimeout(500)
let autoOpened = (await page.getByRole('dialog').count()) === 1
if (!autoOpened) {
  // 兜底：某些环境下滚动事件迟到，再等一拍
  await page.waitForTimeout(800)
  autoOpened = (await page.getByRole('dialog').count()) === 1
}
console.log(`  ${autoOpened ? '✓' : '✗'} 滚动到底后分享弹窗自动打开`)
const modalVisible = autoOpened || (await page.getByRole('dialog').isVisible())
console.log(`  ${modalVisible ? '✓' : '✗'} 分享弹窗打开`)

/* 自动打开只能一次：手动关闭后再滚动，不允许再弹 */
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(200)
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await page.waitForTimeout(500)
const autoOnce = (await page.getByRole('dialog').count()) === 0
console.log(`  ${autoOnce ? '✓' : '✗'} 自动打开只发生一次（关闭后再滚不再弹）`)

/* 手动打开路径仍然可用 */
await page.getByRole('button', { name: '打开分享窗口' }).click()
await page.waitForTimeout(300)
/* 默认应是图片模式：海报预览直接出现，无需切 tab */
let posterReady = false
let posterDimensions = false
try {
  const poster = page.locator('img[data-poster-preview="ready"]')
  await poster.waitFor({ timeout: 15000 })
  posterReady = true
  posterDimensions = await poster.evaluate(
    (el) => el.naturalWidth === 1080 && el.naturalHeight === 1920,
  )
} catch {
  // 保留失败状态，最终汇总会让脚本退出 1
}
console.log(`  ${posterReady ? '✓' : '✗'} 默认图片模式，海报生成完成`)
console.log(`  ${posterDimensions ? '✓' : '✗'} 海报尺寸为 1080×1920`)
await page.screenshot({ path: `${OUT}/7-share-image.png`, fullPage: true })

/* 网页模式仍是可切换的备选，复制链路在这验 */
await page.getByRole('tab', { name: '网页模式' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '复制结果链接' }).click()
await page.waitForTimeout(300)
const copied = await page.getByRole('button', { name: /已复制链接/ }).isVisible()
const clipboard = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
// 种子是随机生成的，只校验格式（base36，1~7 位），不校验具体值
const codeOk = new RegExp(
  `\\?v=${BANK_VERSION}&s=[0-9a-z]{1,7}&a=[abcd]{${QUESTION_COUNT}}$`,
).test(clipboard)
console.log(`  ${copied ? '✓' : '✗'} 复制后按钮变为「已复制」`)
console.log(`  ${codeOk ? '✓' : '✗'} 剪贴板里是可复现的结果链接：${clipboard || '(空)'}`)

/* 弹窗面板应贴近视口顶部，而不是居中或沉底 */
const panelTop = await page
  .getByRole('dialog')
  .locator('.share-modal-panel')
  .evaluate((el) => el.getBoundingClientRect().top)
const panelNearTop = panelTop < 160
console.log(
  `${panelNearTop ? '✓' : '✗'} 弹窗面板贴近顶部（panelTop=${Math.round(panelTop)}px < 160）`,
)

/* 横屏高度通常只有 390px：面板不能把内容硬挤出视口，
   应在自身范围内滚动，并且滚到底后仍能访问保存按钮。 */
await page.getByRole('tab', { name: '图片模式' }).click()
await page.locator('img[data-poster-preview="ready"]').waitFor({ timeout: 15000 })
await page.setViewportSize({ width: 844, height: 390 })
await page.waitForTimeout(350)
const landscapePanel = page.locator('.share-modal-panel')
const landscapeScroll = await landscapePanel.evaluate((el) => ({
  clientHeight: el.clientHeight,
  scrollHeight: el.scrollHeight,
  overflowY: getComputedStyle(el).overflowY,
}))
const landscapeBounded = landscapeScroll.clientHeight < landscapeScroll.scrollHeight && landscapeScroll.overflowY === 'auto'
await landscapePanel.evaluate((el) => {
  el.scrollTop = el.scrollHeight
})
const landscapeBottomAction = await landscapePanel
  .getByRole('link', { name: '保存图片' })
  .evaluate((el) => {
    const panel = el.closest('.share-modal-panel')?.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    return panel !== undefined && rect.top >= panel.top && rect.bottom <= panel.bottom
  })
const landscapeOk = landscapeBounded && landscapeBottomAction
console.log(
  `  ${landscapeOk ? '✓' : '✗'} 横屏面板可内部滚动到底（${landscapeScroll.clientHeight}/${landscapeScroll.scrollHeight}，保存按钮=${landscapeBottomAction ? '可见' : '不可见'}）`,
)

/* 窄屏溢出故意在弹窗打开时测：面板是新增的定宽容器，
   又装着海报预览和长链接，是当前最容易顶宽的一屏。 */
console.log('\n窄屏横向溢出（分享弹窗打开）：')
let overflowFailures = 0
for (const width of VIEWPORTS) {
  await page.setViewportSize({ width, height: 780 })
  await page.waitForTimeout(350)
  const o = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }))
  const ok = o.scrollW <= o.clientW + 1
  if (!ok) overflowFailures++
  console.log(`  ${ok ? '✓' : '✗'} ${width}px  scrollWidth=${o.scrollW} clientWidth=${o.clientW}`)
}

// 弹窗可关闭：Esc 关闭，且分享区回到仅触发按钮
await page.setViewportSize({ width: 320, height: 780 })
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const modalClosed = (await page.getByRole('dialog').count()) === 0
const shareTriggerBack = await page.getByRole('button', { name: '打开分享窗口' }).isVisible()
// 关闭后必须解掉滚动锁，否则结果页再也滚不动
const scrollUnlocked = await page.evaluate(
  () => getComputedStyle(document.body).overflow !== 'hidden',
)
console.log(`  ${modalClosed ? '✓' : '✗'} Esc 可关闭分享弹窗`)
console.log(`  ${shareTriggerBack ? '✓' : '✗'} 分享区回到触发按钮`)
console.log(`  ${scrollUnlocked ? '✓' : '✗'} 关闭后背景滚动已解锁`)
await page.waitForTimeout(200)
await shot('6-result-320')
await page.close()

// ---- 减少动态偏好：仪式必须被压缩，不能让人干等 ----

console.log('\nreduced-motion：')
const reducedCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
})
const rp = await reducedCtx.newPage()
await rp.goto(BASE, { waitUntil: 'domcontentloaded' })
await rp.getByRole('button', { name: '戴上帽子' }).click()
await rp.getByRole('button', { name: '开始' }).click()
const startedAt = Date.now()
await answerAll(rp)
await rp.locator('h1').waitFor({ timeout: 8000 })
const elapsed = Date.now() - startedAt
// 测的是「逐题手动推进 + 被压缩的仪式」。完整仪式约 5.0s，reduce 分支只留 0.6s。
// 阈值按题数派生：每题给 300ms 的点击与切换余量，再加 600ms 仪式 + 900ms 兜底。
// 写死 5400 的话，补到 12 题后这条断言会因为题变多而误报。
const reducedBudget = QUESTION_COUNT * 300 + 1500
const reducedOk = elapsed < reducedBudget
console.log(
  `  ${reducedOk ? '✓' : '✗'} 从开始到结果页 ${elapsed}ms（reduce 下应小于 ${reducedBudget}ms）`,
)
await reducedCtx.close()

// ---- 四个部门：用分享链接逐个验主题换肤、立绘加载与判定 ----

const CASES = [
  { dept: 'dev', code: 'adadddabacdd', name: '开发部' },
  { dept: 'sec', code: 'bccaccbccbba', name: '网安部' },
  { dept: 'ops', code: 'cadbaacdbaab', name: '运维部' },
  { dept: 'pr', code: 'dbbcbbdaddcc', name: '组宣部' },
]

console.log('\n四个部门：')
let deptFailures = 0

for (const c of CASES) {
  const p = await context.newPage()
  const problems = []
  p.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  p.on('requestfailed', (r) => problems.push(`资源加载失败: ${r.url()}`))
  p.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`)
  })

  await p.goto(`${BASE}?v=${BANK_VERSION}&s=${DRAW_SEED.toString(36)}&a=${c.code}`, {
    waitUntil: 'domcontentloaded',
  })
  await p.locator('h1').waitFor({ timeout: 15000 })
  await p.waitForTimeout(700)

  const h1 = (await p.locator('h1').textContent())?.trim()
  const themed = await p.locator('[data-dept]').getAttribute('data-dept')
  // 立绘真的解码出像素了吗（而不是 404 占位）
  const imgOk = await p
    .locator('img')
    .first()
    .evaluate((el) => el.complete && el.naturalWidth > 0)
  // 分享链接直达结果时不该再演一次仪式
  const noReveal = !(await p.getByRole('button', { name: '跳过 →' }).isVisible())

  const ok = h1 === c.name && themed === c.dept && imgOk && noReveal && problems.length === 0
  if (!ok) deptFailures++
  console.log(
    `  ${ok ? '✓' : '✗'} ${c.dept.padEnd(3)} h1=${h1}  data-dept=${themed}  ` +
      `立绘=${imgOk ? 'ok' : '未加载'}  直达结果=${noReveal ? 'ok' : '又演了仪式'}`,
  )
  problems.forEach((x) => console.log(`      ⚠ ${x}`))

  await p.screenshot({ path: `${OUT}/dept-${c.dept}.png`, fullPage: false })
  await p.close()
}

console.log(errors.length ? `\n⚠ 页面错误：\n${errors.join('\n')}` : '\n✓ 无 console 错误')
console.log(deptFailures === 0 ? '✓ 四个部门全部通过' : `✗ ${deptFailures} 个部门有问题`)

await browser.close()

const pass =
  errors.length === 0 &&
  deptFailures === 0 &&
  overflowFailures === 0 &&
  missingSections.length === 0 &&
  inReveal &&
  modalVisible &&
  autoOpened &&
  autoOnce &&
  panelNearTop &&
  landscapeOk &&
  modalClosed &&
  shareTriggerBack &&
  scrollUnlocked &&
  copied &&
  codeOk &&
  posterReady &&
  posterDimensions &&
  reducedOk
console.log(pass ? '\n全部检查通过' : '\n有检查未通过，见上文 ✗')
process.exit(pass ? 0 : 1)
