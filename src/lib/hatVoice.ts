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

/**
 * 答题中段的帽子旁白：按题号（1 起）逐题一句，共 11 句，第 0 题（第一屏）留白。
 * 每句都是短促的「帽子角色话」：前期打量、中期试探、后期笃定，最后一句收在揭晓前。
 * 零随机 —— 同一题号永远同一句；措辞不做心理诊断、不点名部门。
 */
const MOOD_LINES = [
  '「嗯……有点意思。」',
  '「先别急，我还在看你。」',
  '「你们这一届，想法好像不少。」',
  '「你又往这个方向走了。」',
  '「你开始有自己的一套了。」',
  '「嗯，我大概知道你在想什么。」',
  '「还有几题，我快看清楚了。」',
  '「你选的，越来越像是同一个人选的。」',
  '「行，我心里差不多有数了。」',
  '「果然。」',
  '「这一场，我心里已经有答案了。」',
] as const

/** 按题号（0 起）给出帽子的进度旁白；第一题留白，不打扰开场。 */
export function hatMoodLine(questionIndex: number): string | null {
  if (questionIndex <= 0) return null
  const line = MOOD_LINES[questionIndex - 1]
  return line === undefined ? MOOD_LINES[MOOD_LINES.length - 1] ?? null : line
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