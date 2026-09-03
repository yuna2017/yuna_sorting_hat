import { describe, expect, it } from 'vitest'
import { TRAIT_ORDER } from '../data/constants'
import { HAT_REMEMBER_LINES, hatMoodLine, hatRememberLine } from './hatVoice'

const FORBIDDEN = ['擅长', '聪明', '能力强', '适合', '优秀', '智商', '诊断', '心理', '你擅长', '你适合', '你聪明']

describe('帽子人格状态机', () => {
  it('进度旁白：每题一句、11 句各不相同、逐题推进且零随机', () => {
    // 第一题（第 0 屏）留白
    expect(hatMoodLine(0)).toBeNull()
    // 第 1..11 题都有话，且各不相同（不再重复档位）
    const seen = new Set<string>()
    for (let i = 1; i <= 11; i++) {
      const line = hatMoodLine(i)
      expect(line).toBeTruthy()
      seen.add(line as string)
    }
    expect(seen.size).toBe(11)
    // 超出题库的题号（理论不发生）收在最后一句，仍确定
    expect(hatMoodLine(12)).toBe(hatMoodLine(11))
    // 确定性：同题号重复调用结果相同
    for (let i = 1; i <= 11; i++) expect(hatMoodLine(i)).toBe(hatMoodLine(i))
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