import type { DeptId, TraitId } from './constants'

export type OptionId = 'a' | 'b' | 'c' | 'd'

/**
 * 选项的人格特质权重。权重之和恒为 OPTION_TRAIT_BUDGET，权重为 0 的特质不写这个键。
 * 见 docs/特质体系.md §4.1。
 */
export type OptionTraits = Partial<Record<TraitId, number>>

export interface QuizOption {
  id: OptionId
  /** 选项正文。控制在一行内，为移动端与打字机效果留余量。 */
  text: string
  /** 分部帽低语：选完后帽子的即时反应。 */
  whisper: string
  /**
   * 帽子对这个选择的点评。低语的加长版，语气延续低语，显示在选项下方的说明卡里。
   *
   * 写作红线（需求文档 §11.3）：描述这个选择本身，不评价它的高下 ——
   * 读者应该觉得「我只是选了自己更喜欢的」，而不是「这条明显更强」。
   * 同样**不能暗示指向哪个部门**，否则等于把答案映射写在卡片上，测试就失去意义了。
   *
   * 缺省 = 还没写。开发期会在控制台点名，见 reportUnfilledOptionDetail()。
   */
  detail?: string
  /** 主推部门，+PRIMARY_WEIGHT */
  p: DeptId
  /** 副推部门，+SECONDARY_WEIGHT。约束：s !== p，且每题四个 s 构成无固定点置换。 */
  s: DeptId
  /**
   * 人格画像权重。与 p/s 是**两条独立链路** —— 部门推荐只看 p/s，画像只看 traits。
   * 分配时刻意避开「主导特质固定对应 p 部门」，否则等于把答案映射写回选项里。
   */
  traits: OptionTraits
}

export interface Question {
  id: string
  title: string
  /** 题面引文/场景描述。 */
  scene: string
  /**
   * 决胜题标记。并列时用「该题所选选项的主推部门」决胜。
   * 题目文档指定最后一道价值观题担任此角色。
   * 用数据标记而非硬编码题号 —— 将来在中间插题也不会让决胜局悄悄跑偏。
   */
  decider?: boolean
  options: QuizOption[]
}

/**
 * 一次测评实际用到的题目序列。
 *
 * 它**不再是**手写的数据源，而是 lib/drawQuestions.ts 从 QUESTION_POOL 抽出的结果。
 * 保留这个形状是为了让 scoring / traits / explain / identity / shareCode
 * 继续按「一次会话的 12 道题」思考 —— 它们都不需要知道背后有个更大的池子。
 */
export interface QuestionBank {
  version: number
  questions: Question[]
}

/**
 * 槽位题型。与 docs/特质体系.md §5 的题型矩阵一一对应。
 * 用 as const 联合而非 enum —— tsconfig 开了 erasableSyntaxOnly，enum 不允许。
 */
export const SLOT_KINDS = ['scenario', 'fantasy', 'resource', 'priority', 'abstract', 'decider'] as const

export type SlotKind = (typeof SLOT_KINDS)[number]

/**
 * 题库槽位：一个固定的「题位」，配若干道**可互换**的候选题。
 *
 * 每次测评从每个槽里随机抽 1 道 —— 因为同槽候选题型、对比轴、p/s 配平约束全一致，
 * 抽出来的那 12 道自动满足原先写死 12 题时的全部硬约束（见 lib/validateBank.ts）。
 * 换句话说：随机只发生在「你这次看到哪一道」，不发生在判定里。
 */
export interface QuestionSlot {
  /** 槽位号 q1～q12，同时是 §5 矩阵的行号。 */
  id: string
  kind: SlotKind
  /**
   * 主要对比轴。同槽候选必须共用同一条轴，否则抽到哪一道会改变画像的观察对象。
   * 决胜槽为 null —— 它要求五特质全覆盖，没有单一对比轴。
   */
  axis: readonly [TraitId, TraitId] | null
  /** 候选题。同槽内必须可互换；数量由 validateBank 校验为各槽一致。 */
  candidates: Question[]
}

/** 题池协议版本。分享链接用它选择兼容的解码与判定规则。 */
export interface QuestionPool {
  version: number
  slots: QuestionSlot[]
}

/**
 * 题池。12 个槽位 × N 道候选，每次测评每槽抽 1 道。
 * 文案与权重指针按题共置 —— 新增一题只改一处，避免平行数组索引错位。
 * 正确性由 lib/validateBank.ts 的不变量校验兜底，不靠文件切分。
 *
 * 每道候选题必须满足（否则结果页会失衡）：
 *   1. 恰好 4 个选项，4 个 p 覆盖全部四个部门；
 *   2. 4 个 s 也覆盖全部四个部门，且没有 p === s（即无固定点置换）；
 *   3. 每个选项的 traits 权重和恒为 3，四个选项合计覆盖 ≥ 4 个特质。
 * 每个槽还必须满足：候选数与其他槽一致、候选共用同一 kind/axis、
 * 只有 decider 槽的候选带 decider: true。
 * 由此每个部门理论满分 = **抽题数** × 3；特质上限逐特质计算，见 lib/traits.ts。
 *
 * ---
 * **当前状态：v3 槽位化落地阶段，每槽 1 道候选。**
 * 已就位 q1 / q2 / q12 三个槽，按 docs/特质体系.md §5 尚缺 q3～q11 的槽位，
 * 以及每槽的第 2 道候选（目标：12 槽 × 2 = 24 道）。
 * 槽位号刻意留空而非连续编号 —— 补槽时不用重排 id，也不会让 q12 的决胜身份漂移。
 * 候选题 id 用「槽位号-序号」（q1-1、q1-2）—— 它是答案表的键，必须全池唯一。
 * v1 的 10 道旧题、v2 的固定 3 题都已废除，原文仍在 git 历史与 docs/题目.md。
 */
export const QUESTION_POOL: QuestionPool = {
  version: 3,
  slots: [
    {
      id: 'q1',
      kind: 'scenario',
      axis: ['explore', 'insight'],
      candidates: [
        {
          id: 'q1-1',
          title: '停电的那半小时',
          scene: '晚自习到一半，整栋楼忽然黑了。手机的光亮起一片，没人知道要等多久。',
          options: [
            {
              id: 'a',
              text: '摸黑下楼，去看配电箱到底怎么了',
              whisper: '「你没问要等多久，你先去看它为什么停。」',
              detail: '停电的原因对你比停电本身更要紧。你没等答案送上门，先自己走下去看了一眼。',
              p: 'dev',
              s: 'ops',
              traits: { explore: 2, insight: 1 },
            },
            {
              id: 'b',
              text: '在楼道里喊一声，把还醒着的人聚到一层',
              whisper: '「你先找人。黑下来的时候，人比光更管用。」',
              detail: '你没先去对付黑，而是先对付了各自待着。人凑到一块儿，剩下的事就有人接得上。',
              p: 'ops',
              s: 'sec',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '先弄清这栋楼平时怎么供电，再决定动不动手',
              whisper: '「你想知道的不是什么时候来电，是它凭什么来。」',
              detail: '你不急着上手，先要弄明白这套东西平时按什么规矩转，再决定自己的手往哪儿放。',
              p: 'pr',
              s: 'dev',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'd',
              text: '把手电固定在墙上，让整条走廊都看得见',
              whisper: '「你把一个人的手电，改成了一整条走廊的。」',
              detail: '你没有只顾自己看得见。同一样东西换个放法，用得上它的人就从一个变成了一群。',
              p: 'sec',
              s: 'pr',
              traits: { create: 2, connect: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q2',
      kind: 'fantasy',
      axis: ['explore', 'guard'],
      candidates: [
        {
          id: 'q2-1',
          title: '一扇不该开的门',
          scene: '走廊尽头多出了一扇门。你很确定昨天它还不在那儿。门缝里透出一点光。',
          options: [
            {
              id: 'a',
              text: '推门进去，先看看里面到底是什么',
              whisper: '「门开着，你就进去了。理由是后来才补上的。」',
              detail: '一样东西还没弄清是什么，你先让自己站到它里面去。判断留到之后，脚步先走出去。',
              p: 'ops',
              s: 'pr',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '搬张椅子守在门口，等它自己有动静',
              whisper: '「你不去碰它。你等它先露出点什么来。」',
              detail: '你把自己放在它和别人中间，什么也不做，只是待着。等待在你这儿也是一种动作。',
              p: 'dev',
              s: 'sec',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '在门上留个记号，回头对照它变没变过',
              whisper: '「记号是给明天的你留的。你信的是对照。」',
              detail: '你不急着问它是什么，先留下一个能比对的痕迹。变化本身就是你要的那条线索。',
              p: 'pr',
              s: 'dev',
              traits: { insight: 2, create: 1 },
            },
            {
              id: 'd',
              text: '先把认识的人都叫来，一起看这扇门',
              whisper: '「你不是不敢进去，你只是不想一个人进去。」',
              detail: '你把一件只属于自己的怪事，变成了一群人一起面对的事。人多了，门就没那么怪。',
              p: 'sec',
              s: 'ops',
              traits: { connect: 2, explore: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q12',
      kind: 'decider',
      axis: null,
      candidates: [
        {
          id: 'q12-1',
          title: '你走的那天',
          scene: '很多年以后你离开这个社团。你希望留下来的人，怎么向新人提起你？',
          decider: true,
          options: [
            {
              id: 'a',
              text: '「有他在的时候，大家才算一伙人。」',
              whisper: '「你留下的不是东西，是人和人之间那根线。」',
              detail: '你希望被记住的不是某件作品，而是关系。你待过的地方，人到今天还彼此联系着。',
              p: 'dev',
              s: 'ops',
              traits: { connect: 3 },
            },
            {
              id: 'b',
              text: '「那个没人想通的问题，是他想通的。」',
              whisper: '「一个答案，署你的名字。对你来说够了。」',
              detail: '你希望留下的是一个终于被想明白的问题。一件就够，只要它真的通了，不是糊过去的。',
              p: 'pr',
              s: 'sec',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'c',
              text: '「有他在的那几年，什么都没出过事。」',
              whisper: '「最高的评价，听起来最像什么都没发生过。」',
              detail: '你希望被记住的是一段平稳的时间。它听起来像什么都没发生，而你要的就是这个。',
              p: 'sec',
              s: 'dev',
              traits: { guard: 3 },
            },
            {
              id: 'd',
              text: '「那个东西还在用，是他当年做出来的。」',
              whisper: '「指着它就能说出你的名字。你要的是这个。」',
              detail: '你希望留下一件指得出来的东西。它还被人用着，就等于你其实还没有真的离开。',
              p: 'ops',
              s: 'pr',
              traits: { create: 2, guard: 1 },
            },
          ],
        },
      ],
    },
  ],
}

/** 池中所有候选题的平铺视图。校验器与开发期自检用它，判定不用。 */
export function poolQuestions(pool: QuestionPool = QUESTION_POOL): Question[] {
  return pool.slots.flatMap((slot) => slot.candidates)
}

/**
 * 开发期提示：还没写的选项点评。
 * 与 departments.ts 的 reportUnfilledCopy() 共用同一条上报通道（见 App.tsx）。
 * detail 是可选字段 —— 类型系统不会替你记着「这里还空着」，所以「未填要吵」这件事交给运行时。
 */
export function reportUnfilledOptionDetail(): string[] {
  const missing = poolQuestions().flatMap((q) =>
    q.options.filter((o) => o.detail === undefined).map((o) => `${q.id}${o.id}`),
  )
  // 聚合成一条 —— 全空时逐条列会刷掉几十行，反而没人看
  return missing.length === 0 ? [] : [`选项点评 detail 待填 ${missing.length} 处：${missing.join('、')}`]
}
