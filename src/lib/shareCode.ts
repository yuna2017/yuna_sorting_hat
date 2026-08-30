import type { OptionId, QuestionBank } from '../data/questions'
import type { AnswerMap } from './scoring'

/**
 * 【分享接缝】答案 ⇄ URL 编解码。
 *
 * 编码把每题所选的规范选项 ID 按题序压成 a/b/c/d 字符串。选项洗牌只影响显示顺序，
 * 因而同一份编码在任何会话里都能还原相同答案。`v` 用来冻结题库语义：以后改题时，
 * 新代码必须显式保留旧版本解释，不能让已分享的结果静默变化。
 */

const CODE_CHARS: readonly OptionId[] = ['a', 'b', 'c', 'd']

export const SHARE_PARAM = 'a'
export const SHARE_VERSION_PARAM = 'v'
/** 无版本参数的历史链接按第一版题库解释。 */
export const LEGACY_SHARE_VERSION = 1

export interface SharePayload {
  version: number
  answers: AnswerMap
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
 * 读取版本化分享载荷。无 `v` 的旧链接视为 v1；未知版本拒绝恢复，避免拿新题库误读旧答案。
 *
 * v1 已废除（题库从 10 题换成 12 题特质制，语义无法平移），因此 v1 链接会被拒绝。
 * 调用方拿到 null 时应提示「这个结果来自旧版本的帽子」，而不是静默回封面。
 */
export function readSharePayloadFromUrl(
  bank: QuestionBank,
  search: string,
): SharePayload | null {
  const params = new URLSearchParams(search)
  const code = params.get(SHARE_PARAM)
  if (code === null) return null

  const rawVersion = params.get(SHARE_VERSION_PARAM)
  const version = rawVersion === null ? LEGACY_SHARE_VERSION : Number(rawVersion)
  if (!Number.isInteger(version) || version !== bank.version) return null

  const answers = decodeAnswers(bank, code)
  return answers === null ? null : { version, answers }
}

/** 兼容现有调用方：只返回答案。 */
export function readShareCodeFromUrl(bank: QuestionBank, search: string): AnswerMap | null {
  return readSharePayloadFromUrl(bank, search)?.answers ?? null
}

/** 生成带题库版本的可分享完整链接。 */
export function buildShareUrl(
  bank: QuestionBank,
  answers: AnswerMap,
  origin: string,
  pathname: string,
): string {
  const params = new URLSearchParams({
    [SHARE_VERSION_PARAM]: String(bank.version),
    [SHARE_PARAM]: encodeAnswers(bank, answers),
  })
  return `${origin}${pathname}?${params.toString()}`
}

/** 分享文案中的链接单独占一行，兼容 QQ/微信自动识别。 */
export function buildShareText(deptName: string, identityName: string, url: string): string {
  return `我在 YUNA 分部帽里被分到了「${deptName}」，帽子说我是「${identityName}」。\n你会被分到哪个部门？\n${url}`
}
