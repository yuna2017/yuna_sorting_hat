import { DEPT_ORDER } from '../data/constants'
import type { Scores } from '../data/constants'
import type { QuestionBank } from '../data/questions'
import type { AnswerMap } from './scoring'
import { emptyScores, resolveWinner, tally } from './scoring'

export interface SimulationReport {
  runs: number
  winnerCounts: Scores
  tieCounts: number
  averageScores: Scores
}

/** 对随机规范选项序列做轻量 Monte Carlo 体检，不参与运行时判定。 */
export function simulateBank(
  bank: QuestionBank,
  runs = 10000,
  random: () => number = Math.random,
): SimulationReport {
  const winnerCounts = emptyScores()
  const scoreTotals = emptyScores()
  let tieCounts = 0

  for (let run = 0; run < runs; run++) {
    const answers: AnswerMap = {}
    for (const q of bank.questions) {
      const choice = q.options[Math.floor(random() * q.options.length)]
      if (choice !== undefined) answers[q.id] = choice.id
    }
    const verdict = resolveWinner(bank, answers)
    winnerCounts[verdict.winner] += 1
    if (verdict.tiedWith.length > 0) tieCounts += 1
    const scores = tally(bank, answers)
    for (const dept of DEPT_ORDER) scoreTotals[dept] += scores[dept]
  }

  const averageScores = emptyScores()
  for (const dept of DEPT_ORDER) averageScores[dept] = runs === 0 ? 0 : scoreTotals[dept] / runs
  return { runs, winnerCounts, tieCounts, averageScores }
}

export function formatSimulationReport(report: SimulationReport): string {
  const winners = DEPT_ORDER.map((dept) => {
    const ratio = report.runs === 0 ? 0 : report.winnerCounts[dept] / report.runs
    return `${dept} ${(ratio * 100).toFixed(1)}%`
  }).join(' · ')
  const averages = DEPT_ORDER.map(
    (dept) => `${dept} ${report.averageScores[dept].toFixed(1)}`,
  ).join(' · ')
  const ties = report.runs === 0 ? 0 : (report.tieCounts / report.runs) * 100
  return `胜率：${winners}\n平均分：${averages}\n顶部并列率：${ties.toFixed(1)}%`
}
