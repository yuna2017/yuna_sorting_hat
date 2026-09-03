import { DEPT_ORDER } from '../data/constants'
import type { Scores } from '../data/constants'
import type { QuestionBank } from '../data/questions'
import type { AnswerMap } from './scoring'
import { emptyScores, resolveWinner, tally } from './scoring'
import type { TieBreakStage } from './scoring'

/** 决胜层级各走了多少次。并列率只说明「有没有并列」，这层说明并列靠什么拆的。 */
export type TieBreakStageCounts = Record<TieBreakStage, number>

export interface SimulationReport {
  runs: number
  winnerCounts: Scores
  tieCounts: number
  averageScores: Scores
  tieBreakStageCounts: TieBreakStageCounts
  /** 冠军领先亚军的原始分差：均值 / 最小 / 最大。分差小说明结果没这么稳。 */
  avgGap: number
  minGap: number
  maxGap: number
}

function emptyTieBreakCounts(): TieBreakStageCounts {
  return { none: 0, 'primary-count': 0, 'decider-question': 0, 'fixed-order': 0 }
}

/** 对随机规范选项序列做轻量 Monte Carlo 体检，不参与运行时判定。 */
export function simulateBank(
  bank: QuestionBank,
  runs = 10000,
  random: () => number = Math.random,
): SimulationReport {
  const winnerCounts = emptyScores()
  const scoreTotals = emptyScores()
  const tieBreakStageCounts = emptyTieBreakCounts()
  let tieCounts = 0
  let gapTotal = 0
  let minGap = Infinity
  let maxGap = -Infinity

  for (let run = 0; run < runs; run++) {
    const answers: AnswerMap = {}
    for (const q of bank.questions) {
      const choice = q.options[Math.floor(random() * q.options.length)]
      if (choice !== undefined) answers[q.id] = choice.id
    }
    const verdict = resolveWinner(bank, answers)
    winnerCounts[verdict.winner] += 1
    if (verdict.tiedWith.length > 0) tieCounts += 1
    tieBreakStageCounts[verdict.tieBreakStage] += 1

    const scores = tally(bank, answers)
    for (const dept of DEPT_ORDER) scoreTotals[dept] += scores[dept]

    // 冠军领先亚军的原始分差（亚军 = 其余部门里得分最高者）
    const others = DEPT_ORDER.filter((d) => d !== verdict.winner)
    const runnerUpScore = Math.max(...others.map((d) => scores[d]))
    const gap = scores[verdict.winner] - runnerUpScore
    gapTotal += gap
    if (gap < minGap) minGap = gap
    if (gap > maxGap) maxGap = gap
  }

  const averageScores = emptyScores()
  for (const dept of DEPT_ORDER) averageScores[dept] = runs === 0 ? 0 : scoreTotals[dept] / runs

  return {
    runs,
    winnerCounts,
    tieCounts,
    averageScores,
    tieBreakStageCounts,
    avgGap: runs === 0 ? 0 : gapTotal / runs,
    minGap: runs === 0 ? 0 : minGap,
    maxGap: runs === 0 ? 0 : maxGap,
  }
}

const STAGE_LABELS: Record<TieBreakStage, string> = {
  none: '无并列',
  'primary-count': '主选数决胜',
  'decider-question': '决胜题',
  'fixed-order': '固定顺序',
}

export function formatSimulationReport(report: SimulationReport): string {
  const ratio = (n: number) => (report.runs === 0 ? 0 : n / report.runs)
  const winners = DEPT_ORDER.map(
    (dept) => `${dept} ${(ratio(report.winnerCounts[dept]) * 100).toFixed(1)}%`,
  ).join(' · ')
  const averages = DEPT_ORDER.map(
    (dept) => `${dept} ${report.averageScores[dept].toFixed(1)}`,
  ).join(' · ')
  const ties = ratio(report.tieCounts) * 100
  const stages = (Object.keys(report.tieBreakStageCounts) as TieBreakStage[])
    .map((stage) => `${STAGE_LABELS[stage]} ${(ratio(report.tieBreakStageCounts[stage]) * 100).toFixed(1)}%`)
    .join(' · ')

  return (
    `胜率：${winners}\n` +
    `平均分：${averages}\n` +
    `顶部并列率：${ties.toFixed(1)}%（决胜层级：${stages}）\n` +
    `领先分差：均值 ${report.avgGap.toFixed(2)} / 最小 ${report.minGap} / 最大 ${report.maxGap}`
  )
}