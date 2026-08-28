import type { DeptId } from '../data/constants'
import type { QuestionBank } from '../data/questions'
import type { AnswerMap, Verdict } from './scoring'
import { chosenOption } from './scoring'
import type { Explanation } from './explain'

export interface BehaviorIdentity {
  id: string
  name: string
  desc: string
}

const IDENTITIES: Record<DeptId, BehaviorIdentity> = {
  dev: { id: 'maker', name: '数字造物者', desc: '你倾向于先动手，把模糊的想法推进成别人真的能用的东西。' },
  sec: { id: 'tracker', name: '问题追踪者', desc: '你会被没想明白的问题勾住，愿意把线索一点点追到底。' },
  ops: { id: 'keeper', name: '系统守夜人', desc: '你在意事情不只完成一次，还能稳定、可靠地运转下去。' },
  pr: { id: 'storyteller', name: '校园叙述者', desc: '你习惯把人和事组织起来，让值得被看见的内容抵达别人。' },
}

/** 行为身份是解释层，不参与判定；相同答案始终返回相同身份。 */
export function deriveBehaviorIdentity(
  bank: QuestionBank,
  answers: AnswerMap,
  verdict: Verdict,
  explanation: Explanation,
): BehaviorIdentity {
  const total = bank.questions.length
  const winnerPrimaryRatio = total === 0 ? 0 : explanation.primaryPicks / total
  const hasWinnerEvidence = explanation.evidence.some((e) => {
    if (answers[e.questionId] === undefined) return false
    const question = bank.questions.find((q) => q.id === e.questionId)
    return question !== undefined && chosenOption(question, answers)?.p === verdict.winner
  })

  if (winnerPrimaryRatio < 0.4 && !hasWinnerEvidence) {
    return {
      id: 'explorer',
      name: '方向探索者',
      desc: '这次选择里有不止一条路线留下了痕迹，结果更像一次方向提示。',
    }
  }
  return IDENTITIES[verdict.winner]
}
