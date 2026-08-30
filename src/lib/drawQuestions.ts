import { QUESTION_POOL, type Question, type QuestionBank, type QuestionPool } from '../data/questions'
import { mulberry32 } from './seededShuffle'

/**
 * 抽题：从题池的每个槽位各取 1 道候选，组成这一场的题目序列。
 *
 * 为什么要抽题：题池里同一个槽有多道可互换的候选题，两个人做同一份测评
 * 看到的题面不一定相同，重做一次也不会完全撞车。
 *
 * 为什么必须确定性：抽中哪些题**直接影响判定** —— 答案表的键是题目 id，
 * 12 位分享码的每一位也按抽题顺序对应一道题。所以「同一个种子必须抽出同一组题」
 * 是分享链接可复现的前提，见 lib/shareCode.ts 里的 seed 参数。
 * 这一点和 seededShuffle 的显示顺序种子不同，别把两个种子混用。
 *
 * 每槽独立派生子种子，而不是拿一个 rand() 一路取下去 ——
 * 这样将来往某个槽里补候选题，不会让它后面所有槽的抽取结果集体漂移。
 */

/** 把槽位下标混进种子，得到该槽专用的子种子。 */
function seedForSlot(drawSeed: number, slotIndex: number): number {
  // 与 seedForQuestion 同构，但用不同的加法常数，避免两套种子在同一 slotIndex 上撞值
  return (Math.imul(drawSeed, 0x9e3779b1) + slotIndex * 0xc2b2ae35 + 0x27d4eb2f) >>> 0
}

/**
 * 按种子从每个槽抽 1 道候选。
 * 返回的顺序 = 槽位在 pool.slots 里的声明顺序（即 §5 矩阵的 q1→q12），不打乱。
 * 题目顺序不随机，是为了让题型节奏（情境→奇幻→…→决胜）保持设计好的推进感。
 */
export function drawQuestions(pool: QuestionPool, drawSeed: number): Question[] {
  const drawn: Question[] = []
  pool.slots.forEach((slot, slotIndex) => {
    const { candidates } = slot
    if (candidates.length === 0) return // 空槽属于数据错误，交给 validateBank 报，这里不抛
    const rand = mulberry32(seedForSlot(drawSeed, slotIndex))
    const pick = candidates[Math.floor(rand() * candidates.length)]
    // noUncheckedIndexedAccess：下标已在界内，这里只是让类型收窄
    if (pick !== undefined) drawn.push(pick)
  })
  return drawn
}

/**
 * 抽题并包成 QuestionBank。
 *
 * 下游的 scoring / traits / explain / identity / shareCode 全部按「一次会话的题目集合」
 * 计算满分、特质上限与分享码长度，把抽题结果伪装成一份题库，它们就不必知道池子的存在，
 * 也不会误用 24 道题的分母去除 12 道题的得分。
 */
export function drawBank(drawSeed: number, pool: QuestionPool = QUESTION_POOL): QuestionBank {
  return { version: pool.version, questions: drawQuestions(pool, drawSeed) }
}

/** 一次测评的题目数量 = 槽位数。用于封面文案等「还没抽题就要报数」的地方。 */
export function drawSize(pool: QuestionPool = QUESTION_POOL): number {
  return pool.slots.length
}

/**
 * 生成抽题种子。与 createSessionSeed 分开是为了让两个种子各自独立：
 * 抽题种子要进分享链接，显示顺序种子不进。
 */
export function createDrawSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] ?? 1
  }
  return Math.floor(Math.random() * 0xffffffff) || 1
}
