// 用分享链接逐个访问四个部门的结果页：同时验证
// ①分享码解码 ②四套主题换肤 ③四张立绘都能加载 ④判定结果正确。
import { chromium } from 'playwright'

const BASE = process.env.TARGET ?? 'http://localhost:5173/yuna_sorting_hat/'
const CASES = [
  { dept: 'dev', code: 'acbddbabad', name: '开发部' },
  { dept: 'sec', code: 'cadbbdcadb', name: '网安部' },
  { dept: 'ops', code: 'bdacacbdcc', name: '运维部' },
  { dept: 'pr', code: 'dbcacadcba', name: '组宣部' },
]

const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
})
let failures = 0

for (const c of CASES) {
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => problems.push(`资源加载失败: ${r.url()}`))
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`)
  })

  await page.goto(`${BASE}?a=${c.code}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').waitFor({ timeout: 15000 })
  await page.waitForTimeout(700)

  const h1 = (await page.locator('h1').textContent())?.trim()
  const themed = await page.locator('[data-dept]').getAttribute('data-dept')
  // 立绘真的解码出像素了吗（而不是 404 占位）
  const imgOk = await page
    .locator('img')
    .first()
    .evaluate((el) => el.complete && el.naturalWidth > 0)
  const pct = await page.locator('li span.tabular-nums').first().textContent()

  const ok = h1 === c.name && themed === c.dept && imgOk && problems.length === 0
  if (!ok) failures++
  console.log(
    `${ok ? '✓' : '✗'} ${c.dept}  h1=${h1}  data-dept=${themed}  ` +
      `立绘=${imgOk ? 'ok' : '未加载'}  首行=${pct?.trim()}`,
  )
  problems.forEach((p) => console.log(`    ⚠ ${p}`))

  await page.screenshot({ path: `screenshots/dept-${c.dept}.png`, fullPage: false })
  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\n四个部门全部通过' : `\n${failures} 个部门有问题`)
process.exit(failures === 0 ? 0 : 1)
