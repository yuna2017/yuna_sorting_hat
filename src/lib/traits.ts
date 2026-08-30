import type { NormalizedTraitScores, TraitId, TraitScores } from '../data/constants'
import { TRAIT_ORDER } from '../data/constants'
import type { QuestionBank } from '../data/questions'
import { chosenOption, type AnswerMap } from './scoring'

/**
 * 人格画像链路。与 scoring.ts 的部门判定**完全解耦** ——
 * 这里只算特质，不碰 winner；那里只算部门，不碰 traits。
 * 见 docs/特质体系.md §1。
 *
 * 与部门判定同样的红线：全程零随机，同一份答案永远得到同一画像，
 * 否则分享链接无法复现。
 */

export interface TraitProfile {
  scores: TraitScores
  normalized: NormalizedTraitScores
  /** 各特质的理论上限，逐特质不同 —— 归一化的分母。 */
  ceilings: TraitScores
  /** 主导特质。归一化最高者，并列时按 TRAIT_ORDER 取首。 */
  dominant: TraitId
  /** 与主导特质归一化同分的其他特质。非空即说明发生并列，文案需要承认它。 */
  tiedWith: TraitId[]
}

/** 五特质全零的分数表。从 TRAIT_ORDER 派生，加特质时不会漏。 */
export function emptyTraitScores(): TraitScores {
  const scores = {} as TraitScores
  for (const trait of TRAIT_ORDER) scores[trait] = 0
  return scores
}

/** 累加所选选项的特质权重。未作答的题直接跳过。 */
export function tallyTraits(bank: QuestionBank, answers: AnswerMap): TraitScores {
  const scores = emptyTraitScores()
  for (const q of bank.questions) {
    const chosen = chosenOption(q, answers)
    if (chosen === undefined) continue
    for (const trait of TRAIT_ORDER) {
      scores[trait] += chosen.traits[trait] ?? 0
    }
  }
  return scores
}

/**
 * 各特质的理论上限 = 每题四个选项中该特质的最高权重之和。
 *
 * 不用固定常数：出题时权重一改，固定分母下的百分比会整体漂移，
 * 出题人还得回头调常数。随题库自动重算才不会互相拖累。
 */
export function traitCeilings(bank: QuestionBank): TraitScores {
  const ceilings = emptyTraitScores()
  for (const q of bank.questions) {
    for (const trait of TRAIT_ORDER) {
      const best = Math.max(0, ...q.options.map((o) => o.traits[trait] ?? 0))
      ceilings[trait] += best
    }
  }
  return ceilings
}

/** 逐特质除以自己的理论上限。上限为 0 时取 0（与 scoring.normalize 同口径，防除零）。 */
export function normalizeTraits(
  scores: TraitScores,
  ceilings: TraitScores,
): NormalizedTraitScores {
  const normalized = {} as NormalizedTraitScores
  for (const trait of TRAIT_ORDER) {
    const ceiling = ceilings[trait]
    normalized[trait] = ceiling === 0 ? 0 : scores[trait] / ceiling
  }
  return normalized
}

/** 从答案推导完整画像。纯函数，零随机。 */
export function deriveProfile(bank: QuestionBank, answers: AnswerMap): TraitProfile {
  const scores = tallyTraits(bank, answers)
  const ceilings = traitCeilings(bank)
  const normalized = normalizeTraits(scores, ceilings)

  const top = Math.max(...TRAIT_ORDER.map((trait) => normalized[trait]))
  const tied = TRAIT_ORDER.filter((trait) => normalized[trait] === top)

  const dominant = tied[0]
  if (dominant === undefined) {
    throw new Error('特质候选集合为空：最高值必然被至少一个特质取到，不应发生')
  }

  return {
    scores,
    normalized,
    ceilings,
    dominant,
    tiedWith: tied.filter((trait) => trait !== dominant),
  }
}

/** 按归一化降序排列特质，并列时按 TRAIT_ORDER 稳定取先。供结果页列举用。 */
export function rankTraits(profile: TraitProfile): TraitId[] {
  return [...TRAIT_ORDER].sort((a, b) => {
    const diff = profile.normalized[b] - profile.normalized[a]
    if (diff !== 0) return diff
    return TRAIT_ORDER.indexOf(a) - TRAIT_ORDER.indexOf(b)
  })
}
