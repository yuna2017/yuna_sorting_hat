import { readFileSync } from 'node:fs'

// 关键 commit 归属表(短 sha -> 阵营)
// 我们本地历次: 7cf110d(文案打磨) 5b788c6 fix 19e1fb1 7a9936c 5f6277d a609b2a ee53b1e(合并) 04c92ca(两处低语修复)
// 远程: 86bd233 92a32c7 319189f 841ad5d 4909f87 ... 以及更早远程基线
const LOCAL_SHA = new Set([
  '7cf110d', '5b788c6', '19e1fb1', '7a9936c', '5f6277d', 'a609b2a', '04c92ca', 'ee53b1e',
])

// 解析 blame porcelain: 按最终文件行号给出 commit
function blameLineMap(path, totalLines) {
  const txt = readFileSync(path, 'utf8').split('\n')
  const byLine = new Array(totalLines + 1).fill('?')
  let cur = null
  let curFinal = null
  for (const line of txt) {
    const m = line.match(/^([0-9a-f]{40}) \d+ (\d+) \d+$/)
    if (m) {
      cur = m[1]
      curFinal = parseInt(m[2], 10)
    } else if (line.startsWith('\t') && cur && curFinal !== null) {
      byLine[curFinal] = cur
      cur = null
      curFinal = null
    }
  }
  return byLine
}

function fieldLines(path) {
  const src = readFileSync(path, 'utf8').split('\n')
  const out = []
  let slot = null
  let option = null
  src.forEach((raw, idx) => {
    const line = raw.trim()
    const idm = line.match(/^id: '([^']+)',?$/)
    if (idm) {
      const id = idm[1]
      if (/^q\d/.test(id)) {
        slot = id
        option = null
      } else {
        option = id
      }
      return
    }
    const fm = line.match(/^(title|scene|text|whisper|detail): '(.*)',?$/)
    if (fm && slot) {
      const term = option ?? slot
      out.push({ key: `${slot}/${term}/${fm[1]}`, lineNo: idx + 1 })
    }
  })
  return out
}

const oursSrc = readFileSync('.tmp-diff/ours.ts', 'utf8').split('\n')
const theirsSrc = readFileSync('.tmp-diff/theirs.ts', 'utf8').split('\n')

const oursBlame = blameLineMap('.tmp-diff/blame-ours.txt', oursSrc.length)
const theirsBlame = blameLineMap('.tmp-diff/blame-theirs.txt', theirsSrc.length)

function short(sha) {
  if (!sha || sha === '?') return sha
  const s = sha.slice(0, 7)
  const who = LOCAL_SHA.has(s) ? '本地(我们)' : (sha === '?') ? '?' : '远程'
  return `${s}(${who})`
}

// 只列两边文本不同的字段
const oursFields = fieldLines('.tmp-diff/ours.ts')
const theirsFields = fieldLines('.tmp-diff/theirs.ts')
const them = new Map(theirsFields.map((f) => [f.key, f.lineNo]))

console.log('=== 差异字段: 最后修改者(我们 vs 远程) ===')
let localOwned = 0
let remoteOwned = 0
for (const f of oursFields) {
  const theirLine = them.get(f.key)
  if (theirLine === undefined) continue
  const oursTxt = oursSrc[f.lineNo - 1].trim()
  const theirTxt = theirsSrc[theirLine - 1].trim()
  if (oursTxt !== theirTxt) {
    const ob = short(oursBlame[f.lineNo])
    const tb = short(theirsBlame[theirLine])
    const oursIsLocal = oursBlame[f.lineNo] && LOCAL_SHA.has(oursBlame[f.lineNo].slice(0, 7))
    if (oursIsLocal) localOwned++
    else remoteOwned++
    console.log(`【${f.key}】 我们的行←${ob} | 远程行←${tb}`)
  }
}
console.log(`\n=== 汇总 ===`)
console.log(`差异字段里,我们本地最后修改的: ${localOwned} 条(远程删/改了咱们的)`)
console.log(`差异字段里,远程自己最后修改的: ${remoteOwned} 条(本来就是他们的文案,我们没动过/或合并时以他们为准)`)