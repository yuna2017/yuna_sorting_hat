import { describe, expect, it } from 'vitest'
import { DEPT_ORDER } from '../data/constants'
import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import { QUESTION_BANK } from '../data/questions'
import { isComplete, resolveWinner } from './scoring'
import type { AnswerMap } from './scoring'
import {
  buildShareText,
  buildShareUrl,
  decodeAnswers,
  encodeAnswers,
  readShareCodeFromUrl,
} from './shareCode'

/** 全选主推某部门的答案。 */
function answersAllPrimary(dept: DeptId): AnswerMap {
  const answers: AnswerMap = {}
  for (const q of QUESTION_BANK.questions) {
    const option = q.options.find((o) => o.p === dept)
    if (option === undefined) throw new Error(`题 ${q.id} 没有主推 ${dept} 的选项`)
    answers[q.id] = option.id
  }
  return answers
}

describe('分享码编解码', () => {
  it('往返后答案完全一致', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const code = encodeAnswers(QUESTION_BANK, answers)
      expect(code, `${dept} 的码应为 10 位`).toHaveLength(10)
      expect(decodeAnswers(QUESTION_BANK, code)).toEqual(answers)
    }
  })

  it('同一份码还原出同一个结果（分享链接可复现）', () => {
    for (const dept of DEPT_ORDER) {
      const original = answersAllPrimary(dept)
      const restored = decodeAnswers(QUESTION_BANK, encodeAnswers(QUESTION_BANK, original))
      expect(restored).not.toBeNull()
      const before = resolveWinner(QUESTION_BANK, original)
      const after = resolveWinner(QUESTION_BANK, restored!)
      expect(after).toEqual(before)
      expect(after.winner).toBe(dept)
    }
  })

  it('未作答的题编码成 -，解码后仍是未作答', () => {
    const code = encodeAnswers(QUESTION_BANK, { q1: 'a' })
    expect(code).toBe('a---------')
    const decoded = decodeAnswers(QUESTION_BANK, code)
    expect(decoded).toEqual({ q1: 'a' })
    expect(isComplete(QUESTION_BANK, decoded!)).toBe(false)
  })

  it('长度不符或含非法字符时返回 null，而不是渲染半残结果', () => {
    expect(decodeAnswers(QUESTION_BANK, 'abc')).toBeNull()
    expect(decodeAnswers(QUESTION_BANK, 'abcdabcdabcd')).toBeNull()
    expect(decodeAnswers(QUESTION_BANK, 'abcdabcdaz')).toBeNull()
    expect(decodeAnswers(QUESTION_BANK, '')).toBeNull()
  })

  it('大小写与空白都能容错', () => {
    expect(decodeAnswers(QUESTION_BANK, '  ACBDDBABAD ')).toEqual(
      answersAllPrimary('dev'),
    )
  })

  it('从 URL 查询串读码', () => {
    const answers = answersAllPrimary('ops')
    const code = encodeAnswers(QUESTION_BANK, answers)
    expect(readShareCodeFromUrl(QUESTION_BANK, `?a=${code}`)).toEqual(answers)
    expect(readShareCodeFromUrl(QUESTION_BANK, '')).toBeNull()
    expect(readShareCodeFromUrl(QUESTION_BANK, '?a=nonsense')).toBeNull()
  })

  it('生成的链接带 base 路径且可被解析回来', () => {
    const answers = answersAllPrimary('pr')
    const url = buildShareUrl(
      QUESTION_BANK,
      answers,
      'https://example.github.io',
      '/yuna_sorting_hat/',
    )
    expect(url).toBe('https://example.github.io/yuna_sorting_hat/?a=dbcacadcba')
    expect(readShareCodeFromUrl(QUESTION_BANK, new URL(url).search)).toEqual(answers)
  })

  it('分享链接还原后判定完全一致（分享不改结果）', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const url = buildShareUrl(
        QUESTION_BANK,
        answers,
        'https://example.github.io',
        '/yuna_sorting_hat/',
      )
      const restored = readShareCodeFromUrl(QUESTION_BANK, new URL(url).search)
      expect(restored).not.toBeNull()
      expect(isComplete(QUESTION_BANK, restored!)).toBe(true)
      expect(resolveWinner(QUESTION_BANK, restored!)).toEqual(
        resolveWinner(QUESTION_BANK, answers),
      )
    }
  })

  it('分享文案把链接单独放一行，QQ/微信才能完整识别', () => {
    const url = 'https://example.github.io/yuna_sorting_hat/?a=dbcacadcba'
    const text = buildShareText(DEPARTMENTS.pr.name, url)

    expect(text).toContain('「组宣部」')
    const lines = text.split('\n')
    // 链接必须自己占满一行：夹在中文标点之间会被自动识别吃掉尾字符
    expect(lines[lines.length - 1]).toBe(url)
    expect(readShareCodeFromUrl(QUESTION_BANK, new URL(lines[lines.length - 1]!).search)).toEqual(
      answersAllPrimary('pr'),
    )
  })
})
