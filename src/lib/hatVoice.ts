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
 * 答题中段的帽子旁白：按题号（1 起）分段，不同进度阶段有各自的「话语池」。
 * 池内 2~3 句，按该题在阶段内的序号确定性循环取 —— 有变化、但仍零随机
 * （同一题号永远同一句）。阶段划分：early(1-3)→mid(4-6)→late(7-9)→final(10-11)。
 * 措辞不做心理诊断、不点名部门。
 */
type MoodStage = 'early' | 'mid' | 'late' | 'final'

const MOOD_POOLS: Record<MoodStage, readonly string[]> = {
  early: ['「嗯……有点意思。」', '「先别急，我还在看你。」', '「你们这一届，想法好像不少。」'],
  mid: ['「你又往这个方向走了。」', '「你开始有自己的一套了。」', '「嗯，我大概知道你在想什么。」'],
  late: ['「还有几题，我快看清楚了。」', '「你选的，越来越像是同一个人选的。」', '「行，我心里差不多有数了。」'],
  final: ['「果然。」', '「这一场，我心里已经有答案了。」'],
}

/** 供测试/调试：确认每个进度阶段都有话语池、且池内不止一句。 */
export const HAT_MOOD_POOLS: Readonly<Record<MoodStage, readonly string[]>> = MOOD_POOLS

const STAGE_START: Record<MoodStage, number> = { early: 1, mid: 4, late: 7, final: 10 }

function moodStage(questionIndex: number): MoodStage | null {
  if (questionIndex <= 0) return null
  if (questionIndex <= 3) return 'early'
  if (questionIndex <= 6) return 'mid'
  if (questionIndex <= 9) return 'late'
  return 'final'
}

/** 按题号（0 起）给出帽子的进度旁白；第一题留白，不打扰开场。 */
export function hatMoodLine(questionIndex: number): string | null {
  const stage = moodStage(questionIndex)
  if (stage === null) return null
  const pool = MOOD_POOLS[stage]
  const localIndex = questionIndex - STAGE_START[stage]
  const line = pool[localIndex % pool.length]
  return line === undefined ? pool[pool.length - 1] ?? null : line
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