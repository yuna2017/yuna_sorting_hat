import { describe, expect, it } from 'vitest'
import { DEPT_ORDER, PRIMARY_WEIGHT, SECONDARY_WEIGHT } from '../data/constants'
import { drawBank } from './drawQuestions'
import { formatSimulationReport, simulateBank } from './simulate'

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
})
