/**
 * 带种子的伪随机与洗牌。
 *
 * 为什么不用 Math.random：题目文档要求选项顺序「按固定种子打乱一次」——
 * 既防「答案永远在 A」的套路，又保证同一次答题里顺序不会随重渲染跳动。
 *
 * 重要：**洗牌只影响显示顺序，不影响记分**。答案一律记规范 option id
 * （a/b/c/d），所以「显示顺序种子」（createSessionSeed）与计分完全解耦，
 * 不需要出现在分享链接里。
 *
 * 注意区分另一个种子：drawQuestions.ts 的**抽题种子**会决定这一场抽中哪 12 道题，
 * 因此它直接影响判定，必须写进分享链接。两个种子职责不同，不要混用同一个值。
 */

/** mulberry32：小而够用的 32 位 PRNG，返回 [0, 1)。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates 洗牌。不改动入参，返回新数组。
 * 同一个 seed 永远给出同一个顺序。
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice()
  const rand = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const a = out[i]
    const b = out[j]
    // noUncheckedIndexedAccess：i、j 都在界内，这里只是让类型收窄
    if (a !== undefined && b !== undefined) {
      out[i] = b
      out[j] = a
    }
  }
  return out
}

/**
 * 生成一次答题的会话种子。整场答题只调用一次，之后由状态持有。
 * 这里可以用真随机 —— 它只决定「这一场」的显示顺序，不参与判定。
 */
export function createSessionSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] ?? 1
  }
  // 极老环境兜底
  return Math.floor(Math.random() * 0xffffffff) || 1
}

/**
 * 把会话种子与题目下标混成该题专用的种子，
 * 免得所有题目用同一个种子打出相同的排列。
 */
export function seedForQuestion(sessionSeed: number, questionIndex: number): number {
  // 乘一个大奇数再加下标，让相邻题目的种子充分分离
  return (Math.imul(sessionSeed, 0x9e3779b1) + questionIndex * 0x85ebca6b) >>> 0
}
