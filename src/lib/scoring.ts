import type { DeptId, NormalizedScores, Scores } from '../data/constants'
import { DEPT_ORDER, PRIMARY_WEIGHT, SECONDARY_WEIGHT } from '../data/constants'
import type { OptionId, Question, QuestionBank, QuizOption } from '../data/questions'

/** 答案表：题目 id → 选项 id。缺项 = 该题未作答。 */
export type AnswerMap = Record<string, OptionId | undefined>

/** 决胜走到了哪一层。便于测试断言与结果页文案。 */
export type TieBreakStage = 'none' | 'primary-count' | 'decider-question' | 'fixed-order'

export interface Verdict {
  winner: DeptId
  scores: Scores
  normalized: NormalizedScores
  /** 单个部门的理论满分 = 题数 × PRIMARY_WEIGHT。 */
  maxScore: number
  /** 与冠军同分的其他部门（不含冠军本身）。非空即说明发生了并列。 */
  tiedWith: DeptId[]
  tieBreakStage: TieBreakStage
}

/** 四部门全零的分数表。从 DEPT_ORDER 派生，加部门时不会漏。 */
export function emptyScores(): Scores {
  const scores = {} as Scores
  for (const dept of DEPT_ORDER) scores[dept] = 0
  return scores
}

/**
 * 单个部门的理论满分。
 * 每题必有一条 +3 路径，所以满分 = 题数 × 3；加题后自动跟随，无需改判定逻辑。
 */
export function maxScorePerDept(bank: QuestionBank): number {
  return bank.questions.length * PRIMARY_WEIGHT
}

/** 取某题实际选中的选项。未作答或 id 非法时返回 undefined。 */
export function chosenOption(q: Question, answers: AnswerMap): QuizOption | undefined {
  const optionId = answers[q.id]
  if (optionId === undefined) return undefined
  return q.options.find((o) => o.id === optionId)
}

/** 计分：主推 +3，副推 +1。 */
export function tally(bank: QuestionBank, answers: AnswerMap): Scores {
  const scores = emptyScores()
  for (const q of bank.questions) {
    const chosen = chosenOption(q, answers)
    if (chosen === undefined) continue
    scores[chosen.p] += PRIMARY_WEIGHT
    scores[chosen.s] += SECONDARY_WEIGHT
  }
  return scores
}

/** 各部门被「主选」（吃到 +3）的次数。并列决胜第 1 层要用。 */
export function primaryPickCounts(bank: QuestionBank, answers: AnswerMap): Scores {
  const counts = emptyScores()
  for (const q of bank.questions) {
    const chosen = chosenOption(q, answers)
    if (chosen !== undefined) counts[chosen.p] += 1
  }
  return counts
}

/**
 * 归一化：一律除以**单部门满分**，而不是除以总分。
 *
 * 题目文档点名的易错点 —— 除以总分会让四个轴互相挤压，看不出个人特征。
 * 例：某人四项 30/10/10/10，除满分得 100%/33%/33%/33%（特征鲜明）；
 * 除总分（60）则得 50%/17%/17%/17%，四轴被压扁。
 */
export function normalize(scores: Scores, maxScore: number): NormalizedScores {
  const normalized = {} as NormalizedScores
  for (const dept of DEPT_ORDER) {
    normalized[dept] = maxScore === 0 ? 0 : scores[dept] / maxScore
  }
  return normalized
}

/**
 * 决胜题：优先取显式标记 decider 的题，否则回落到最后一题。
 * 题目文档指定 Q10（价值观题）担任决胜局。
 */
export function deciderQuestion(bank: QuestionBank): Question | undefined {
  const flagged = bank.questions.find((q) => q.decider)
  if (flagged !== undefined) return flagged
  return bank.questions[bank.questions.length - 1]
}

function deciderPrimary(bank: QuestionBank, answers: AnswerMap): DeptId | undefined {
  const q = deciderQuestion(bank)
  if (q === undefined) return undefined
  return chosenOption(q, answers)?.p
}

/**
 * 取候选集的第一个。候选集由 DEPT_ORDER.filter 产生，
 * 因此天然按 dev > sec > ops > pr 排列 —— 「取第一个」即固定顺序回退。
 */
function firstByDeptOrder(candidates: readonly DeptId[]): DeptId {
  const first = candidates[0]
  if (first === undefined) {
    throw new Error('候选部门集合为空：最高分必然被至少一个部门取到，不应发生')
  }
  return first
}

/**
 * 判定最终部门。取最高分，并列时依次：
 *   1. 被主选（+3）的次数多者胜；
 *   2. 决胜题所选的主推部门，若它在并列集合中则它胜；
 *   3. 固定顺序 dev > sec > ops > pr 取第一个。
 *
 * **全程零随机**（题目文档硬要求）：随机决胜会让同一份答案刷新出不同结果，
 * 分享链接也无法复现。本函数对同一输入永远返回同一结果。
 */
export function resolveWinner(bank: QuestionBank, answers: AnswerMap): Verdict {
  const scores = tally(bank, answers)
  const maxScore = maxScorePerDept(bank)
  const normalized = normalize(scores, maxScore)

  const topScore = Math.max(...DEPT_ORDER.map((dept) => scores[dept]))
  const tied = DEPT_ORDER.filter((dept) => scores[dept] === topScore)

  let winner = firstByDeptOrder(tied)
  let tieBreakStage: TieBreakStage = 'none'

  if (tied.length > 1) {
    // 第 1 层：主选次数
    const picks = primaryPickCounts(bank, answers)
    const mostPicks = Math.max(...tied.map((dept) => picks[dept]))
    const byPicks = tied.filter((dept) => picks[dept] === mostPicks)

    if (byPicks.length === 1) {
      winner = firstByDeptOrder(byPicks)
      tieBreakStage = 'primary-count'
    } else {
      // 第 2 层：决胜题
      const deciderDept = deciderPrimary(bank, answers)
      if (deciderDept !== undefined && byPicks.includes(deciderDept)) {
        winner = deciderDept
        tieBreakStage = 'decider-question'
      } else {
        // 第 3 层：固定顺序
        winner = firstByDeptOrder(byPicks)
        tieBreakStage = 'fixed-order'
      }
    }
  }

  return {
    winner,
    scores,
    normalized,
    maxScore,
    tiedWith: tied.filter((dept) => dept !== winner),
    tieBreakStage,
  }
}

/** 已作答题数。 */
export function answeredCount(bank: QuestionBank, answers: AnswerMap): number {
  return bank.questions.filter((q) => chosenOption(q, answers) !== undefined).length
}

/** 是否全部作答完毕。 */
export function isComplete(bank: QuestionBank, answers: AnswerMap): boolean {
  return answeredCount(bank, answers) === bank.questions.length
}

/** 归一化值 → 整数百分比，供结果页数字读数使用。 */
export function toPercent(normalized: number): number {
  return Math.round(normalized * 100)
}
