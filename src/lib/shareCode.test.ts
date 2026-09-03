import { describe, expect, it } from 'vitest'
import { DEPT_ORDER } from '../data/constants'
import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import { QUESTION_POOL } from '../data/questions'
import { drawBank } from './drawQuestions'
import { isComplete, resolveWinner } from './scoring'
import type { AnswerMap } from './scoring'
import {
  buildShareMessage,
  buildShareText,
  buildShareUrl,
  decodeAnswers,
  encodeAnswers,
  readSharePayloadFromUrl,
} from './shareCode'

/**
 * v3 起分享链接由三段构成：?v=<题库版本>&s=<抽题种子>&a=<答案码>。
 * 种子是新增的必需项 —— 题库变成池子之后，光有答案码无法知道对方做的是哪 12 道题。
 */
const SEED = 1
const QUESTION_BANK = drawBank(SEED)
const SEED_CODE = SEED.toString(36)

/** 码长与版本号都从题库派生，不写死数字。 */
const CODE_LENGTH = QUESTION_BANK.questions.length
const VERSION = QUESTION_BANK.version

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

/** 按 v3 格式手搓一个查询串。 */
function searchOf(answers: AnswerMap, seed = SEED, version = VERSION): string {
  return `?v=${version}&s=${seed.toString(36)}&a=${encodeAnswers(QUESTION_BANK, answers)}`
}

describe('分享码编解码', () => {
  it('往返后答案完全一致', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const code = encodeAnswers(QUESTION_BANK, answers)
      expect(code, `${dept} 的码应为 ${CODE_LENGTH} 位`).toHaveLength(CODE_LENGTH)
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
    const firstId = QUESTION_BANK.questions[0]!.id
    const code = encodeAnswers(QUESTION_BANK, { [firstId]: 'a' })
    expect(code).toBe(`a${'-'.repeat(CODE_LENGTH - 1)}`)
    const decoded = decodeAnswers(QUESTION_BANK, code)
    expect(decoded).toEqual({ [firstId]: 'a' })
    expect(isComplete(QUESTION_BANK, decoded!)).toBe(false)
  })

  it('长度不符或含非法字符时返回 null，而不是渲染半残结果', () => {
    expect(decodeAnswers(QUESTION_BANK, 'a'.repeat(CODE_LENGTH - 1))).toBeNull()
    expect(decodeAnswers(QUESTION_BANK, 'a'.repeat(CODE_LENGTH + 1))).toBeNull()
    // 长度对但末位不是合法选项
    expect(decodeAnswers(QUESTION_BANK, `${'a'.repeat(CODE_LENGTH - 1)}z`)).toBeNull()
    expect(decodeAnswers(QUESTION_BANK, '')).toBeNull()
  })

  it('大小写与空白都能容错', () => {
    const answers = answersAllPrimary('dev')
    const code = encodeAnswers(QUESTION_BANK, answers)
    expect(decodeAnswers(QUESTION_BANK, `  ${code.toUpperCase()} `)).toEqual(answers)
  })
})

describe('从 URL 读分享载荷', () => {
  it('读出版本、种子与答案，并顺带把题目重建好', () => {
    const answers = answersAllPrimary('ops')
    const payload = readSharePayloadFromUrl(searchOf(answers))

    expect(payload).not.toBeNull()
    expect(payload!.version).toBe(VERSION)
    expect(payload!.seed).toBe(SEED)
    expect(payload!.answers).toEqual(answers)
    // 重建出的题目必须与本地同种子抽出的完全一致，否则答案会对错题
    expect(payload!.bank.questions.map((q) => q.id)).toEqual(
      QUESTION_BANK.questions.map((q) => q.id),
    )
  })

  it('缺参数、乱码、空串一律返回 null', () => {
    const answers = answersAllPrimary('ops')
    const code = encodeAnswers(QUESTION_BANK, answers)

    expect(readSharePayloadFromUrl('')).toBeNull()
    expect(readSharePayloadFromUrl('?a=nonsense')).toBeNull()
    // 有码无版本 = v1/v2 的旧链接格式
    expect(readSharePayloadFromUrl(`?a=${code}`)).toBeNull()
    // 有版本有码但缺种子 → 不知道该抽哪些题，宁可不显示也不能猜
    expect(readSharePayloadFromUrl(`?v=${VERSION}&a=${code}`)).toBeNull()
    expect(readSharePayloadFromUrl(`?v=${VERSION}&s=&a=${code}`)).toBeNull()
    expect(readSharePayloadFromUrl(`?v=${VERSION}&s=ZZZZZZZZZZ&a=${code}`)).toBeNull()
  })

  it('拒绝其他版本的分享码', () => {
    // v1/v2 题库已废除，拿 v3 题池解释旧码会得到一个「看起来正常但其实错」的结果。
    const answers = answersAllPrimary('ops')
    expect(readSharePayloadFromUrl(searchOf(answers, SEED, 1))).toBeNull()
    expect(readSharePayloadFromUrl(searchOf(answers, SEED, 2))).toBeNull()
    expect(readSharePayloadFromUrl(searchOf(answers, SEED, VERSION + 1))).toBeNull()
  })

  it('版本号跟着题池走', () => {
    expect(VERSION).toBe(QUESTION_POOL.version)
  })
})

describe('分享链接与文案', () => {
  it('生成的链接带 base 路径与种子，且可被解析回来', () => {
    const answers = answersAllPrimary('pr')
    const url = buildShareUrl(
      QUESTION_BANK,
      SEED,
      answers,
      'https://example.github.io',
      '/yuna_sorting_hat/',
    )
    const code = encodeAnswers(QUESTION_BANK, answers)

    expect(url).toBe(
      `https://example.github.io/yuna_sorting_hat/?v=${VERSION}&s=${SEED_CODE}&a=${code}`,
    )
    expect(readSharePayloadFromUrl(new URL(url).search)?.answers).toEqual(answers)
  })

  it('分享链接还原后判定完全一致（分享不改结果）', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(dept)
      const url = buildShareUrl(
        QUESTION_BANK,
        SEED,
        answers,
        'https://example.github.io',
        '/yuna_sorting_hat/',
      )
      const payload = readSharePayloadFromUrl(new URL(url).search)

      expect(payload).not.toBeNull()
      expect(isComplete(payload!.bank, payload!.answers)).toBe(true)
      // 用载荷自带的 bank 判定 —— 这才是分享方真正答过的那组题
      expect(resolveWinner(payload!.bank, payload!.answers)).toEqual(
        resolveWinner(QUESTION_BANK, answers),
      )
    }
  })

  it('换一个种子会抽出不同的一场题，各自的链接互不串味', () => {
    const answers = answersAllPrimary('dev')
    const urlA = buildShareUrl(QUESTION_BANK, 1, answers, 'https://e.io', '/x/')
    const urlB = buildShareUrl(QUESTION_BANK, 2, answers, 'https://e.io', '/x/')

    expect(urlA).not.toBe(urlB)
    expect(readSharePayloadFromUrl(new URL(urlA).search)?.seed).toBe(1)
    expect(readSharePayloadFromUrl(new URL(urlB).search)?.seed).toBe(2)
  })

  it('分享文案把链接单独放一行，QQ/微信才能完整识别', () => {
    const answers = answersAllPrimary('pr')
    const url = buildShareUrl(
      QUESTION_BANK,
      SEED,
      answers,
      'https://example.github.io',
      '/yuna_sorting_hat/',
    )
    const text = buildShareText(DEPARTMENTS.pr.name, '校园叙述者', url)

    expect(text).toContain('「组宣部」')
    const lines = text.split('\n')
    // 链接必须自己占满一行：夹在中文标点之间会被自动识别吃掉尾字符
    expect(lines[lines.length - 1]).toBe(url)
    expect(
      readSharePayloadFromUrl(new URL(lines[lines.length - 1]!).search)?.answers,
    ).toEqual(answers)
  })

  it('系统分享正文不含链接，避免与 navigator.share 的 url 字段重复出现两条链接', () => {
    const message = buildShareMessage(DEPARTMENTS.sec.name, '问题追踪者')

    expect(message).toContain('「问题追踪者」')
    expect(message).not.toMatch(/https?:\/\//)
    expect(message).not.toContain('?v=')
  })
})
