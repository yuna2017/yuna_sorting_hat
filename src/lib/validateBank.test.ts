import { describe, expect, it } from 'vitest'
import { QUESTION_BANK } from '../data/questions'
import type { QuestionBank } from '../data/questions'
import { formatViolations, validateQuestionBank } from './validateBank'

describe('题库不变量', () => {
  it('现有题库零违规', () => {
    const violations = validateQuestionBank(QUESTION_BANK)
    expect(violations, `\n${formatViolations(violations)}`).toEqual([])
  })

  it('恰好 10 题，每题 4 选项', () => {
    expect(QUESTION_BANK.questions).toHaveLength(10)
    for (const q of QUESTION_BANK.questions) {
      expect(q.options, `题 ${q.id}`).toHaveLength(4)
    }
  })

  it('恰好标记了一道决胜题，且是 q10', () => {
    const deciders = QUESTION_BANK.questions.filter((q) => q.decider)
    expect(deciders).toHaveLength(1)
    expect(deciders[0]?.id).toBe('q10')
  })

  it('每个选项都有文案与低语', () => {
    for (const q of QUESTION_BANK.questions) {
      expect(q.title.length, `题 ${q.id} 标题`).toBeGreaterThan(0)
      expect(q.scene.length, `题 ${q.id} 场景`).toBeGreaterThan(0)
      for (const o of q.options) {
        expect(o.text.length, `${q.id}${o.id} 正文`).toBeGreaterThan(0)
        expect(o.whisper.length, `${q.id}${o.id} 低语`).toBeGreaterThan(0)
      }
    }
  })
})

// ---- 校验器本身必须真的能抓出坏题库 ----

/** 深拷贝一份可以随便改坏的题库。 */
function cloneBank(): QuestionBank {
  return structuredClone(QUESTION_BANK)
}

describe('校验器能抓出坏题库', () => {
  it('抓出主推重复（某部门没有 +3 路径）', () => {
    const bank = cloneBank()
    // 把 q1 的 c 从 sec 改成 dev → dev 主推两次，sec 一次都没有
    bank.questions[0]!.options[2]!.p = 'dev'
    const rules = validateQuestionBank(bank).map((v) => v.rule)
    expect(rules).toContain('primary-covers-all-depts')
  })

  it('抓出固定点（p === s）', () => {
    const bank = cloneBank()
    bank.questions[0]!.options[0]!.s = 'dev' // a 是 dev 主推，副推也改成 dev
    const rules = validateQuestionBank(bank).map((v) => v.rule)
    expect(rules).toContain('no-fixed-point')
  })

  it('抓出副推不构成置换', () => {
    const bank = cloneBank()
    // q1 副推原为 sec/pr/ops/dev，把 pr 改成 sec → sec 两次、pr 缺席
    bank.questions[0]!.options[1]!.s = 'sec'
    const rules = validateQuestionBank(bank).map((v) => v.rule)
    expect(rules).toContain('secondary-is-derangement')
  })

  it('抓出选项数量不对', () => {
    const bank = cloneBank()
    bank.questions[0]!.options.pop()
    const rules = validateQuestionBank(bank).map((v) => v.rule)
    expect(rules).toContain('option-count')
  })

  it('抓出多道决胜题', () => {
    const bank = cloneBank()
    bank.questions[0]!.decider = true // q10 已是决胜题
    const rules = validateQuestionBank(bank).map((v) => v.rule)
    expect(rules).toContain('single-decider')
  })

  it('抓出题目 id 重复', () => {
    const bank = cloneBank()
    bank.questions[1]!.id = 'q1'
    const rules = validateQuestionBank(bank).map((v) => v.rule)
    expect(rules).toContain('unique-question-id')
  })
})
