import type { DeptId } from '../data/constants'
import { DEPT_ORDER, PRIMARY_WEIGHT } from '../data/constants'
import type { QuestionBank } from '../data/questions'
import { chosenOption } from './scoring'
import type { AnswerMap, Verdict } from './scoring'

/** 一条「你选过这个」的证据。 */
export interface Evidence {
  questionId: string
  /** 题面标题，给用户回忆是哪一道。 */
  questionTitle: string
  /** 所选选项正文。 */
  choice: string
}

export interface Explanation {
  /** 冠军被主选（+3）的次数。 */
  primaryPicks: number
  /** 冠军被副推（+1）的次数。 */
  secondaryPicks: number
  /** 亚军部门。全零答案时也有值（按 DEPT_ORDER 回退）。 */
  runnerUp: DeptId
  /** 冠军领先亚军的原始分差。 */
  gap: number
  /** 最能代表判定的几次选择，按题序取前 N 条。 */
  evidence: Evidence[]
  /** 决胜题是否直接把票投给了冠军。 */
  deciderBackedWinner: boolean
}

/** evidence 最多取几条 —— 结果页要能一眼读完，不是答题记录回放。 */
const MAX_EVIDENCE = 3

/**
 * 从答案里反推「为什么是这个部门」。
 *
 * 关键约束：**只做解释，不做判定**。winner 一律来自 resolveWinner()，
 * 本函数不重新计算胜者，也不引入随机 —— 否则解释会和结果对不上。
 *
 * 之所以要它：结果页此前只有分数和雷达图，用户看不到自己的哪些选择导致了
 * 这个结果，「为什么是我」这一层缺失，招新引导就断在这里。
 */
export function explainVerdict(
  bank: QuestionBank,
  answers: AnswerMap,
  verdict: Verdict,
): Explanation {
  const { winner } = verdict

  let primaryPicks = 0
  let secondaryPicks = 0
  const evidence: Evidence[] = []

  for (const q of bank.questions) {
    const chosen = chosenOption(q, answers)
    if (chosen === undefined) continue
    if (chosen.p === winner) {
      primaryPicks += 1
      if (evidence.length < MAX_EVIDENCE) {
        evidence.push({ questionId: q.id, questionTitle: q.title, choice: chosen.text })
      }
    }
    if (chosen.s === winner) secondaryPicks += 1
  }

  // 主选证据不够时（冠军可能是靠大量副推攒出来的），补上副推的选择
  if (evidence.length < MAX_EVIDENCE) {
    for (const q of bank.questions) {
      if (evidence.length >= MAX_EVIDENCE) break
      const chosen = chosenOption(q, answers)
      if (chosen === undefined || chosen.s !== winner) continue
      if (evidence.some((e) => e.questionId === q.id)) continue
      evidence.push({ questionId: q.id, questionTitle: q.title, choice: chosen.text })
    }
  }

  const others = DEPT_ORDER.filter((d) => d !== winner)
  const runnerUpScore = Math.max(...others.map((d) => verdict.scores[d]))
  // 同分时按 DEPT_ORDER 取第一个，与 resolveWinner 的回退顺序保持一致
  const runnerUp = others.find((d) => verdict.scores[d] === runnerUpScore) ?? others[0]!

  return {
    primaryPicks,
    secondaryPicks,
    runnerUp,
    gap: verdict.scores[winner] - runnerUpScore,
    evidence,
    deciderBackedWinner: verdict.tieBreakStage === 'decider-question',
  }
}

/**
 * 一句话总结判定强度。分档依据是「主选次数」而非百分比 ——
 * 百分比容易被读成测评准确率，次数只是在陈述用户自己做过的事。
 */
export function verdictStrength(
  bank: QuestionBank,
  explanation: Explanation,
): 'decisive' | 'clear' | 'narrow' {
  const total = bank.questions.length
  if (explanation.primaryPicks >= total * 0.6) return 'decisive'
  // 领先不到一次主选的分量，就算「咬得很紧」
  if (explanation.gap < PRIMARY_WEIGHT) return 'narrow'
  return 'clear'
}
