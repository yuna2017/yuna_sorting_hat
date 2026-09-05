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
 * **当前状态：v3 槽位化已落地，每槽 2 道候选，24 道题池已满。**
 * 按 docs/特质体系.md §5 的槽位矩阵，q1～q12 十二个槽各有 2 道候选，
 * 每场答题从每槽各抽 1 道，共 12 题（见 lib/drawQuestions.ts）。
 * 槽位号与矩阵一一对应 —— 补候选时不用重排 id，也不会让 q12 的决胜身份漂移。
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
              text: '在楼道里喊一声，把还留在楼里的人都叫到一楼来',
              whisper: '「你先找人。黑下来的时候，人比光更管用。」',
              detail: '你没先去找电，而是先把各自干等的人都凑到了一起。人一到齐，剩下的事就有人能接上。',
              p: 'ops',
              s: 'sec',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '先弄清这栋楼平时是怎么供电的，再决定要不要插手',
              whisper: '「你不急着动手，先弄明白这套供电平时是怎么跑的。」',
              detail: '你不急着上手，先要弄明白这套东西平时按什么规矩转，再决定自己的手往哪儿放。',
              p: 'pr',
              s: 'dev',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'd',
              text: '把手电筒朝天花板照，让整条走廊都亮起来',
              whisper: '「你把一个人的手电，改成了一整条走廊的。」',
              detail: '你没有只顾自己看得见。同一样东西换个放法，用得上它的人就从一个变成了一群。',
              p: 'sec',
              s: 'pr',
              traits: { create: 2, connect: 1 },
            },
          ],
        },
        {
          id: 'q1-2',
          title: '抽屉里的钥匙',
          scene: '打扫活动室时，你在抽屉最里面翻出一串钥匙。上面没有标签，不知道开哪扇门。',
          options: [
            {
              id: 'a',
              text: '拿它去把楼里的每扇门都试一遍',
              whisper: '「你不猜它开哪扇，你一扇一扇去试。」',
              detail: '你不打算靠猜。一扇一扇试过去确实是笨办法，可等你试完，那答案就再没有含糊的地方了。',
              p: 'dev',
              s: 'sec',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '先弄清这串钥匙是谁留在这儿的',
              whisper: '「钥匙开哪儿你先放下，谁放的你要弄清。」',
              detail: '你先追的是它的来历。一样东西是怎么到这儿来的，往往比它眼下能干什么更说明问题。',
              p: 'sec',
              s: 'ops',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'c',
              text: '贴张纸条注明来历不明，先放回原处',
              whisper: '「你不动它，只是让下一个人别再猜一遍。」',
              detail: '你没有解决它，但你让它不再是个谜团。下一个翻到抽屉的人，起点会比你高一点。',
              p: 'ops',
              s: 'pr',
              traits: { guard: 2, create: 1 },
            },
            {
              id: 'd',
              text: '拿着它问一圈，看有没有人认得出来',
              whisper: '「你先问人。这串钥匙总有人见过它。」',
              detail: '你觉得答案在见过它的人身上，不在钥匙本身。只要问对一个人，剩下的事就简单了。',
              p: 'pr',
              s: 'dev',
              traits: { connect: 2, insight: 1 },
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
          scene: '晚自习结束后你回宿舍，楼道安静得过分，走廊尽头多出了一扇门。你很确定昨天它还不在那儿，门缝里透出一点光。',
          options: [
            {
              id: 'a',
              text: '推门进去，先看看里面到底是什么',
              whisper: '「门在那儿，你就推进去了。理由是后来才补上的。」',
              detail: '还没弄清那是什么，你人就已经先进去了。判断可以后面再补，脚先迈出去要紧。',
              p: 'ops',
              s: 'pr',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '搬把椅子守在门口，看它自己会不会有动静',
              whisper: '「你不去碰它。你等它先露出点什么来。」',
              detail: '你把自己放在它和别人中间，什么也不做，只是待着。在你这儿，等着本身也算在做事。',
              p: 'dev',
              s: 'sec',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '在门上留个记号，回头看看它有没有变',
              whisper: '「记号是给明天的你留的。你信的是对照。」',
              detail: '你不急着问它是什么，先留下一个能比对的痕迹。变化本身就是你要的那条线索。',
              p: 'pr',
              s: 'dev',
              traits: { insight: 2, create: 1 },
            },
            {
              id: 'd',
              text: '叫上几个室友，一起过来看这扇门',
              whisper: '「你不是不敢进去，你只是不想一个人进去。」',
              detail: '你把一件只属于自己的怪事，变成了一群人一起面对的事。人多了，门就没那么怪。',
              p: 'sec',
              s: 'ops',
              traits: { connect: 2, explore: 1 },
            },
          ],
        },
        {
          id: 'q2-2',
          title: '多出来的那层',
          scene: '宿舍楼的电梯今天多出一个按钮，上面标着一个这栋楼根本不存在的楼层。它一直亮着，可没人提到它。',
          options: [
            {
              id: 'a',
              text: '直接按下去，看它会带你去哪儿',
              whisper: '「按钮亮着，你的手就已经伸过去了。」',
              detail: '你没有先问它安不安全。它亮着就等于在等人按下去，而你一点也不介意当那个人。',
              p: 'ops',
              s: 'dev',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '记下时间，看它明天还在不在',
              whisper: '「今天先不按，等明天看它还在不在。」',
              detail: '只出现过一次的东西，你不太当真。要等到明天它还在，这件事才算真的发生过。',
              p: 'pr',
              s: 'sec',
              traits: { insight: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '先拦着别人别按，自己守在电梯口',
              whisper: '「你不进去，也不打算让别人先进去。」',
              detail: '你把自己挡在了它和别人中间。在还不知道那是什么之前，你觉得谁也不该往里走。',
              p: 'sec',
              s: 'pr',
              traits: { guard: 3 },
            },
            {
              id: 'd',
              text: '叫上同层的人，一起坐一趟看看',
              whisper: '「进是要进的，只是不该一个人进。」',
              detail: '你要去，只是不打算一个人去。身边多一个人，真出什么事也还有另一双眼睛。',
              p: 'dev',
              s: 'ops',
              traits: { connect: 2, explore: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q3',
      kind: 'scenario',
      axis: ['create', 'connect'],
      candidates: [
        {
          id: 'q3-1',
          title: '没说出口的那个',
          scene: '你想到一个点子，自己觉得挺好。周围人还在聊别的，话头一直没轮到你。',
          options: [
            {
              id: 'a',
              text: '先自己动手，做一个粗糙的版本',
              whisper: '「你不先说，你先做。做出来的东西自己会说话。」',
              detail: '你没有等一个说话的机会，先把想法变成了一件能看能摸的东西。它替你把话讲完了。',
              p: 'dev',
              s: 'pr',
              traits: { create: 2, explore: 1 },
            },
            {
              id: 'b',
              text: '找一个人先讲一遍，看他听不听得懂',
              whisper: '「你不需要别人同意，只要有人真的听懂了就行。」',
              detail: '你先找一个具体的人，把想法原原本本讲一遍。能不能讲明白，比你自己觉得它有多好更要紧。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '写下来放着，等它再成熟一点',
              whisper: '「你信时间。放一放还站得住的，才算数。」',
              detail: '你不急着让它见人，想先看看它能不能立得住。立得住的，才值得你花时间往下做。',
              p: 'sec',
              s: 'dev',
              traits: { insight: 2, guard: 1 },
            },
            {
              id: 'd',
              text: '先想清楚它会不会给别人添麻烦',
              whisper: '「你先想的不是它多好，是它会牵扯到谁。」',
              detail: '它有什么好处你也会想，只是排在后面。它会不会麻烦到别人，这一步你总是先过一遍。',
              p: 'ops',
              s: 'sec',
              traits: { guard: 2, connect: 1 },
            },
          ],
        },
        {
          id: 'q3-2',
          title: '没人负责的那块',
          scene: '一件事所有人都以为有别人在做，结果谁都没有动手。今天它终于被发现了。',
          options: [
            {
              id: 'a',
              text: '自己先补上，等补完再说别的',
              whisper: '「你先把洞堵上。责任的事放到后面。」',
              detail: '你不先去追这是谁的事。洞在那儿就先把它补上，谁该补这件事，等补完了再慢慢算。',
              p: 'dev',
              s: 'sec',
              traits: { create: 2, guard: 1 },
            },
            {
              id: 'b',
              text: '把相关的人都叫齐，当面把责任分清楚',
              whisper: '「这次补上不算完，下次不能再空着。」',
              detail: '你要的不只是这一次补好。人到齐把话说开，是为了让下一回不再有人以为有别人在做。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '先弄明白它到底是怎么被漏掉的',
              whisper: '「漏了一次的地方，一定还会再漏一次。」',
              detail: '你真正在意的是它为什么会漏。同一个缝不堵住，换个人换件事，它还是照样会掉下去。',
              p: 'sec',
              s: 'dev',
              traits: { insight: 2, guard: 1 },
            },
            {
              id: 'd',
              text: '干脆把做法改了，让它以后不会再漏',
              whisper: '「你补的不是这一次，是往后每一次。」',
              detail: '这个洞补好一次，下回照样还得再补一次。做法改掉之后，它就不用谁特意记着了。',
              p: 'ops',
              s: 'pr',
              traits: { create: 2, explore: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q4',
      kind: 'resource',
      axis: ['create', 'explore'],
      candidates: [
        {
          id: 'q4-1',
          title: '空出来的一天',
          scene: '明天一整天空着，没有任何安排。没有人会来找你，也没有一件非做不可的事。',
          options: [
            {
              id: 'a',
              text: '去一个没去过的地方，走到天黑',
              whisper: '「一整天，你拿去走了一段路。走到哪儿算哪儿。」',
              detail: '那儿有什么，你没打听。先到了再说——听来的和自己撞见的，从来不是一回事。',
              p: 'pr',
              s: 'sec',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '把一直想做的东西先开个头',
              whisper: '「你要的不是休息，是终于能动手。」',
              detail: '空出来的时间你没有花在歇着上，而是花在一直想做却始终没开始的那件事上。',
              p: 'ops',
              s: 'dev',
              traits: { create: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '找几个人一起，把这天过得满满当当',
              whisper: '「一个人的一天太安静，你叫上了别人。」',
              detail: '你把一整天交给了别人。空着的时间在你这儿从来不是空的，而是可以和人一起用掉的。',
              p: 'dev',
              s: 'ops',
              traits: { connect: 2, explore: 1 },
            },
            {
              id: 'd',
              text: '哪儿都不去，把积着的事一件件理清楚',
              whisper: '「哪儿都不去，是你为下一整周做的事。」',
              detail: '这一天空出来，你不想就这么耗掉，把积着的事一件件理清楚。收拾完了，心里才算踏实。',
              p: 'sec',
              s: 'pr',
              traits: { guard: 2, insight: 1 },
            },
          ],
        },
        {
          id: 'q4-2',
          title: '只够用一次的钱',
          scene: '社团账上剩下一笔钱，只够花一次。四个用处摆在面前，每个都有道理。',
          options: [
            {
              id: 'a',
              text: '买一样社团里还没人试过的新东西',
              whisper: '「你不买稳当的，你买那个还没人试过的。」',
              detail: '你把钱花在了一件没人用过的东西上。它能不能成你不知道，但你想把它试出来。',
              p: 'sec',
              s: 'pr',
              traits: { explore: 2, create: 1 },
            },
            {
              id: 'b',
              text: '拿它把社团一直缺的那个环节补齐',
              whisper: '「你把钱放在了一直在漏的那一处。」',
              detail: '补完了，外面也看不出多出什么新东西。可那条一直跛着的腿，从今往后不跛了。',
              p: 'ops',
              s: 'dev',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '花在让更多人看到社团做的东西上',
              whisper: '「东西再好，没人知道也等于没有。」',
              detail: '这笔钱你没拿去把东西做得更好，而是拿去让它被人看见——这一步以前总是被跳过。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, create: 1 },
            },
            {
              id: 'd',
              text: '先不花，搞清楚哪一样真的缺',
              whisper: '「只能花一次，那你就一定不能花错。」',
              detail: '先搞清楚四样里哪一样是真缺的，手才伸出去。在那之前，你宁可让这笔钱一直压着。',
              p: 'dev',
              s: 'sec',
              traits: { insight: 2, guard: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q5',
      kind: 'scenario',
      axis: ['insight', 'guard'],
      candidates: [
        {
          id: 'q5-1',
          title: '有一处不对',
          scene: '你在一份大家都看过的东西里，发现有个地方明显不对。别人都没有提。',
          options: [
            {
              id: 'a',
              text: '马上把它指出来，让大家都知道',
              whisper: '「你没有先问该不该说出来，你先说了。」',
              detail: '该不该说、怎么说，你都是后来才想的。当时你只知道，不对的事总得有人说出来，那就由你来说。',
              p: 'sec',
              s: 'ops',
              traits: { guard: 2, connect: 1 },
            },
            {
              id: 'b',
              text: '先自己查一查，弄明白它为什么会错',
              whisper: '「错在哪儿你不急，它为什么会错你要弄清。」',
              detail: '你更在意它为什么会变成这样。改掉它容易，弄明白它怎么来的才算真的处理了。',
              p: 'ops',
              s: 'pr',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'c',
              text: '悄悄把它改好，不让人察觉',
              whisper: '「你把它补好，没打算让谁知道那是你。」',
              detail: '事情对了就够了。署谁的名不重要。就算从头到尾没人提起过，你也不会觉得亏。',
              p: 'dev',
              s: 'sec',
              traits: { create: 2, guard: 1 },
            },
            {
              id: 'd',
              text: '找一个人核对，确认不是自己看错',
              whisper: '「你先怀疑自己的眼睛，再怀疑那份东西。」',
              detail: '你先把自己算进了可能出错的那一边。找人核对不是不敢说，是想把话说得准。',
              p: 'pr',
              s: 'dev',
              traits: { connect: 2, insight: 1 },
            },
          ],
        },
        {
          id: 'q5-2',
          title: '对不上的那两份',
          scene: '两张记录成员信息的表格各记了一部分，凑到一起却对不上号，两边负责的人都说自己那份从头到尾没改过。',
          options: [
            {
              id: 'a',
              text: '一行一行比对，找出从哪一行开始对不上',
              whisper: '「你要的不是谁对，是它从哪儿开始对不上的。」',
              detail: '你不想先判谁对。两份东西从哪一行开始分开，那一行才是真正值得追的地方。',
              p: 'ops',
              s: 'pr',
              traits: { insight: 3 },
            },
            {
              id: 'b',
              text: '把两边的人都叫到一起，当面对一遍',
              whisper: '「纸上对不出来，你把人叫到了一起。」',
              detail: '你觉得光靠纸面对永远对不完。两边人坐到一块儿，差异往往一句话就能说清楚。',
              p: 'pr',
              s: 'dev',
              traits: { connect: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '两份都先封起来，不让人再动',
              whisper: '「弄清楚之前，你不让任何人再碰。」',
              detail: '现在每多添一笔改动，往后就多一层说不清。这笔账，你不打算替任何人背下来。',
              p: 'sec',
              s: 'ops',
              traits: { guard: 3 },
            },
            {
              id: 'd',
              text: '另起一份，把两边内容都并进去',
              whisper: '「你不在两份里选，你去写第三份。」',
              detail: '你不在现有的两份里挑。既然两份都不够用，那就重新开一份，把两边都装进去。',
              p: 'dev',
              s: 'sec',
              traits: { create: 2, guard: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q6',
      kind: 'priority',
      axis: ['guard', 'connect'],
      candidates: [
        {
          id: 'q6-1',
          title: '四件事一起来了',
          scene: '同一个下午，四件事同时压过来。每一件都有人在那头等你的回话。',
          options: [
            {
              id: 'a',
              text: '先处理最容易出事的那一件',
              whisper: '「你先按住会烧起来的那一件，别的等等。」',
              detail: '你先看哪件放着会出事，就先动它。别的事再要紧，也只能排在后面，急也急不来。',
              p: 'ops',
              s: 'dev',
              traits: { guard: 3 },
            },
            {
              id: 'b',
              text: '先回复那个已经等得最久的人',
              whisper: '「排在最前面的不是最急的事，是最久的人。」',
              detail: '你按人排序。等得最久的那个人先得到回话，事情本身的大小可以往后放一放。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '先看看四件事里有没有能一并做掉的一步',
              whisper: '「四件事你看成了一件。剩下的就顺了。」',
              detail: '你不急着开始，先去找四件事共用的那一步。一步做对，四件事就一起往前走了。',
              p: 'sec',
              s: 'pr',
              traits: { insight: 2, create: 1 },
            },
            {
              id: 'd',
              text: '先挑一件最想做的，做完再说',
              whisper: '「你先挑了想做的那件。人转起来，别的才跟着动。」',
              detail: '人要是不先转起来，后面那几件也推不动。这口劲儿，得先从想做的那件里借出来。',
              p: 'dev',
              s: 'sec',
              traits: { create: 2, explore: 1 },
            },
          ],
        },
        {
          id: 'q6-2',
          title: '只剩一晚了',
          scene: '明天一早就要交的东西还差一大截。今晚的时间只够把其中一部分做完。',
          options: [
            {
              id: 'a',
              text: '先把一定会被检查的那部分做扎实',
              whisper: '「你先保住一定会被看到的那一层。」',
              detail: '剩下的不是不重要。只是今晚实在排不进去了。取舍这件事，你做得比想象中要快。',
              p: 'sec',
              s: 'ops',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'b',
              text: '先把别人等着接手的那一段做完交出去',
              whisper: '「卡在你这儿的那段，后面还有人在等。」',
              detail: '自己那一部分往后放一放。你手上这段一天不交出去，后面的人就一天动不了。',
              p: 'ops',
              s: 'pr',
              traits: { connect: 3 },
            },
            {
              id: 'c',
              text: '先别急着动手，找个能省大把时间的做法',
              whisper: '「你不拼速度。你先去换一个做法。」',
              detail: '你没有马上埋头干。花上半小时去换一个做法，往往比埋头干三小时省得更多。',
              p: 'dev',
              s: 'sec',
              traits: { create: 2, insight: 1 },
            },
            {
              id: 'd',
              text: '先在最难的那一块上开个口子',
              whisper: '「你先啃最硬的。它一开口，别的就好办了。」',
              detail: '它换到哪一天都不会变容易，那就没道理留到明天。今晚撕开一道口，明天才好往下做。',
              p: 'pr',
              s: 'dev',
              traits: { explore: 2, create: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q7',
      kind: 'fantasy',
      axis: ['insight', 'connect'],
      candidates: [
        {
          id: 'q7-1',
          title: '没有署名的信',
          scene: '你回教室拿落下的东西，桌上多了一张纸条，写着一句只有你看得懂的话，末尾没有留名字。',
          options: [
            {
              id: 'a',
              text: '把这句话记下来，顺着它的意思去找找',
              whisper: '「你先追这句话指向哪儿，不追是谁写的。」',
              detail: '你抓住的是那句话本身。它指向哪儿比谁写的更值得走一趟，人可以后面再说。',
              p: 'dev',
              s: 'pr',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'b',
              text: '先想想，能写出这句话的人会是谁',
              whisper: '「这话什么意思先放一放，你先想是谁写的。」',
              detail: '你先想的是范围。知道这件事的人本来就不多，从这儿往回推比从话本身推更快。',
              p: 'sec',
              s: 'ops',
              traits: { connect: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '原样放回去，等对方把下一句递过来',
              whisper: '「你什么也没动。你觉得下一步该他走。」',
              detail: '你把它放回原处，一个字也没有动。该接的那一步不在你这边，你就这么等着。',
              p: 'ops',
              s: 'sec',
              traits: { guard: 3 },
            },
            {
              id: 'd',
              text: '也写张纸条放回桌上，同样不署名',
              whisper: '「你没找他，你回了他。用的是同样的方式。」',
              detail: '你没有拆穿他。他递过来的是一个玩法，你接住了，还照着他定的规矩回了一手。',
              p: 'pr',
              s: 'dev',
              traits: { create: 2, connect: 1 },
            },
          ],
        },
        {
          id: 'q7-2',
          title: '同一天又来了一次',
          scene: '又是周二。你第三次被同一个闹钟叫醒，才发现今天还是昨天的重复。室友都不记得，只有你知道。',
          options: [
            {
              id: 'a',
              text: '把昨天没敢动的那件事做了',
              whisper: '「昨天你没敢动的那件事，今天你先做了。」',
              detail: '既然这一天会重来，它就成了唯一一次不必负责的机会。你没有把它白白浪费掉。',
              p: 'dev',
              s: 'pr',
              traits: { explore: 2, create: 1 },
            },
            {
              id: 'b',
              text: '先问问室友，他们记得的昨天是什么样',
              whisper: '「你先去问人。这一天你不打算一个人过。」',
              detail: '你先去问身边的人。一件只有自己知道的事太容易走偏，多一个人的说法才有对照的余地。',
              p: 'sec',
              s: 'ops',
              traits: { connect: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '记下今天跟昨天不一样的地方',
              whisper: '「你信的是差别。不一样的地方才是线索。」',
              detail: '你要的是那些不一样的地方。同一天里出现的差别，比这一天为什么重复更值得先记下来。',
              p: 'ops',
              s: 'sec',
              traits: { insight: 2, guard: 1 },
            },
            {
              id: 'd',
              text: '什么都不改，让这一天照原样过完',
              whisper: '「你什么也不改。你先看它是不是真的重复。」',
              detail: '让这一天照原样过完，什么都不动——在真假还没弄清之前，你不打算先出手。',
              p: 'pr',
              s: 'dev',
              traits: { guard: 2, connect: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q8',
      kind: 'scenario',
      axis: ['connect', 'create'],
      candidates: [
        {
          id: 'q8-1',
          title: '谁都不接的那句',
          scene: '一屋子人讨论了很久，谁也不肯先让步。空气停在那儿，没人说话。',
          options: [
            {
              id: 'a',
              text: '提一个谁都没想过的第三种办法',
              whisper: '「两条路都走不通，你就去修第三条。」',
              detail: '你不在两边里挑。既然那两条路现在都堵着，你就去找还没有人走过的那一条。',
              p: 'sec',
              s: 'dev',
              traits: { create: 2, insight: 1 },
            },
            {
              id: 'b',
              text: '让每个人把自己的顾虑说完',
              whisper: '「卡住的不是事，是没说出口的那部分。」',
              detail: '你先让每个人把话说完。憋着的那部分不出来，谈的就永远不是真卡住的地方。',
              p: 'dev',
              s: 'ops',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '先把已经谈定的部分记下来',
              whisper: '「你先把谈成的钉住，别让它一起塌掉。」',
              detail: '你先把已经谈定的部分固定下来。往前走不动的时候，别把身后那些也一并丢了。',
              p: 'ops',
              s: 'pr',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'd',
              text: '直接问出那句没人敢问的话',
              whisper: '「那句话谁都想到了。你把它说了出来。」',
              detail: '那句话一屋子人其实都想到了。只是谁也不肯先开口。空气是从你开口那一下才动的。',
              p: 'pr',
              s: 'sec',
              traits: { explore: 2, connect: 1 },
            },
          ],
        },
        {
          id: 'q8-2',
          title: '接不上的那个新人',
          scene: '新来的那个人坐在角落，一整个下午没说过话。其他人聊得热闹，也没人走过去。',
          options: [
            {
              id: 'a',
              text: '搬把椅子坐过去，随便聊点什么',
              whisper: '「你没等他开口。你先把椅子搬了过去。」',
              detail: '聊些什么其实并不重要。重要的是从这一刻起，那个角落不再只坐着他一个人了。',
              p: 'pr',
              s: 'dev',
              traits: { connect: 2, explore: 1 },
            },
            {
              id: 'b',
              text: '先找一件具体的事交给他去做',
              whisper: '「手上有件事，比嘴上有句话更容易留下来。」',
              detail: '你给他找了一件具体的事。手上有事的人不会一直是外人，一起做过一件事，位置自然就有了。',
              p: 'dev',
              s: 'ops',
              traits: { create: 2, connect: 1 },
            },
            {
              id: 'c',
              text: '先等一等，看他自己会不会开口',
              whisper: '「你先给他留出时间。不逼他先说话。」',
              detail: '你先给他留出了时间。有人需要自己找到开口的那一刻，这时候推一把反而会把人推远。',
              p: 'sec',
              s: 'pr',
              traits: { guard: 2, insight: 1 },
            },
            {
              id: 'd',
              text: '去问问带他来的人，他是什么样的人',
              whisper: '「你先弄清他是谁，再决定怎么走过去。」',
              detail: '走过去该说什么，取决于对面坐的是谁，不取决于你想说什么。所以你先去问了带他来的人。',
              p: 'ops',
              s: 'sec',
              traits: { insight: 2, connect: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q9',
      kind: 'resource',
      axis: ['guard', 'explore'],
      candidates: [
        {
          id: 'q9-1',
          title: '只能带走一件',
          scene: '你要离开待了很久的那个地方，只能带走一件东西。剩下的都得留在原地。',
          options: [
            {
              id: 'a',
              text: '带走那件自己亲手做出来的东西',
              whisper: '「你带走的，是你在这儿动过手的证明。」',
              detail: '你带走的是自己做出来的那一件。它能证明你待在这儿的那段时间，真的动过手。',
              p: 'pr',
              s: 'ops',
              traits: { create: 2, guard: 1 },
            },
            {
              id: 'b',
              text: '带走一张所有人都在里面的合照',
              whisper: '「东西都可以不要，人你得记得住。」',
              detail: '你愿意留下所有的东西，只带走人。这个地方对你来说，从来就等于这些人本身。',
              p: 'ops',
              s: 'sec',
              traits: { connect: 3 },
            },
            {
              id: 'c',
              text: '带走那本自己写满了字的本子',
              whisper: '「里面全是你自己的字。这样就够了。」',
              detail: '你带走的是自己亲手写下的那些字。别的都是这儿的，只有这一本是你自己的。',
              p: 'dev',
              s: 'pr',
              traits: { insight: 2, create: 1 },
            },
            {
              id: 'd',
              text: '什么念想都不带，只带一张地图上路',
              whisper: '「你不带过去。你带的是能去下一个地方的东西。」',
              detail: '过去的东西你一件也没拿，手里只留了那张地图——唯一能带你去下一个地方的东西。',
              p: 'sec',
              s: 'dev',
              traits: { explore: 2, guard: 1 },
            },
          ],
        },
        {
          id: 'q9-2',
          title: '只剩一个名额',
          scene: '社团里一个外出交流的名额只剩最后一个，报名的人比名额多。名单要在今天定下来。',
          options: [
            {
              id: 'a',
              text: '给最想去的那个人，不管资历',
              whisper: '「你给了最想去的那个。别的都往后放。」',
              detail: '你把名额给了最想去的那个人。想去这件事在你眼里比排了多久的队更值得被算进去。',
              p: 'dev',
              s: 'pr',
              traits: { explore: 2, connect: 1 },
            },
            {
              id: 'b',
              text: '给那个一直做事却没被看到的人',
              whisper: '「一直在做事的那个人，你替他记着。」',
              detail: '做过的事总得有人记着。别人没提，那就由你来提——这个名额，就是你替他说的那句话。',
              p: 'ops',
              s: 'sec',
              traits: { guard: 2, connect: 1 },
            },
            {
              id: 'c',
              text: '先定一条规矩，这次和以后都照它来分',
              whisper: '「这次怎么分你先不管，你先定规矩。」',
              detail: '这一次到底谁去，反倒是次要的。你要的是往后不必再为同一件事吵上第二回。',
              p: 'sec',
              s: 'ops',
              traits: { insight: 2, guard: 1 },
            },
            {
              id: 'd',
              text: '想个办法，让没去的人也能得到点什么',
              whisper: '「名额只有一个，你想让它变成不止一个。」',
              detail: '你不接受只有一个人能得到。换个办法让没去的人也拿到点什么，这事就不再是一个人拿走全部。',
              p: 'pr',
              s: 'dev',
              traits: { create: 2, connect: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q10',
      kind: 'abstract',
      axis: ['insight', 'create'],
      candidates: [
        {
          id: 'q10-1',
          title: '想明白的那刻',
          scene: '那道怎么都看不懂的题卡了你很久，问同学也没弄明白。有天早上忽然通了。那一刻最像下面哪一种？',
          options: [
            {
              id: 'a',
              text: '像一张纸终于被翻到了背面',
              whisper: '「那东西一点没变，你换了一边看它。」',
              detail: '想通在你这儿不是知道了新东西，是站到了另一边——同一样东西，换个方向看它。',
              p: 'ops',
              s: 'pr',
              traits: { insight: 3 },
            },
            {
              id: 'b',
              text: '像散落一地的零件忽然拼好了',
              whisper: '「零件一直都在，你只是找到了顺序。」',
              detail: '手里从来不缺料，缺的是把它们摆对的那个次序。次序一对，整件事就立住了。',
              p: 'sec',
              s: 'dev',
              traits: { create: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '像走了很远之后，回头才看清整条路',
              whisper: '「你不是想通的，你其实是走通的。」',
              detail: '坐在原地是想不出来的。你得先往前走上一段。回头那一眼，才忽然把整条路看全。',
              p: 'dev',
              s: 'sec',
              traits: { explore: 2, insight: 1 },
            },
            {
              id: 'd',
              text: '像有人随口说了一句，你忽然就懂了',
              whisper: '「一句话就够。那句话得有人愿意说给你。」',
              detail: '你的开窍常常来自别人的一句话，所以身边有没有那个肯开口的人，你很在意。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, guard: 1 },
            },
          ],
        },
        {
          id: 'q10-2',
          title: '做得好的那件',
          scene: '回头看自己做过的那些东西，有一件你到现在还真的满意。它好在哪里？',
          options: [
            {
              id: 'a',
              text: '好在它把一件繁琐的事变简单了',
              whisper: '「你信的是简单。多余的那些你全去掉了。」',
              detail: '它把一件繁琐的事变简单了。多余的步骤全去掉，剩下那点刚好够用，不多也不少。',
              p: 'pr',
              s: 'ops',
              traits: { create: 2, insight: 1 },
            },
            {
              id: 'b',
              text: '好在到今天它还一直有人在用',
              whisper: '「它到今天还在用。这就是你要的。」',
              detail: '当时到底有多惊艳，你早就不记得了。可它撑到了今天，还有人在用——这比当年惊不惊艳更算数。',
              p: 'ops',
              s: 'dev',
              traits: { guard: 2, create: 1 },
            },
            {
              id: 'c',
              text: '好在因为它，你认识了很多人',
              whisper: '「东西本身是次要的。你记着的是那些人。」',
              detail: '你满意的是它把人带到了你面前。东西本身多好反而在其次，它让你认识了人。',
              p: 'dev',
              s: 'sec',
              traits: { connect: 2, create: 1 },
            },
            {
              id: 'd',
              text: '好在你为了做它去了从没去过的地方',
              whisper: '「东西是其次的。你在意的是那段路。」',
              detail: '东西成没成其实是其次的。为了做它你往前走了很长一段，那段路谁也拿不走。',
              p: 'sec',
              s: 'pr',
              traits: { explore: 2, insight: 1 },
            },
          ],
        },
      ],
    },
    {
      id: 'q11',
      kind: 'fantasy',
      axis: ['explore', 'connect'],
      candidates: [
        {
          id: 'q11-1',
          title: '岔开的四条路',
          scene: '晚自习结束，你在教学楼和宿舍之间的岔口站定，四条路通向四方。没有路灯，也看不清尽头。',
          options: [
            {
              id: 'a',
              text: '挑最窄的那条，先走进去看看',
              whisper: '「四条里你挑了最窄的那条。理由你说不清。」',
              detail: '你挑了最窄的那条。选它其实没有什么理由，只是你想知道它到底通到哪儿去。',
              p: 'dev',
              s: 'ops',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '在岔口等一等，看会不会有人也经过这里',
              whisper: '「你不急着走。你更想有个人一起走。」',
              detail: '你在岔口停下来等。一个人选哪条都是在猜，身边多一个人就多出另一种看法。',
              p: 'sec',
              s: 'pr',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '每条都先走几步，回来再决定选哪条',
              whisper: '「你不赌。你花时间把四条都摸一遍。」',
              detail: '你不肯只凭猜。四条都先走几步再回来选，是慢了一点，但选完你不会再后悔。',
              p: 'pr',
              s: 'dev',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'd',
              text: '先在岔口留个标记，写上自己看到的情况',
              whisper: '「你还没选路，先给后面的人留了字。」',
              detail: '你在选路之前先在岔口留了几个字。后面的人走到这儿，就不必再从零开始猜了。',
              p: 'ops',
              s: 'sec',
              traits: { create: 2, connect: 1 },
            },
          ],
        },
        {
          id: 'q11-2',
          title: '一直往下的楼梯',
          scene: '晚上你想从图书馆找条近路回宿舍，楼梯却一路往下，怎么都到不了底，每一层还都一样。',
          options: [
            {
              id: 'a',
              text: '接着往下走，看到底有没有尽头',
              whisper: '「你接着往下走。你要的是那个底。」',
              detail: '这楼梯有没有底，你没打算猜，你打算走到那儿去看。只要底是真的，多走的那几层就都不算白走。',
              p: 'ops',
              s: 'pr',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '在这一层做个记号，看往下还会不会再碰到它',
              whisper: '「你先留个记号。你要弄清这楼梯是不是在绕圈。」',
              detail: '你先留下一个记号。还会不会再碰到它，比你又往下多走了多少层更能说明问题。',
              p: 'sec',
              s: 'dev',
              traits: { insight: 2, create: 1 },
            },
            {
              id: 'c',
              text: '在原地停下，听听有没有别人的脚步',
              whisper: '「你停下来听。你想知道还有没有人。」',
              detail: '往下还有多远，你先不去想。你更怕的是这栋楼从头到尾，其实只剩下你一个人。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'd',
              text: '不再往下了，转身往回走试试',
              whisper: '「你转身往回走。往下走不一定就能出去。」',
              detail: '你转身往回走。既然往下走一直没有结果，往回走至少是一条你还没试过的路。',
              p: 'dev',
              s: 'sec',
              traits: { guard: 2, explore: 1 },
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
              text: '「有他在的时候，大家才真正像一个整体。」',
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
              detail: '你希望留下的是一个被彻底想明白的答案。一件就够，只要它真的通了，不是糊过去的。',
              p: 'pr',
              s: 'sec',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'c',
              text: '「有他在的那几年，什么都没出过事。」',
              whisper: '「你要的评价，听起来最像什么都没发生过。」',
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
        {
          id: 'q12-2',
          title: '一年以后的你',
          scene: '一年以后的今天，你希望自己在这个社团里正在做的会是哪一件事？',
          decider: true,
          options: [
            {
              id: 'a',
              text: '正在做一件眼下只有自己相信的东西',
              whisper: '「一年以后你手里得有一件真的东西。」',
              detail: '开头只有自己信也没关系。一年以后能指着它说这是我做的，这一年就不算白过。',
              p: 'sec',
              s: 'pr',
              traits: { create: 2, explore: 1 },
            },
            {
              id: 'b',
              text: '正在弄清一件很久没人弄明白的事',
              whisper: '「一年以后，那件没人弄明白的事还卡在你手上。」',
              detail: '那件事拖了很久，也不好看。可它一旦被搞清楚，往后就再没人需要从头来一遍。',
              p: 'ops',
              s: 'dev',
              traits: { insight: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '正在带着一群新来的人往前走',
              whisper: '「一年以后你身后得跟着一大群人。」',
              detail: '一个人能走多快在你这儿从来都不是重点，你要算的是身后到底跟上来了多少人。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 3 },
            },
            {
              id: 'd',
              text: '守着自己接手的那摊事，让它一直稳稳地转',
              whisper: '「一年以后你接的那件事得稳稳当当地转。」',
              detail: '没出什么事。这就是你要的那张成绩单。听着不响，可它得一天不落地转下去。',
              p: 'dev',
              s: 'sec',
              traits: { guard: 2, connect: 1 },
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
