import { describe, expect, it } from 'vitest'
import { TRAIT_ORDER } from '../data/constants'
import { HAT_MOOD_POOLS, HAT_REMEMBER_LINES, hatMoodLine, hatRememberLine } from './hatVoice'

const FORBIDDEN = ['擅长', '聪明', '能力强', '适合', '优秀', '智商', '诊断', '心理', '你擅长', '你适合', '你聪明']

function finalPoolHas(line: string | null): boolean {
  return line !== null && HAT_MOOD_POOLS.final.includes(line)
}

describe('帽子人格状态机', () => {
  it('进度旁白：每个阶段都有话语池、池内不止一句、逐题推进且零随机', () => {
    // 第一屏留白
    expect(hatMoodLine(0)).toBeNull()
    // 四个阶段各有话池，且每池 ≥2 句（否则没得轮换）
    const stages = Object.values(HAT_MOOD_POOLS)
    expect(stages.length).toBe(4)
    for (const pool of stages) expect(pool.length).toBeGreaterThanOrEqual(2)
    // 第 1..11 题都能取到旁白
    const seen = new Set<string>()
    for (let i = 1; i <= 11; i++) {
      const line = hatMoodLine(i)
      expect(line).toBeTruthy()
      seen.add(line as string)
    }
    expect(seen.size).toBeGreaterThanOrEqual(4) // 至少有阶段级多样性
    // 确定性：同题号重复调用结果相同
    for (let i = 1; i <= 12; i++) expect(hatMoodLine(i)).toBe(hatMoodLine(i))
    // 超出题库的题号（理论不发生）仍在 final 池内循环，不抛错
    expect(finalPoolHas(hatMoodLine(12))).toBe(true)
  })

  it('「记得你」：五个主导特质都有专属句子，且零随机', () => {
    for (const trait of TRAIT_ORDER) {
      const line = hatRememberLine(trait)
      expect(line.length).toBeGreaterThan(0)
      expect(HAT_REMEMBER_LINES[trait]).toBe(line)
      expect(hatRememberLine(trait)).toBe(line) // 确定可复现
    }
  })

  it('红线：旁白与「记得你」的措辞不做心理诊断、不泄部门', () => {
    const allLines = [
      ...Array.from({ length: 13 }, (_, i) => hatMoodLine(i)).filter((l): l is string => l !== null),
      ...TRAIT_ORDER.map((t) => hatRememberLine(t)),
    ]
    for (const line of allLines) {
      for (const term of FORBIDDEN) {
        expect(line).not.toContain(term)
      }
    }
  })
})