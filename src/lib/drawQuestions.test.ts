import { describe, expect, it } from 'vitest'
import { QUESTION_POOL } from '../data/questions'
import type { Question, QuestionPool, QuestionSlot } from '../data/questions'
import { createDrawSeed, drawBank, drawQuestions, drawSize } from './drawQuestions'
import { formatViolations, validateQuestionBank } from './validateBank'

/** 一批有代表性的种子。含 0 与极大值，因为种子来自 crypto 的整个 uint32 区间。 */
const SEEDS = [0, 1, 2, 7, 42, 1337, 0x7fffffff, 0xffffffff]

/** 把一场题拍平成 id 序列，便于比对。 */
function idsOf(questions: Question[]): string[] {
  return questions.map((q) => q.id)
}

/**
 * 造一个每槽 2 候选的假题池。真题池目前每槽只有 1 道候选，
 * 「不同种子抽出不同组合」这条在补齐 24 题之前无法用真数据验证，
 * 但抽题逻辑本身现在就必须是对的 —— 等题补完才发现抽错就太晚了。
 */
function poolWithTwoCandidates(): QuestionPool {
  const slots: QuestionSlot[] = QUESTION_POOL.slots.map((slot) => {
    const first = slot.candidates[0]
    if (first === undefined) throw new Error(`槽 ${slot.id} 没有候选题`)
    const clone: Question = structuredClone(first)
    clone.id = `${slot.id}-alt`
    return { ...slot, candidates: [first, clone] }
  })
  return { version: QUESTION_POOL.version, slots }
}

describe('抽题的确定性', () => {
  it('同一个种子永远抽出同一组题', () => {
    // 这是分享链接可复现的地基：种子进了 URL，别人打开时必须抽出一模一样的题
    for (const seed of SEEDS) {
      const first = idsOf(drawQuestions(QUESTION_POOL, seed))
      const second = idsOf(drawQuestions(QUESTION_POOL, seed))
      expect(second, `种子 ${seed}`).toEqual(first)
    }
  })

  it('抽题不修改题池本身', () => {
    const before = structuredClone(QUESTION_POOL)
    drawQuestions(QUESTION_POOL, 42)
    expect(QUESTION_POOL).toEqual(before)
  })
})

describe('抽题的形状', () => {
  it('每槽恰好抽 1 道，数量等于槽位数', () => {
    for (const seed of SEEDS) {
      const drawn = drawQuestions(QUESTION_POOL, seed)
      expect(drawn, `种子 ${seed}`).toHaveLength(QUESTION_POOL.slots.length)
    }
  })

  it('抽出的题必定来自对应槽的候选池', () => {
    for (const seed of SEEDS) {
      const drawn = drawQuestions(QUESTION_POOL, seed)
      QUESTION_POOL.slots.forEach((slot, i) => {
        const picked = drawn[i]
        expect(picked, `槽 ${slot.id} / 种子 ${seed}`).toBeDefined()
        expect(slot.candidates.map((c) => c.id)).toContain(picked!.id)
      })
    }
  })

  it('返回顺序 = 槽位声明顺序 —— 题型节奏不能被打乱', () => {
    // 决胜题排最后是 scoring 的三级决胜依赖的前提之一
    const drawn = drawQuestions(QUESTION_POOL, 42)
    const slotOfDrawn = drawn.map((q) =>
      QUESTION_POOL.slots.find((s) => s.candidates.some((c) => c.id === q.id))?.id,
    )
    expect(slotOfDrawn).toEqual(QUESTION_POOL.slots.map((s) => s.id))
  })

  it('drawSize 与实际抽出的题数一致', () => {
    expect(drawSize()).toBe(drawQuestions(QUESTION_POOL, 42).length)
  })

  it('空槽被跳过而不是抛异常 —— 数据错误交给校验器报', () => {
    const pool: QuestionPool = {
      version: QUESTION_POOL.version,
      slots: QUESTION_POOL.slots.map((s, i) => (i === 0 ? { ...s, candidates: [] } : s)),
    }
    const drawn = drawQuestions(pool, 42)
    expect(drawn).toHaveLength(pool.slots.length - 1)
  })
})

describe('抽题的分布', () => {
  it('不同种子能抽出不同的组合', () => {
    const pool = poolWithTwoCandidates()
    const combos = new Set<string>()
    for (let seed = 0; seed < 64; seed += 1) {
      combos.add(idsOf(drawQuestions(pool, seed)).join(','))
    }
    // 只要不是恒定一种，就说明种子真的在起作用
    expect(combos.size).toBeGreaterThan(1)
  })

  it('每个候选题都有机会被抽到 —— 否则等于白写了一半的题', () => {
    const pool = poolWithTwoCandidates()
    const seen = new Set<string>()
    for (let seed = 0; seed < 512; seed += 1) {
      for (const q of drawQuestions(pool, seed)) seen.add(q.id)
    }
    for (const slot of pool.slots) {
      for (const candidate of slot.candidates) {
        expect(seen, `候选题 ${candidate.id} 从未被抽中`).toContain(candidate.id)
      }
    }
  })

  it('补候选题不会让其他槽的抽取结果漂移', () => {
    // 每槽独立子种子的意义就在这：往 q1 加一道候选，q2 之后不该跟着变
    const base = poolWithTwoCandidates()
    const grown: QuestionPool = {
      version: base.version,
      slots: base.slots.map((s, i) => {
        if (i !== 0) return s
        const first = s.candidates[0]!
        const extra: Question = structuredClone(first)
        extra.id = `${s.id}-extra`
        return { ...s, candidates: [...s.candidates, extra] }
      }),
    }

    const before = idsOf(drawQuestions(base, 42)).slice(1)
    const after = idsOf(drawQuestions(grown, 42)).slice(1)
    expect(after).toEqual(before)
  })
})

describe('包装成题库', () => {
  it('版本号跟着题池走', () => {
    expect(drawBank(42).version).toBe(QUESTION_POOL.version)
  })

  it('任意种子抽出的一场题都满足全部硬约束', () => {
    // 题池层的 validateQuestionPool 已穷举校验过，这里再从抽题入口抽查一遍，
    // 防止「池子合法但抽题实现把顺序或数量搞错」这类接缝 bug
    for (const seed of SEEDS) {
      const violations = validateQuestionBank(drawBank(seed))
      expect(violations, `种子 ${seed}\n${formatViolations(violations)}`).toEqual([])
    }
  })
})

describe('种子生成', () => {
  it('落在 uint32 区间内且非零', () => {
    for (let i = 0; i < 32; i += 1) {
      const seed = createDrawSeed()
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThan(0)
      expect(seed).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('多次生成不会总是同一个值', () => {
    const seeds = new Set(Array.from({ length: 32 }, () => createDrawSeed()))
    expect(seeds.size).toBeGreaterThan(1)
  })
})
