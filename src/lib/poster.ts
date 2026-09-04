import { CAMPAIGN } from '../data/campaign'
import type { DeptId } from '../data/constants'
import { TRAITS, TRAIT_LIST } from '../data/traits'
import { DEPARTMENTS } from '../data/departments'
import type { QuestionBank } from '../data/questions'
import { explainVerdict } from './explain'
import { deriveBehaviorIdentity } from './identity'
import type { AnswerMap, Verdict } from './scoring'
import { buildShareUrl } from './shareCode'
import { deriveProfile } from './traits'

/** 海报上的一根倾向横条。ratio 已归一化到 0～1，绘制层不再做除法。 */
export interface PosterTraitBar {
  name: string
  ratio: number
}

/**
 * 海报数据。
 *
 * 是结果页的**简化投影**：只留能一眼看完的结论。刻意不含 evidence、答案、
 * 选项 id 与四部门分数 —— 海报会被无限转发，不能泄露题目选择
 * （docs/设计文档.md §7）。
 */
export interface PosterData {
  deptId: DeptId
  deptName: string
  latinName: string
  slogan: string
  tagline: string | null
  keywords: string[]
  identityName: string
  traitBars: PosterTraitBar[]
  dominantTraitName: string
  /** 与主导倾向同分的其他倾向名。非空时文案需承认并列（docs/题库规范.md §4）。 */
  tiedTraitNames: string[]
  /** 用户自填昵称。只在本地渲染，不进分享码；未填为 null，整行不占版面。 */
  nickname: string | null
  campaignLabel: string
  /** 二维码目标。CAMPAIGN.posterOrigin 为 null 时为 null，此时不画二维码。 */
  shareUrl: string | null
  /** 海报顶部项目二维码目标；不携带用户答题结果。 */
  projectUrl: string | null
}

/** 昵称最大长度。超出直接截断，不报错 —— 输入框已有 maxLength，这里只是兜底。 */
export const POSTER_NICKNAME_MAX = 12

function normalizeNickname(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  return trimmed.slice(0, POSTER_NICKNAME_MAX)
}

function posterShareUrl(bank: QuestionBank, drawSeed: number, answers: AnswerMap): string | null {
  const { posterOrigin, posterPathname } = CAMPAIGN
  if (posterOrigin === null) return null
  return buildShareUrl(bank, drawSeed, answers, posterOrigin, posterPathname)
}

function posterProjectUrl(): string | null {
  const { posterOrigin, posterPathname } = CAMPAIGN
  const origin = posterOrigin ?? (typeof window === 'undefined' ? null : window.location.origin)
  if (origin === null) return null
  const pathname = posterOrigin === null ? window.location.pathname : posterPathname
  return `${origin.replace(/\/$/, '')}/${pathname.replace(/^\//, '')}`
}

export function buildPosterData(
  bank: QuestionBank,
  drawSeed: number,
  verdict: Verdict,
  answers: AnswerMap,
  nickname: string | null,
): PosterData {
  const dept = DEPARTMENTS[verdict.winner]
  const explanation = explainVerdict(bank, answers, verdict)
  const identity = deriveBehaviorIdentity(bank, answers, verdict, explanation)
  const profile = deriveProfile(bank, answers)

  return {
    deptId: verdict.winner,
    deptName: dept.name,
    latinName: dept.latinName,
    slogan: dept.slogan,
    tagline: dept.tagline,
    keywords: [...dept.keywords],
    identityName: identity.name,
    traitBars: TRAIT_LIST.map((trait) => ({
      name: trait.name,
      ratio: profile.normalized[trait.id],
    })),
    dominantTraitName: TRAITS[profile.dominant].name,
    tiedTraitNames: profile.tiedWith.map((trait) => TRAITS[trait].name),
    nickname: normalizeNickname(nickname),
    campaignLabel: CAMPAIGN.label,
    shareUrl: posterShareUrl(bank, drawSeed, answers),
    projectUrl: posterProjectUrl(),
  }
}
