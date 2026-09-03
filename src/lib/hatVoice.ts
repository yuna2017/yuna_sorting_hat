import type { TraitId } from '../data/constants'
import { TRAIT_ORDER } from '../data/constants'

/**
 * 帽子人格状态机 + 「记得玩家」。
 *
 * 目的（docs/题库与体验重构方案.md §13、§14）：
 *  · 让帽子像角色一样有进度感 —— 答题越往后，它的旁白越笃定；
 *  · 让它「记得」你做过的选择 —— 在揭晓前按主导特质说一句只有你会对应上的话。
 *
 * 红线：
 *  · 只做文案，不参与判定 —— 不碰 scoring / traits 的分数，不改 verdict；
 *  · 全程零随机 —— 同一进度 / 同一主导特质，永远得到同一句；
 *  · 措辞不落心理诊断、不泄部门（不点名 p/s 分数）。
 */

/** 按题号（0 起）给出帽子的进度旁白；第一题留白，不打扰开场。 */
export function hatMoodLine(questionIndex: number): string | null {
  if (questionIndex === 0) return null
  if (questionIndex <= 3) return '「嗯……有点意思。」'
  if (questionIndex <= 6) return '「你又选了这样的路。」'
  if (questionIndex <= 9) return '「我好像开始摸到你会怎么选了。」'
  return '「果然。」'
}

/** 揭晓前，按主导特质说一句「我记住了你」的话。 */
export function hatRememberLine(dominant: TraitId): string {
  switch (dominant) {
    case 'explore':
      return '「你是那种总会先走一步的人。这一点，我记住了。」'
    case 'insight':
      return '「你总想弄清楚事情底下藏着什么。这一点，我记住了。」'
    case 'create':
      return '「你总想把脑袋里的东西做成真的。这一点，我记住了。」'
    case 'guard':
      return '「你在意的是它明天还能不能用。这一点，我记住了。」'
    case 'connect':
      return '「你总想把人和事接到一起。这一点，我记住了。」'
  }
}

/** 供测试/调试：确认五个特质都有话可说。 */
export const HAT_REMEMBER_LINES: Readonly<Record<TraitId, string>> = Object.fromEntries(
  TRAIT_ORDER.map((trait) => [trait, hatRememberLine(trait)]),
) as Readonly<Record<TraitId, string>>