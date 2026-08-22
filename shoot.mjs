// 本地视觉验证：用真实浏览器驱动应用。
//   1) 四屏截图 + 320px 横向溢出检查
//   2) 用分享链接逐个验四个部门的主题、立绘与判定
//
// 需要 Playwright，但不进 package.json（否则 CI 每次都要装）：
//   npm i --no-save playwright
//   node shoot.mjs
import { chromium } from 'playwright'

const BASE = process.env.TARGET ?? 'http://localhost:5173/yuna_sorting_hat/'
const OUT = process.env.OUT ?? 'screenshots'

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14 逻辑像素
  deviceScaleFactor: 2,
  // 让打字机瞬间完成，既加速遍历也顺便验证 reduced-motion 分支
  reducedMotion: 'reduce',
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

console.log('答题：')
await page.getByRole('button', { name: '开始' }).click()
await page.waitForTimeout(300)
await shot('3-quiz-unanswered')

// 先看一次「已选 + 低语」的状态
await page.locator('main ul li button').first().click()
await page.waitForTimeout(400)
await shot('4-quiz-answered')

// 走完 10 题。每题点第一个选项，再点推进按钮。
for (let i = 0; i < 10; i++) {
  const next = page.getByRole('button', { name: /下一题|揭晓结果/ })
  if (!(await next.isVisible().catch(() => false))) {
    await page.locator('main ul li button').first().click()
  }
  await next.waitFor({ state: 'visible', timeout: 8000 })
  const label = await next.textContent()
  await next.click()
  await page.waitForTimeout(250)
  if (label?.includes('揭晓')) break
}

console.log('结果：')
await page.waitForTimeout(700)
await shot('5-result')

// 窄屏复查：雷达图轴标签在 320px 下会不会被裁
await page.setViewportSize({ width: 320, height: 780 })
await page.waitForTimeout(400)
await shot('6-result-320')

const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}))
console.log(
  `\n320px 横向：scrollWidth=${overflow.scrollW} clientWidth=${overflow.clientW}` +
    (overflow.scrollW > overflow.clientW + 1 ? '  ⚠ 有横向溢出！' : '  ✓ 无横向溢出'),
)
await page.close()

// ---- 四个部门：用分享链接逐个验主题换肤、立绘加载与判定 ----

const CASES = [
  { dept: 'dev', code: 'acbddbabad', name: '开发部' },
  { dept: 'sec', code: 'cadbbdcadb', name: '网安部' },
  { dept: 'ops', code: 'bdacacbdcc', name: '运维部' },
  { dept: 'pr', code: 'dbcacadcba', name: '组宣部' },
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

  await p.goto(`${BASE}?a=${c.code}`, { waitUntil: 'domcontentloaded' })
  await p.locator('h1').waitFor({ timeout: 15000 })
  await p.waitForTimeout(700)

  const h1 = (await p.locator('h1').textContent())?.trim()
  const themed = await p.locator('[data-dept]').getAttribute('data-dept')
  // 立绘真的解码出像素了吗（而不是 404 占位）
  const imgOk = await p
    .locator('img')
    .first()
    .evaluate((el) => el.complete && el.naturalWidth > 0)

  const ok = h1 === c.name && themed === c.dept && imgOk && problems.length === 0
  if (!ok) deptFailures++
  console.log(
    `  ${ok ? '✓' : '✗'} ${c.dept.padEnd(3)} h1=${h1}  data-dept=${themed}  ` +
      `立绘=${imgOk ? 'ok' : '未加载'}`,
  )
  problems.forEach((x) => console.log(`      ⚠ ${x}`))

  await p.screenshot({ path: `${OUT}/dept-${c.dept}.png`, fullPage: false })
  await p.close()
}

console.log(errors.length ? `\n⚠ 页面错误：\n${errors.join('\n')}` : '\n✓ 无 console 错误')
console.log(deptFailures === 0 ? '✓ 四个部门全部通过' : `✗ ${deptFailures} 个部门有问题`)

await browser.close()
process.exit(errors.length === 0 && deptFailures === 0 ? 0 : 1)
