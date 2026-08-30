import { QUESTION_POOL, type OptionId, type QuestionBank, type QuestionPool } from '../data/questions'
import { drawBank } from './drawQuestions'
import type { AnswerMap } from './scoring'

/**
 * 【分享接缝】答案 ⇄ URL 编解码。
 *
 * 编码把每题所选的规范选项 ID 按题序压成 a/b/c/d 字符串。选项洗牌只影响显示顺序，
 * 因而同一份编码在任何会话里都能还原相同答案。
 *
 * `v` 冻结题库语义：以后改题时，新代码必须显式保留旧版本解释，不能让已分享的结果静默变化。
 *
 * `s` 是**抽题种子**，v3 新增。题库改成「12 槽 × N 候选」的池子后，光有答案码已经不够 ——
 * 同一串 `bbca` 在不同抽题结果下对应的是不同题目，判定也就不同。种子进 URL，
 * 打开链接的人才能先重建出**同一组题**，再按位解码答案。见 lib/drawQuestions.ts。
 */

const CODE_CHARS: readonly OptionId[] = ['a', 'b', 'c', 'd']

export const SHARE_PARAM = 'a'
export const SHARE_VERSION_PARAM = 'v'
export const SHARE_SEED_PARAM = 's'

export interface SharePayload {
  version: number
  /** 抽题种子。用它调 drawBank 能重建出分享者当时看到的那组题。 */
  seed: number
  bank: QuestionBank
  answers: AnswerMap
}

/** 种子用 36 进制写进 URL —— 32 位整数最多 7 个字符，比十进制短。 */
function encodeSeed(seed: number): string {
  return (seed >>> 0).toString(36)
}

/** 解析 36 进制种子。非法输入返回 null，交由调用方拒绝整条链接。 */
function decodeSeed(raw: string): number | null {
  if (!/^[0-9a-z]{1,7}$/.test(raw)) return null
  const value = Number.parseInt(raw, 36)
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) return null
  return value >>> 0
}

/** 答案 → 紧凑字符串。未作答的题写成 '-'。 */
export function encodeAnswers(bank: QuestionBank, answers: AnswerMap): string {
  return bank.questions
    .map((q) => {
      const id = answers[q.id]
      return id !== undefined && CODE_CHARS.includes(id) ? id : '-'
    })
    .join('')
}

/** 紧凑字符串 → 答案。长度不符或含非法字符时返回 null。 */
export function decodeAnswers(bank: QuestionBank, code: string): AnswerMap | null {
  const trimmed = code.trim().toLowerCase()
  if (trimmed.length !== bank.questions.length) return null

  const answers: AnswerMap = {}
  for (let i = 0; i < bank.questions.length; i++) {
    const char = trimmed[i]
    const question = bank.questions[i]
    if (question === undefined) return null
    if (char === '-') continue
    const optionId = CODE_CHARS.find((c) => c === char)
    if (optionId === undefined || !question.options.some((o) => o.id === optionId)) return null
    answers[question.id] = optionId
  }
  return answers
}

/**
 * 读取版本化分享载荷，并按种子重建分享者当时的题目序列。
 *
 * 缺 `v`、缺 `s` 或版本不符都直接拒绝 —— 拿新题库误读旧答案比什么都不显示更糟。
 * v1（10 题固定题库）与 v2（3 题样题）均已废除，语义无法平移。
 * 调用方拿到 null 时应提示「这个结果来自旧版本的帽子」，而不是静默回封面。
 */
export function readSharePayloadFromUrl(
  search: string,
  pool: QuestionPool = QUESTION_POOL,
): SharePayload | null {
  const params = new URLSearchParams(search)
  const code = params.get(SHARE_PARAM)
  if (code === null) return null

  const rawVersion = params.get(SHARE_VERSION_PARAM)
  // v3 起版本参数是必需的：没有它就无从判断这串码该怎么读
  if (rawVersion === null) return null
  const version = Number(rawVersion)
  if (!Number.isInteger(version) || version !== pool.version) return null

  const rawSeed = params.get(SHARE_SEED_PARAM)
  if (rawSeed === null) return null
  const seed = decodeSeed(rawSeed)
  if (seed === null) return null

  const bank = drawBank(seed, pool)
  const answers = decodeAnswers(bank, code)
  return answers === null ? null : { version, seed, bank, answers }
}

/** 生成带题库版本与抽题种子的可分享完整链接。 */
export function buildShareUrl(
  bank: QuestionBank,
  seed: number,
  answers: AnswerMap,
  origin: string,
  pathname: string,
): string {
  const params = new URLSearchParams({
    [SHARE_VERSION_PARAM]: String(bank.version),
    [SHARE_SEED_PARAM]: encodeSeed(seed),
    [SHARE_PARAM]: encodeAnswers(bank, answers),
  })
  return `${origin}${pathname}?${params.toString()}`
}

/** 分享文案中的链接单独占一行，兼容 QQ/微信自动识别。 */
export function buildShareText(deptName: string, identityName: string, url: string): string {
  return `我在 YUNA 分部帽里被分到了「${deptName}」，帽子说我是「${identityName}」。\n你会被分到哪个部门？\n${url}`
}
