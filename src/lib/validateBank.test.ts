import { describe, expect, it } from 'vitest'
import { OPTION_TRAIT_BUDGET, TRAIT_ORDER } from '../data/constants'
import { QUESTION_BANK, reportUnfilledOptionDetail } from '../data/questions'
import type { QuestionBank } from '../data/questions'
import { formatViolations, validateQuestionBank } from './validateBank'

/**
 * 基线从题库自身派生，不写死 10/40 之类的数字 ——
 * v1→v2 那次改题正是因为这些常量散在各个测试里，改一次要追七处。
 */
const QUESTION_COUNT = QUESTION_BANK.questions.length
const OPTION_COUNT = QUESTION_COUNT * 4

describe('题库不变量', () => {
  it('现有题库零违规', () => {
    const violations = validateQuestionBank(QUESTION_BANK)
    expect(violations, `\n${formatViolations(violations)}`).toEqual([])
  })

  it('每题 4 选项', () => {
    expect(QUESTION_COUNT).toBeGreaterThan(0)
    for (const q of QUESTION_BANK.questions) {
      expect(q.options, `题 ${q.id}`).toHaveLength(4)
    }
  })

  it('恰好标记了一道决胜题，且是最后一题', () => {
    const deciders = QUESTION_BANK.questions.filter((q) => q.decider)
    expect(deciders).toHaveLength(1)
    expect(deciders[0]?.id).toBe(QUESTION_BANK.questions.at(-1)?.id)
  })

  it('题库版本为 2', () => {
    // 分享链接的 ?v= 用的就是这个值。改题库不改版本，旧链接会被新题库误读。
    expect(QUESTION_BANK.version).toBe(2)
  })

  it(`${OPTION_COUNT} 处选项点评已全部补齐`, () => {
    expect(reportUnfilledOptionDetail()).toEqual([])
  })

  it('每个选项的特质权重和恒为预算值', () => {
    for (const q of QUESTION_BANK.questions) {
      for (const o of q.options) {
        const sum = TRAIT_ORDER.reduce((acc, t) => acc + (o.traits[t] ?? 0), 0)
        expect(sum, `${q.id}${o.id}`).toBe(OPTION_TRAIT_BUDGET)
      }
    }
  })
})

// ---- 校验器本身必须真的能抓出坏题库 ----

/** 深拷贝一份可以随便改坏的题库。 */
function cloneBank(): QuestionBank {
  return structuredClone(QUESTION_BANK)
}

/** 改坏之后触发了哪些规则。 */
function rulesOf(bank: QuestionBank): string[] {
  return validateQuestionBank(bank).map((v) => v.rule)
}

describe('校验器能抓出坏题库：结构', () => {
  it('抓出主推重复（某部门没有 +3 路径）', () => {
    const bank = cloneBank()
    const options = bank.questions[0]!.options
    // 让 c 的主推与 a 相同 → a 的部门两次，c 原本的部门一次都没有
    options[2]!.p = options[0]!.p
    expect(rulesOf(bank)).toContain('primary-covers-all-depts')
  })

  it('抓出固定点（p === s）', () => {
    const bank = cloneBank()
    const option = bank.questions[0]!.options[0]!
    option.s = option.p
    expect(rulesOf(bank)).toContain('no-fixed-point')
  })

  it('抓出副推不构成置换', () => {
    const bank = cloneBank()
    const options = bank.questions[0]!.options
    options[1]!.s = options[0]!.s
    expect(rulesOf(bank)).toContain('secondary-is-derangement')
  })

  it('抓出选项数量不对', () => {
    const bank = cloneBank()
    bank.questions[0]!.options.pop()
    expect(rulesOf(bank)).toContain('option-count')
  })

  it('抓出多道决胜题', () => {
    const bank = cloneBank()
    bank.questions[0]!.decider = true // 最后一题已是决胜题
    expect(rulesOf(bank)).toContain('single-decider')
  })

  it('抓出题目 id 重复', () => {
    const bank = cloneBank()
    bank.questions[1]!.id = bank.questions[0]!.id
    expect(rulesOf(bank)).toContain('unique-question-id')
  })

  it('抓出选项 id 重复', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[1]!.id = 'a'
    expect(rulesOf(bank)).toContain('unique-option-id')
  })
})

describe('校验器能抓出坏题库：文案红线', () => {
  it('抓出选项正文超字数', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[0]!.text = '短'
    expect(rulesOf(bank)).toContain('option-text-length')
  })

  it('抓出场景超字数', () => {
    const bank = cloneBank()
    bank.questions[0]!.scene = '太短了'
    expect(rulesOf(bank)).toContain('option-text-length')
  })

  it('抓出题面泄露部门名', () => {
    const bank = cloneBank()
    // 部门名出现在题面 = 把答案映射直接印在页面上
    bank.questions[0]!.options[0]!.detail =
      '这句话里出现了运维部这三个字，等于把答案直接告诉了读者，校验器必须拦住它。'
    expect(rulesOf(bank)).toContain('forbidden-terms')
  })

  it('抓出题面泄露部门关键词', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[1]!.whisper = '「你身上有种协作的味道。」'
    expect(rulesOf(bank)).toContain('forbidden-terms')
  })

  it('抓出题面里的手机号', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[0]!.whisper = '「打给 13800138000 那个人，他知道答案。」'
    expect(rulesOf(bank)).toContain('privacy-terms')
  })

  it('抓出题面里的外链', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[0]!.detail =
      '你想知道的答案其实都写在 https://example.com 上面，只是你从来没有点开过它。'
    expect(rulesOf(bank)).toContain('privacy-terms')
  })
})

describe('校验器能抓出坏题库：特质轨', () => {
  it('抓出特质权重和不等于预算', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[0]!.traits = { explore: 2 }
    expect(rulesOf(bank)).toContain('trait-weight-sum')
  })

  it('抓出特质权重超出取值范围', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[0]!.traits = { explore: 4, insight: -1 }
    expect(rulesOf(bank)).toContain('trait-weight-range')
  })

  it('抓出特质权重不是整数', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[0]!.traits = { explore: 1.5, insight: 1.5 }
    expect(rulesOf(bank)).toContain('trait-weight-range')
  })

  it('抓出一道题里特质铺得太窄', () => {
    const bank = cloneBank()
    // 四个选项全压同一个特质 → 这题分不出画像
    for (const o of bank.questions[0]!.options) {
      o.traits = { explore: OPTION_TRAIT_BUDGET }
    }
    expect(rulesOf(bank)).toContain('trait-question-spread')
  })

  it('抓出某个特质全库覆盖不足', () => {
    const bank = cloneBank()
    // 把所有 connect 权重挪到 explore → connect 轴在雷达图上永远是塌的
    for (const q of bank.questions) {
      for (const o of q.options) {
        const moved = o.traits.connect
        if (moved === undefined) continue
        delete o.traits.connect
        o.traits.explore = (o.traits.explore ?? 0) + moved
      }
    }
    const violations = validateQuestionBank(bank)
    expect(violations.map((v) => v.rule)).toContain('trait-bank-coverage')
    expect(
      violations.find((v) => v.rule === 'trait-bank-coverage')?.detail,
    ).toContain('connect')
  })
})
