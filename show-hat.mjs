// 展示①：截取答题中段帽子的进度旁白 + 仪式中「记得你」那句
import { chromium } from 'playwright'

const BASE = process.env.TARGET ?? 'http://localhost:4173/yuna_sorting_hat/'
const OUT = 'screenshots-fresh'
const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: '戴上帽子' }).waitFor({ timeout: 15000 })
await page.getByRole('button', { name: '戴上帽子' }).click()
// 开场独白跑完后「开始」
const startBtn = page.getByRole('button', { name: '开始' })
await startBtn.waitFor({ timeout: 20000 })
await startBtn.click()
await page.locator('main ul li button').first().waitFor({ timeout: 15000 })

// 答到第 5 题（index 4 → mood「你又选了这样的路」）
for (let i = 0; i < 4; i++) {
  await page.locator('main ul li button').first().click()
  await page.getByRole('button', { name: /下一题/ }).click()
  await page.waitForTimeout(300)
}
await page.screenshot({ path: `${OUT}/hat-mood-mid.png` })
console.log('已截答题中段旁白 → hat-mood-mid.png')

// 一路答到最后，进入仪式，抓住 thinking 阶段的「记得你」
for (let i = 0; i < 8; i++) {
  await page.locator('main ul li button').first().click()
  const next = page.getByRole('button', { name: /下一题|揭晓结果/ })
  const label = await next.textContent()
  await next.click()
  await page.waitForTimeout(300)
  if (label?.includes('揭晓')) break
}
await page.waitForTimeout(900) // thinking 阶段
await page.screenshot({ path: `${OUT}/hat-remember.png` })
console.log('已截仪式「记得你」 → hat-remember.png')

const body = await page.locator('body').innerText()
console.log('--- 仪式页文字(前 400 字) ---')
console.log(body.slice(0, 400))

await browser.close()