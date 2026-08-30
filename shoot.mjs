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

/* 必须跟 src/data/questions.ts 对齐：题数 = 分享码长度，v = QUESTION_BANK.version。
   当前 v2 样题阶段共 3 题（q1/q2/q12），补齐到 12 题时改这两个数。 */
const QUESTION_COUNT = 3
const BANK_VERSION = 2

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
const wanted = ['帽子在你身上看见了什么？', '四部门契合度', '关于', '感兴趣？', '分享你的结果']
const missingSections = wanted.filter((w) => !sections.some((s) => s.includes(w)))
console.log(
  missingSections.length === 0
    ? `  ✓ 结果页分层齐全（${sections.length} 个区块）`
    : `  ✗ 结果页缺少区块：${missingSections.join('、')}`,
)

console.log('分享：')
await page.getByRole('button', { name: '复制结果链接' }).click()
await page.waitForTimeout(300)
const copied = await page.getByRole('button', { name: /已复制链接/ }).isVisible()
const clipboard = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
const codeOk = new RegExp(`\\?v=${BANK_VERSION}&a=[abcd]{${QUESTION_COUNT}}$`).test(clipboard)
console.log(`  ${copied ? '✓' : '✗'} 复制后按钮变为「已复制」`)
console.log(`  ${codeOk ? '✓' : '✗'} 剪贴板里是可复现的结果链接：${clipboard || '(空)'}`)

console.log('\n窄屏横向溢出：')
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
  if (width === 320) await shot('6-result-320')
}
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
// 测的是「十题手动推进 + 被压缩的仪式」。完整仪式约 5.4s，reduce 分支只留 0.6s，
// 所以全程必须明显短于 5400ms —— 否则说明仪式没被压缩，用户在干等。
const reducedOk = elapsed < 5400
console.log(
  `  ${reducedOk ? '✓' : '✗'} 从最后一题到结果页 ${elapsed}ms（reduce 下应远小于 5400ms）`,
)
await reducedCtx.close()

// ---- 四个部门：用分享链接逐个验主题换肤、立绘加载与判定 ----

const CASES = [
  { dept: 'dev', code: 'aba', name: '开发部' },
  { dept: 'sec', code: 'ddc', name: '网络安全部' },
  { dept: 'ops', code: 'bad', name: '运维部' },
  { dept: 'pr', code: 'ccb', name: '组宣部' },
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

  await p.goto(`${BASE}?v=${BANK_VERSION}&a=${c.code}`, { waitUntil: 'domcontentloaded' })
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
  copied &&
  codeOk &&
  reducedOk
console.log(pass ? '\n全部检查通过' : '\n有检查未通过，见上文 ✗')
process.exit(pass ? 0 : 1)
