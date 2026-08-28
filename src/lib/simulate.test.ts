import { describe, expect, it } from 'vitest'
import { DEPT_ORDER } from '../data/constants'
import { QUESTION_BANK } from '../data/questions'
import { formatSimulationReport, simulateBank } from './simulate'

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
      expect(report.averageScores[dept]).toBeGreaterThan(8)
      expect(report.averageScores[dept]).toBeLessThan(12)
    }
  })
})
