import type { OptionId, QuestionBank } from '../data/questions'
import type { AnswerMap } from './scoring'

/**
 * 【分享接缝】答案 ⇄ URL 编解码。
 *
 * 本轮 MVP 不做分享卡 UI 与二维码，但状态形状现在就定好，
 * 之后加分享功能不用回头改 App 的状态设计。
 *
 * 编码方式：把每题所选的选项按题序压成一个 a/b/c/d 字符串，例如 "acbdacbdac"。
 * 为什么可行 —— 选项洗牌只影响**显示顺序**，答案一律记规范 option id，
 * 所以同一份编码在任何会话里都还原出同一个结果与同一张雷达图。
 */

const CODE_CHARS: readonly OptionId[] = ['a', 'b', 'c', 'd']

/** URL 查询参数名。 */
export const SHARE_PARAM = 'a'

/** 答案 → 紧凑字符串。未作答的题写成 '-'。 */
export function encodeAnswers(bank: QuestionBank, answers: AnswerMap): string {
  return bank.questions
    .map((q) => {
      const id = answers[q.id]
      return id !== undefined && CODE_CHARS.includes(id) ? id : '-'
    })
    .join('')
}

/**
 * 紧凑字符串 → 答案。长度不符或含非法字符时返回 null，
 * 让调用方走「重新答一遍」而不是渲染一个半残的结果。
 */
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
    if (optionId === undefined) return null
    // 该题确实存在这个选项才算有效
    if (!question.options.some((o) => o.id === optionId)) return null
    answers[question.id] = optionId
  }
  return answers
}

/** 从当前 URL 读分享码。没有或非法时返回 null。 */
export function readShareCodeFromUrl(bank: QuestionBank, search: string): AnswerMap | null {
  const code = new URLSearchParams(search).get(SHARE_PARAM)
  if (code === null) return null
  return decodeAnswers(bank, code)
}

/** 生成可分享的完整链接。分享 UI 落地后直接用这个。 */
export function buildShareUrl(
  bank: QuestionBank,
  answers: AnswerMap,
  origin: string,
  pathname: string,
): string {
  const params = new URLSearchParams({ [SHARE_PARAM]: encodeAnswers(bank, answers) })
  return `${origin}${pathname}?${params.toString()}`
}
