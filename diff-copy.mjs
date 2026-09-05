import { readFileSync } from 'node:fs'

function parse(path) {
  const src = readFileSync(path, 'utf8')
  const map = {}
  let slot = null
  let option = null
  for (const raw of src.split('\n')) {
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
      continue
    }
    const fm = line.match(/^(title|scene|text|whisper|detail): '(.*)',?$/)
    if (fm && slot) {
      const term = option ?? slot
      map[`${slot}/${term}/${fm[1]}`] = fm[2]
    }
  }
  return map
}

const ours = parse('.tmp-diff/ours.ts')
const theirs = parse('.tmp-diff/theirs.ts')
const keys = Object.keys(ours)
const changed = keys.filter((k) => theirs[k] !== ours[k])
const changedOnlyTheirs = keys.filter((k) => theirs[k] !== undefined && ours[k] !== undefined && theirs[k] !== ours[k])
const deletedInTheirs = keys.filter((k) => theirs[k] === undefined)

console.log(`总文案字段: ${keys.length}`)
console.log(`两边相同: ${keys.length - changed.length}`)
console.log(`远程改动(内容不同): ${changedOnlyTheirs.length}`)
console.log(`我们有时远程删: ${deletedInTheirs.length}`)
console.log('\n--- 分字段 ---')
const byField = {}
for (const k of changedOnlyTheirs) {
  const f = k.split('/')[2]
  byField[f] = (byField[f] ?? 0) + 1
}
console.log(JSON.stringify(byField, null, 0))
console.log('\n--- 分题 ---')
const byQ = {}
for (const k of changedOnlyTheirs) {
  const q = k.split('/')[0]
  byQ[q] = (byQ[q] ?? 0) + 1
}
for (const [q, n] of Object.entries(byQ).sort((a, b) => a[0].localeCompare(b[0], 'zh'))) console.log(`${q}: ${n} 条`)

console.log('\n=== 差异明细(逐条 我们 → 远程) ===')
for (const k of changedOnlyTheirs) {
  const parts = k.split('/')
  const [q, term, f] = parts
  const label = term !== q && parts.length === 3 ? `${q}/${term}·${f}` : `${q}·${f}`
  console.log(`\n【${label}】`)
  console.log(`  我们: ${ours[k]}`)
  console.log(`  远程: ${theirs[k]}`)
}