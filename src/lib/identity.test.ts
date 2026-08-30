import { describe, expect, it } from 'vitest'
import { DEPT_ORDER } from '../data/constants'
import type { DeptId } from '../data/constants'
import { drawBank } from './drawQuestions'
import { explainVerdict } from './explain'
import { deriveBehaviorIdentity } from './identity'
import { resolveWinner } from './scoring'
import type { AnswerMap } from './scoring'

/** 固定种子抽出一场题目，让断言可复现。 */
const QUESTION_BANK = drawBank(1)

function answersAllPrimary(dept: DeptId): AnswerMap {
  const answers: AnswerMap = {}
  for (const q of QUESTION_BANK.questions) {
    const option = q.options.find((o) => o.p === dept)
    if (option === undefined) throw new Error(`题 ${q.id} 缺少主推 ${dept}`)
    answers[q.id] = option.id
  }
  return answers
}

describe('行为身份', () => {
  it('只解释结果，不改变 winner，且相同答案稳定', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const verdict = resolveWinner(QUESTION_BANK, answers)
      const explanation = explainVerdict(QUESTION_BANK, answers, verdict)
      const first = deriveBehaviorIdentity(QUESTION_BANK, answers, verdict, explanation)
      const second = deriveBehaviorIdentity(QUESTION_BANK, answers, verdict, explanation)
      expect(verdict.winner).toBe(dept)
      expect(first).toEqual(second)
      expect(first.name.length).toBeGreaterThan(0)
    }
  })
})
