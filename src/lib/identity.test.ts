import { describe, expect, it } from 'vitest'
import { DEPT_ORDER } from '../data/constants'
import type { DeptId } from '../data/constants'
import { drawBank } from './drawQuestions'
import { explainVerdict } from './explain'
import { deriveBehaviorIdentity } from './identity'
import type { BehaviorIdentity } from './identity'
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

  it('红线：身份文案只描述倾向，不做心理诊断或能力评判', () => {
    // 覆盖四个部门 + explorer 兜底（用随机答案大概率走到兜底，直接构造一次）
    const identities: BehaviorIdentity[] = []
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const verdict = resolveWinner(QUESTION_BANK, answers)
      identities.push(
        deriveBehaviorIdentity(
          QUESTION_BANK,
          answers,
          verdict,
          explainVerdict(QUESTION_BANK, answers, verdict),
        ),
      )
    }
    // explorer：不到半数是主选且无主选证据时兜底，构造一个几乎不投 winner 的答案
    const exploreAnswers: AnswerMap = {}
    for (const q of QUESTION_BANK.questions) {
      const option = q.options.find((o) => o.p !== 'dev')
      if (option !== undefined) exploreAnswers[q.id] = option.id
    }
    {
      const verdict = resolveWinner(QUESTION_BANK, exploreAnswers)
      identities.push(
        deriveBehaviorIdentity(
          QUESTION_BANK,
          exploreAnswers,
          verdict,
          explainVerdict(QUESTION_BANK, exploreAnswers, verdict),
        ),
      )
    }

    const forbidden = [
      '擅长',
      '聪明',
      '能力强',
      '适合',
      '你适合',
      '优秀',
      '智商',
      '缺陷',
      '心理',
      '诊断',
      '评判',
      '你是',
      '你应该',
    ]
    for (const id of identities) {
      for (const term of forbidden) {
        expect(`${id.name}${id.desc}`).not.toContain(term)
      }
    }
  })
})
