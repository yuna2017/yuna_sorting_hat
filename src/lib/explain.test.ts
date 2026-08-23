import { describe, expect, it } from 'vitest'
import { DEPT_ORDER } from '../data/constants'
import type { DeptId } from '../data/constants'
import { QUESTION_BANK } from '../data/questions'
import { explainVerdict, verdictStrength } from './explain'
import { resolveWinner } from './scoring'
import type { AnswerMap } from './scoring'

/** 全选主推某部门的答案。 */
function answersAllPrimary(dept: DeptId): AnswerMap {
  const answers: AnswerMap = {}
  for (const q of QUESTION_BANK.questions) {
    const option = q.options.find((o) => o.p === dept)
    if (option === undefined) throw new Error(`题 ${q.id} 没有主推 ${dept} 的选项`)
    answers[q.id] = option.id
  }
  return answers
}

describe('结果解释', () => {
  it('解释不改判定：winner 始终来自 resolveWinner', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const verdict = resolveWinner(QUESTION_BANK, answers)
      const explanation = explainVerdict(QUESTION_BANK, answers, verdict)

      expect(verdict.winner).toBe(dept)
      expect(explanation.primaryPicks).toBe(QUESTION_BANK.questions.length)
      expect(explanation.runnerUp).not.toBe(dept)
      expect(explanation.gap).toBeGreaterThan(0)
    }
  })

  it('证据来自用户真实选过的选项，最多三条', () => {
    const answers = answersAllPrimary('sec')
    const verdict = resolveWinner(QUESTION_BANK, answers)
    const { evidence } = explainVerdict(QUESTION_BANK, answers, verdict)

    expect(evidence).toHaveLength(3)
    for (const e of evidence) {
      const q = QUESTION_BANK.questions.find((x) => x.id === e.questionId)
      expect(q, `证据引用了不存在的题 ${e.questionId}`).toBeDefined()
      expect(q!.title).toBe(e.questionTitle)
      // 文案必须是该题里真实存在的某个选项，不能是拼出来的
      expect(q!.options.some((o) => o.text === e.choice)).toBe(true)
    }
  })

  it('未作答时不编造证据', () => {
    const verdict = resolveWinner(QUESTION_BANK, {})
    const explanation = explainVerdict(QUESTION_BANK, {}, verdict)

    expect(explanation.evidence).toEqual([])
    expect(explanation.primaryPicks).toBe(0)
    expect(explanation.secondaryPicks).toBe(0)
    expect(explanation.gap).toBe(0)
    expect(DEPT_ORDER).toContain(explanation.runnerUp)
  })

  it('全主推同一部门时判定强度为 decisive', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const verdict = resolveWinner(QUESTION_BANK, answers)
      const explanation = explainVerdict(QUESTION_BANK, answers, verdict)
      expect(verdictStrength(QUESTION_BANK, explanation)).toBe('decisive')
    }
  })

  it('分差不足一次主选时判定强度为 narrow', () => {
    // 每题都选第一个选项，得到一份分布更散的答案
    const answers: AnswerMap = {}
    for (const q of QUESTION_BANK.questions) answers[q.id] = q.options[0]!.id
    const verdict = resolveWinner(QUESTION_BANK, answers)
    const explanation = explainVerdict(QUESTION_BANK, answers, verdict)

    const strength = verdictStrength(QUESTION_BANK, explanation)
    if (explanation.gap < 3 && explanation.primaryPicks < QUESTION_BANK.questions.length * 0.6) {
      expect(strength).toBe('narrow')
    } else {
      expect(['decisive', 'clear']).toContain(strength)
    }
  })

  it('并列被决胜题解决时 deciderBackedWinner 为真', () => {
    // 扫全部 4^10 组合，确认这条分支能被解释正确反映
    const questions = QUESTION_BANK.questions
    const ids = ['a', 'b', 'c', 'd'] as const
    let seen = 0

    for (let n = 0; n < 4 ** questions.length && seen < 1; n++) {
      const answers: AnswerMap = {}
      let rest = n
      for (const q of questions) {
        answers[q.id] = ids[rest % 4]!
        rest = Math.floor(rest / 4)
      }
      const verdict = resolveWinner(QUESTION_BANK, answers)
      if (verdict.tieBreakStage !== 'decider-question') continue

      const explanation = explainVerdict(QUESTION_BANK, answers, verdict)
      expect(explanation.deciderBackedWinner).toBe(true)
      seen++
    }

    expect(seen, '题库里应至少存在一份走到决胜题的答案').toBe(1)
  })
})
