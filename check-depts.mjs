// 用分享链接逐个访问四个部门的结果页：同时验证
// ①分享码解码 ②四套主题换肤 ③四张立绘都能加载 ④判定结果正确
// ⑤每个部门的介绍与招新入口都渲染出来了。
import { chromium } from 'playwright'

const BASE = process.env.TARGET ?? 'http://localhost:5173/yuna_sorting_hat/'

/* 分享码必须跟 src/data/questions.ts 对齐：码长 = 抽题数（槽位数），v = QUESTION_POOL.version。
   题库一改这里就得重算 —— 每位是「该题主推目标部门的那个选项 id」。
   s = 抽题种子：v3 起题目从池子里抽，没有种子就不知道对方做的是哪几道题。
   当前 v3 题池共 12 槽、每槽 2 道候选，抽题结果随种子变化，所以这四行码是按
   DRAW_SEED = 1 重推出来的；改动题池或种子后必须重推（并同步 shoot.mjs 里那份）。 */
const BANK_VERSION = 3
const DRAW_SEED = 1
const CASES = [
  { dept: 'dev', code: 'adadddabacdd', name: '开发部' },
  { dept: 'sec', code: 'bccaccbccbba', name: '网安部' },
  { dept: 'ops', code: 'cadbaacdbaab', name: '运维部' },
  { dept: 'pr', code: 'dbbcbbdaddcc', name: '组宣部' },
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

  await page.goto(`${BASE}?v=${BANK_VERSION}&s=${DRAW_SEED.toString(36)}&a=${c.code}`, {
    waitUntil: 'domcontentloaded',
  })
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

  // 招新转化链路：解释 → 介绍 → 行动 → 分享，缺一环用户就不知道下一步去哪
  const headings = await page.locator('h2').allInnerTexts()
  const has = (t) => headings.some((h) => h.includes(t))
  const introOk = has(`帽子眼里的${c.name}`)
  const actionOk = has(`对${c.name}感兴趣？`)
  const explainOk = has('帽子在你身上看见了什么？')
  const shareOk = has('分享你的结果')

  // 招新按钮若已填真实 URL，必须是 http(s) 外链且带 noopener ——
  // 这些链接由社团后续填入，不全在我们控制下。
  const badLinks = await page.evaluate(() => {
    const out = []
    for (const a of document.querySelectorAll('section a[href]')) {
      const rel = a.getAttribute('rel') ?? ''
      if (!/^https?:/.test(a.href)) out.push(`非 http(s) 链接: ${a.getAttribute('href')}`)
      else if (!rel.includes('noopener')) out.push(`缺 rel=noopener: ${a.href}`)
    }
    return out
  })
  problems.push(...badLinks)

  const ok =
    h1 === c.name &&
    themed === c.dept &&
    imgOk &&
    introOk &&
    actionOk &&
    explainOk &&
    shareOk &&
    problems.length === 0
  if (!ok) failures++
  console.log(
    `${ok ? '✓' : '✗'} ${c.dept}  h1=${h1}  data-dept=${themed}  ` +
      `立绘=${imgOk ? 'ok' : '未加载'}  首行=${pct?.trim()}`,
  )
  if (!introOk) console.log('    ⚠ 缺「关于部门」区块')
  if (!actionOk) console.log('    ⚠ 缺招新入口区块')
  if (!explainOk) console.log('    ⚠ 缺「帽子在你身上看见了什么」区块')
  if (!shareOk) console.log('    ⚠ 缺分享区块')
  problems.forEach((p) => console.log(`    ⚠ ${p}`))

  await page.screenshot({ path: `screenshots/dept-${c.dept}.png`, fullPage: false })
  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\n四个部门全部通过' : `\n${failures} 个部门有问题`)
process.exit(failures === 0 ? 0 : 1)
