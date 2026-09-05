import { describe, expect, it } from 'vitest'
import { DEPT_ORDER, PRIMARY_WEIGHT, SECONDARY_WEIGHT } from '../data/constants'
import { drawBank } from './drawQuestions'
import { formatSimulationReport, simulateBank } from './simulate'
import { resolveWinner } from './scoring'
import type { AnswerMap } from './scoring'

/** 固定种子抽出一场题目，让均分基线可复现。 */
const QUESTION_BANK = drawBank(1)

/**
 * 随机作答下每个部门的理论均分：每题四选项里有一个主推它、一个副推它，
 * 所以期望 = 题数 × (主推 + 副推) / 4。从题数派生，题库扩到 12 题时不用改这里。
 */
const EXPECTED_AVERAGE =
  (QUESTION_BANK.questions.length * (PRIMARY_WEIGHT + SECONDARY_WEIGHT)) / 4
const TOLERANCE = 0.25

function seededRandom(seed = 0x59f2a17): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

describe('题库分布模拟', () => {
  it('四部门可达，分数均值接近且输出报告', () => {
    const report = simulateBank(QUESTION_BANK, 20000, seededRandom())
    console.log(`\n${formatSimulationReport(report)}`)

    expect(report.runs).toBe(20000)
    expect(report.tieCounts).toBeGreaterThan(0)
    for (const dept of DEPT_ORDER) {
      expect(report.winnerCounts[dept], `${dept} 应可达`).toBeGreaterThan(0)
      expect(report.averageScores[dept]).toBeGreaterThan(EXPECTED_AVERAGE * (1 - TOLERANCE))
      expect(report.averageScores[dept]).toBeLessThan(EXPECTED_AVERAGE * (1 + TOLERANCE))
    }
  })

  it('单一部门倾向策略：每题的 p 都投给同一部门时，该部门必胜', () => {
    for (const dept of DEPT_ORDER) {
      const answers: AnswerMap = {}
      for (const q of QUESTION_BANK.questions) {
        const fav = q.options.find((o) => o.p === dept)
        if (fav !== undefined) answers[q.id] = fav.id
      }
      const verdict = resolveWinner(QUESTION_BANK, answers)
      expect(verdict.winner, `${dept} 倾向策略应稳拿该部门`).toBe(dept)
    }
  })

  it('边界策略：全选同一选项编号时，结果确定且可复现（零随机）', () => {
    const ids = ['a', 'b', 'c', 'd'] as const
    const results = ids.map((letter) => {
      const answers: AnswerMap = {}
      for (const q of QUESTION_BANK.questions) {
        const option = q.options.find((o) => o.id === letter)
        if (option === undefined) throw new Error(`题 ${q.id} 缺少选项 ${letter}`)
        answers[q.id] = option.id
      }
      const first = resolveWinner(QUESTION_BANK, answers)
      const second = resolveWinner(QUESTION_BANK, answers)
      expect(second.winner).toBe(first.winner)
      expect(second.tiedWith).toEqual(first.tiedWith)
      expect(second.scores).toEqual(first.scores)
      expect(second.tieBreakStage).toBe(first.tieBreakStage)
      return first.winner
    })
    // 四个位置不该全落在同一部门 —— 否则选项等于没有区分度
    expect(new Set(results).size).toBeGreaterThan(1)
  })
})
