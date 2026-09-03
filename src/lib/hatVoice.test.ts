import { describe, expect, it } from 'vitest'
import { TRAIT_ORDER } from '../data/constants'
import { HAT_REMEMBER_LINES, hatMoodLine, hatRememberLine } from './hatVoice'

const FORBIDDEN = ['擅长', '聪明', '能力强', '适合', '优秀', '智商', '诊断', '心理', '你擅长', '你适合', '你聪明']

describe('帽子人格状态机', () => {
  it('低语随进度变化，且同一进度的答案永远一致（零随机）', () => {
    // 第一题留白
    expect(hatMoodLine(0)).toBeNull()
    // 四个档位各有话、互不相同
    const seen = new Set<string>()
    for (const i of [1, 4, 7, 10]) {
      const line = hatMoodLine(i)
      expect(line).toBeTruthy()
      seen.add(line as string)
    }
    expect(seen.size).toBe(4)
    // 确定性：同档位重复调用结果相同
    expect(hatMoodLine(2)).toBe(hatMoodLine(3))
    expect(hatMoodLine(5)).toBe(hatMoodLine(6))
    expect(hatMoodLine(8)).toBe(hatMoodLine(9))
    expect(hatMoodLine(11)).toBe(hatMoodLine(12))
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