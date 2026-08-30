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
 * 按 docs/特质体系.md §5 的槽位矩阵，q1～q12 十二个槽已全部就位，
 * 尚缺每槽的第 2 道候选（目标：12 槽 × 2 = 24 道）。
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
              text: '先自己动手做个粗糙的版本出来',
              whisper: '「你不先说，你先做。做出来的东西自己会说话。」',
              detail: '你没有等一个说话的机会，先把想法变成了一件能看能摸的东西。它替你把话讲完了。',
              p: 'dev',
              s: 'pr',
              traits: { create: 2, explore: 1 },
            },
            {
              id: 'b',
              text: '找一个人先讲一遍，看他听不听得懂',
              whisper: '「你要的不是同意，是有人真的听懂了。」',
              detail: '你要先找一个具体的人，把话原原本本说一遍。能不能讲通，比自己觉得好用得多。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '写下来放着，等它自己长得更结实一点',
              whisper: '「你信时间。放一放还站得住的，才算数。」',
              detail: '你不急着让它见人。一个想法能不能放住，本身就是你判断它值不值得做的方式。',
              p: 'sec',
              s: 'dev',
              traits: { insight: 2, guard: 1 },
            },
            {
              id: 'd',
              text: '先想清楚它会不会给别人添麻烦',
              whisper: '「想到的第一件事不是它多好，是它会碰到谁。」',
              detail: '你先算的不是它能带来什么好处，而是它会落在谁的头上。这一步你从来不省。',
              p: 'ops',
              s: 'sec',
              traits: { guard: 2, connect: 1 },
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
              whisper: '「一整天你换成了一段路。走到哪儿算哪儿。」',
              detail: '一整天你换成了一条没走过的路。你不问那儿有什么，先让自己到了那儿再说。',
              p: 'pr',
              s: 'sec',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '把一直想做的东西做出个开头',
              whisper: '「你不要休息，你要的是终于能动手了。」',
              detail: '空出来的时间你没有花在歇着上，而是花在一直想做却始终没开始的那件事上。',
              p: 'ops',
              s: 'dev',
              traits: { create: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '找几个人一起，把这一天填满',
              whisper: '「一个人的一天太安静，你叫上了别人。」',
              detail: '你把一整天交给了别人。空着的时间在你这儿从来不是空的，而是可以和人一起用掉的。',
              p: 'dev',
              s: 'ops',
              traits: { connect: 2, explore: 1 },
            },
            {
              id: 'd',
              text: '什么都不做，把攒下的事情理清',
              whisper: '「什么都不做，是你为下一整周做的事。」',
              detail: '你把这一天用来把之前欠下的事一件件放回原位。全部清干净了，你才觉得往后踏实。',
              p: 'sec',
              s: 'pr',
              traits: { guard: 2, insight: 1 },
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
              text: '立刻把它指出来，让所有人都知道',
              whisper: '「你没有先问该不该说出来，你先说了。」',
              detail: '你没有先掂量说出来的代价。它不对就该有人知道，这件事在你这儿没有别的顺序。',
              p: 'sec',
              s: 'ops',
              traits: { guard: 2, connect: 1 },
            },
            {
              id: 'b',
              text: '先自己查清楚，弄明白它为什么会这样',
              whisper: '「错在哪儿你不着急，它凭什么错你要弄清。」',
              detail: '你更在意它为什么会变成这样。改掉它容易，弄明白它怎么来的才算真的处理了。',
              p: 'ops',
              s: 'pr',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'c',
              text: '悄悄把它改好，不惊动任何人',
              whisper: '「你把它补好，没打算让谁知道那是你。」',
              detail: '你把它补好了，也没打算让人知道是你补的。事情对了就够，署不署名不重要。',
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
              detail: '你按风险排序。哪一件放着会变糟就先动它，剩下的事再要紧也全排在它后面。',
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
              text: '先找出四件事里共用的那一步',
              whisper: '「四件事你看成了一件。剩下的就顺了。」',
              detail: '你不急着开始，先去找四件事共用的那一步。一步做对，四件事就一起往前走了。',
              p: 'sec',
              s: 'pr',
              traits: { insight: 2, create: 1 },
            },
            {
              id: 'd',
              text: '先挑一件最想做的，做完再说',
              whisper: '「你先挑了想做的那件。转起来别的才动。」',
              detail: '你先让自己转起来。挑一件想做的做完，后面那几件才有往前推下去的那口力气。',
              p: 'dev',
              s: 'sec',
              traits: { create: 2, explore: 1 },
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
          scene: '桌上多了一张纸条，写着一句只有你看得懂的话，末尾没有留名字。',
          options: [
            {
              id: 'a',
              text: '顺着那句话找过去，看它指向哪儿',
              whisper: '「你先追那句话去哪儿，不追写它的人。」',
              detail: '你抓住的是那句话本身。它指向哪儿比谁写的更值得走一趟，人可以后面再说。',
              p: 'dev',
              s: 'pr',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'b',
              text: '先想清楚这世上谁会知道这件事',
              whisper: '「话说了什么你先放下，谁说的你先想。」',
              detail: '你先想的是范围。知道这件事的人本来就不多，从这儿往回推比从话本身推更快。',
              p: 'sec',
              s: 'ops',
              traits: { connect: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '原样放回去，等对方再来一次',
              whisper: '「你什么也没动。你觉得下一步该他走。」',
              detail: '你把它放回原处，一个字也没有动。该接的那一步不在你这边，你就这么等着。',
              p: 'ops',
              s: 'sec',
              traits: { guard: 3 },
            },
            {
              id: 'd',
              text: '也留一张纸条，写上自己的回答',
              whisper: '「你没找他，你回了他。用的是同样的方式。」',
              detail: '你用同样的方式回了他一句。你没有拆穿他，而是接住了他递过来的那个玩法。',
              p: 'pr',
              s: 'dev',
              traits: { create: 2, connect: 1 },
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
              text: '提一个谁都没想过的第三种做法',
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
              detail: '你觉得卡住的从来不是事情本身，而是那些没说出口的部分。你先让它们出来。',
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
              text: '直接问一句最没人敢问的话',
              whisper: '「那句话谁都想到了。你把它说了出来。」',
              detail: '你把大家都想到却谁也不肯开口的那句话说了出来。屋里的空气从这儿开始动。',
              p: 'pr',
              s: 'sec',
              traits: { explore: 2, connect: 1 },
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
              text: '带走那件自己亲手做出来的',
              whisper: '「你带走的是自己留下过的那个痕迹。」',
              detail: '你带走的是自己做出来的那一件。它能证明你待在这儿的那段时间，真的动过手。',
              p: 'pr',
              s: 'ops',
              traits: { create: 2, guard: 1 },
            },
            {
              id: 'b',
              text: '带走一张所有人都在里面的合照',
              whisper: '「东西都可以不要，人你得记得住。」',
              detail: '你愿意留下所有的东西，只带走人。这个地方对你来说，本来就是这些人而已。',
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
              text: '什么旧东西都不带，只带一张地图',
              whisper: '「你不留过去。你带能去下一个地方的东西。」',
              detail: '你没有带走任何属于过去的东西，只带了能去下一个地方的那一件。你朝前看。',
              p: 'sec',
              s: 'dev',
              traits: { explore: 2, guard: 1 },
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
          scene: '有件事你一直没想通。忽然有一天它通了。你回过头看，它最像哪一种？',
          options: [
            {
              id: 'a',
              text: '像一张纸终于被翻到了背面',
              whisper: '「那东西一点没变，你换了一边看它。」',
              detail: '对你来说想通就是换了个方向看同一件事。东西一点没变，看它的那一边变了。',
              p: 'ops',
              s: 'pr',
              traits: { insight: 3 },
            },
            {
              id: 'b',
              text: '像手里散着的零件忽然拼上了',
              whisper: '「零件一直都在，你只是找到了顺序。」',
              detail: '对你来说想通就是零件终于对上了。它们一直都在自己手里，缺的只是那个顺序。',
              p: 'sec',
              s: 'dev',
              traits: { create: 2, insight: 1 },
            },
            {
              id: 'c',
              text: '像走了很远之后回头看见路',
              whisper: '「你不是想通的，你其实是走通的。」',
              detail: '对你来说想通不是坐在原地想出来的，而是走过一段路之后回头才忽然看清的。',
              p: 'dev',
              s: 'sec',
              traits: { explore: 2, insight: 1 },
            },
            {
              id: 'd',
              text: '像有人说了一句，你就懂了',
              whisper: '「一句话就够。那句话得有人愿意说给你。」',
              detail: '对你来说想通常常来自别人的一句话。所以你在意身边有没有能说这句话的人。',
              p: 'pr',
              s: 'ops',
              traits: { connect: 2, guard: 1 },
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
          scene: '走到一处，前面岔开四条路。没有路牌，也看不见尽头到底有些什么。',
          options: [
            {
              id: 'a',
              text: '挑最窄的那条，先走进去看看',
              whisper: '「四条里你挑了最难走的。理由你说不清。」',
              detail: '你挑了最窄的那条。选它其实没有什么理由，只是你想知道它到底通到哪儿去。',
              p: 'dev',
              s: 'ops',
              traits: { explore: 3 },
            },
            {
              id: 'b',
              text: '在岔口等，看有没有人也到这儿',
              whisper: '「你不急着走。你更想有个人一起走。」',
              detail: '你在岔口停下来等。一个人选哪条都是在猜，身边多一个人就多出另一种看法。',
              p: 'sec',
              s: 'pr',
              traits: { connect: 2, guard: 1 },
            },
            {
              id: 'c',
              text: '每条都走几步，回来之后再选',
              whisper: '「你不赌。你花时间把四条都摸一遍。」',
              detail: '你不肯只凭猜。四条都先走几步再回来选，是慢了一点，但选完你不会再后悔。',
              p: 'pr',
              s: 'dev',
              traits: { insight: 2, explore: 1 },
            },
            {
              id: 'd',
              text: '先在岔口立个路牌，写上自己看到的',
              whisper: '「你还没选路，先给后面的人留了字。」',
              detail: '你在选路之前先给岔口立了一块牌子。后面的人走到这儿，就不必再从零开始猜了。',
              p: 'ops',
              s: 'sec',
              traits: { create: 2, connect: 1 },
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
