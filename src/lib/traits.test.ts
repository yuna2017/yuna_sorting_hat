import { describe, expect, it } from 'vitest'
import { TRAIT_ORDER } from '../data/constants'
import type { TraitId } from '../data/constants'
import { QUESTION_BANK } from '../data/questions'
import type { OptionTraits, QuestionBank } from '../data/questions'
import type { AnswerMap } from './scoring'
import {
  deriveProfile,
  emptyTraitScores,
  normalizeTraits,
  rankTraits,
  tallyTraits,
  traitCeilings,
} from './traits'

/**
 * 造一份最小题库。特质链路的边界（上限为 0、并列、未作答）在真题库里很难摆出来，
 * 用手搓题库才能把每条分支都摁到。
 */
function bankOf(...questions: Array<[OptionTraits, OptionTraits, OptionTraits, OptionTraits]>): QuestionBank {
  return {
    version: 99,
    questions: questions.map((traits, i) => ({
      id: `t${i + 1}`,
      title: '测试题',
      scene: '测试场景',
      options: (['a', 'b', 'c', 'd'] as const).map((id, j) => ({
        id,
        text: '测试选项',
        whisper: '「测试低语。」',
        // p/s 在特质链路里用不上，但类型要求给，随便填一组合法值
        p: 'dev' as const,
        s: 'sec' as const,
        traits: traits[j]!,
      })),
    })),
  }
}

const ALL_ONE: OptionTraits = { explore: 1, insight: 1, create: 1 }

describe('emptyTraitScores', () => {
  it('五个特质都在，且全为 0', () => {
    const scores = emptyTraitScores()
    expect(Object.keys(scores).sort()).toEqual([...TRAIT_ORDER].sort())
    for (const trait of TRAIT_ORDER) expect(scores[trait]).toBe(0)
  })
})

describe('tallyTraits', () => {
  it('累加所选选项的权重', () => {
    const bank = bankOf(
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
      [{ explore: 2, connect: 1 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
    )
    const scores = tallyTraits(bank, { t1: 'a', t2: 'a' })
    expect(scores.explore).toBe(5)
    expect(scores.connect).toBe(1)
    expect(scores.insight).toBe(0)
  })

  it('未作答的题直接跳过，不影响其他题', () => {
    const bank = bankOf(
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
    )
    expect(tallyTraits(bank, { t1: 'a' }).explore).toBe(3)
  })

  it('非法选项 id 当作未作答', () => {
    const bank = bankOf([{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }])
    // 越过类型断言模拟脏 URL 传进来的答案
    const dirty = { t1: 'z' } as unknown as AnswerMap
    expect(tallyTraits(bank, dirty)).toEqual(emptyTraitScores())
  })

  it('空题库不报错', () => {
    expect(tallyTraits(bankOf(), {})).toEqual(emptyTraitScores())
  })
})

describe('traitCeilings', () => {
  it('逐题取该特质的最高权重再求和', () => {
    const bank = bankOf(
      [{ explore: 3 }, { explore: 1, insight: 2 }, { create: 3 }, { guard: 3 }],
      [{ explore: 2, guard: 1 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
    )
    // explore: max(3,1,0,0)=3 + max(2,0,0,0)=2 → 5
    expect(traitCeilings(bank).explore).toBe(5)
    // guard: max(0,0,0,3)=3 + max(1,0,0,3)=3 → 6
    expect(traitCeilings(bank).guard).toBe(6)
  })

  it('从未出现的特质上限为 0', () => {
    const bank = bankOf([{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }])
    expect(traitCeilings(bank).connect).toBe(0)
  })
})

describe('normalizeTraits', () => {
  it('逐特质除以自己的上限，而不是除以总分', () => {
    const scores = { ...emptyTraitScores(), explore: 3, guard: 6 }
    const ceilings = { ...emptyTraitScores(), explore: 6, guard: 6 }
    const normalized = normalizeTraits(scores, ceilings)
    expect(normalized.explore).toBeCloseTo(0.5)
    expect(normalized.guard).toBeCloseTo(1)
  })

  it('上限为 0 时返回 0 而不是 NaN', () => {
    const normalized = normalizeTraits(emptyTraitScores(), emptyTraitScores())
    for (const trait of TRAIT_ORDER) {
      expect(normalized[trait], trait).toBe(0)
    }
  })
})

describe('deriveProfile', () => {
  it('主导特质取归一化最高者', () => {
    const bank = bankOf(
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
    )
    const profile = deriveProfile(bank, { t1: 'b', t2: 'b' })
    expect(profile.dominant).toBe('insight')
    expect(profile.tiedWith).toEqual([])
    expect(profile.normalized.insight).toBeCloseTo(1)
  })

  it('比较的是归一化值而非原始分 —— 上限低的特质不该被埋掉', () => {
    // explore 上限 6 拿 3 分（50%）；connect 上限 1 拿 1 分（100%）
    const bank = bankOf(
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { connect: 1, guard: 2 }],
    )
    const profile = deriveProfile(bank, { t1: 'a', t2: 'd' })
    expect(profile.scores.explore).toBeGreaterThan(profile.scores.connect)
    expect(profile.dominant).toBe('connect')
  })

  it('并列时按 TRAIT_ORDER 取首，并把并列者记在 tiedWith 里', () => {
    const bank = bankOf([ALL_ONE, { guard: 3 }, { connect: 3 }, { guard: 2, connect: 1 }])
    const profile = deriveProfile(bank, { t1: 'a' })
    // explore/insight/create 各 1 分，上限各为 1 → 三者归一化都是 1
    expect(profile.dominant).toBe('explore')
    expect(profile.tiedWith).toEqual(['insight', 'create'])
  })

  it('一题未答时全部为 0，主导特质回落到 TRAIT_ORDER 首位', () => {
    const bank = bankOf([{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }])
    const profile = deriveProfile(bank, {})
    expect(profile.dominant).toBe(TRAIT_ORDER[0])
    expect(profile.tiedWith).toHaveLength(TRAIT_ORDER.length - 1)
  })

  it('零随机：同一份答案反复推导结果完全一致', () => {
    const answers: AnswerMap = { q1: 'b', q2: 'c', q12: 'a' }
    const first = deriveProfile(QUESTION_BANK, answers)
    for (let i = 0; i < 5; i++) {
      expect(deriveProfile(QUESTION_BANK, answers)).toEqual(first)
    }
  })
})

describe('rankTraits', () => {
  it('按归一化降序，并列按 TRAIT_ORDER 稳定取先', () => {
    const bank = bankOf(
      [{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
      [{ explore: 1, insight: 2 }, { insight: 3 }, { create: 3 }, { guard: 3 }],
    )
    const profile = deriveProfile(bank, { t1: 'b', t2: 'a' })
    const ranked = rankTraits(profile)
    expect(ranked[0]).toBe('insight')
    expect(new Set(ranked)).toEqual(new Set(TRAIT_ORDER))
  })

  it('全零时完全回落到 TRAIT_ORDER', () => {
    const bank = bankOf([{ explore: 3 }, { insight: 3 }, { create: 3 }, { guard: 3 }])
    expect(rankTraits(deriveProfile(bank, {}))).toEqual([...TRAIT_ORDER])
  })

  it('五个特质一个不漏', () => {
    const profile = deriveProfile(QUESTION_BANK, { q1: 'a', q2: 'a', q12: 'a' })
    const ranked: TraitId[] = rankTraits(profile)
    expect(ranked).toHaveLength(TRAIT_ORDER.length)
  })
})

describe('真实题库上的画像', () => {
  it('每个特质的上限都大于 0 —— 否则那条雷达轴永远是塌的', () => {
    const ceilings = traitCeilings(QUESTION_BANK)
    for (const trait of TRAIT_ORDER) {
      expect(ceilings[trait], `特质 ${trait} 从未出现在题库里`).toBeGreaterThan(0)
    }
  })

  it('归一化值恒在 [0, 1] 之间', () => {
    const answers: AnswerMap = {}
    for (const q of QUESTION_BANK.questions) answers[q.id] = 'a'
    const profile = deriveProfile(QUESTION_BANK, answers)
    for (const trait of TRAIT_ORDER) {
      expect(profile.normalized[trait]).toBeGreaterThanOrEqual(0)
      expect(profile.normalized[trait]).toBeLessThanOrEqual(1)
    }
  })
})
