import type { DeptId } from './constants'

export type OptionId = 'a' | 'b' | 'c' | 'd'

export interface QuizOption {
  id: OptionId
  /** 选项正文。控制在一行内，为移动端与打字机效果留余量。 */
  text: string
  /** 分部帽低语：选完后帽子的即时反应。 */
  whisper: string
  /** 主推部门，+PRIMARY_WEIGHT */
  p: DeptId
  /** 副推部门，+SECONDARY_WEIGHT。约束：s !== p，且每题四个 s 构成无固定点置换。 */
  s: DeptId
}

export interface Question {
  id: string
  title: string
  /** 题面引文/场景描述。 */
  scene: string
  /**
   * 决胜题标记。并列时用「该题所选选项的主推部门」决胜。
   * 题目文档指定 Q10（价值观题）担任此角色。
   * 用数据标记而非硬编码题号 —— 将来在中间插题也不会让决胜局悄悄跑偏。
   */
  decider?: boolean
  options: QuizOption[]
}

export interface QuestionBank {
  questions: Question[]
}

/**
 * 题库。文案与权重指针按题共置 —— 新增一题只改一处，避免平行数组索引错位。
 * 正确性由 lib/validateBank.ts 的不变量校验兜底，不靠文件切分。
 *
 * 每题必须满足（否则结果页会失衡）：
 *   1. 恰好 4 个选项，4 个 p 覆盖全部四个部门；
 *   2. 4 个 s 也覆盖全部四个部门，且没有 p === s（即无固定点置换）。
 * 由此每个部门理论满分 = 题数 × 3。
 */
export const QUESTION_BANK: QuestionBank = {
  questions: [
    {
      id: 'q1',
      title: '宿舍的第一个网口',
      scene: '开学第一天，你把行李扔在床上，插上网线——不通。室友们齐刷刷看向你。',
      options: [
        {
          id: 'a',
          text: '自己上手折腾，插拔、重启、翻教程，半小时内让它通',
          whisper: '「不问为什么，先让它动起来……嗯。」',
          p: 'dev',
          s: 'sec',
        },
        {
          id: 'b',
          text: '先去问宿管和网络中心，问清流程，顺手帮整层楼都问了',
          whisper: '「你替别人多问了一句。这很少见。」',
          p: 'ops',
          s: 'pr',
        },
        {
          id: 'c',
          text: '先搞明白校园网是怎么认证的，再决定动哪里',
          whisper: '「你想知道的不是答案，是规则本身。」',
          p: 'sec',
          s: 'ops',
        },
        {
          id: 'd',
          text: '拉个楼层群，把会修的人和需要修的人凑到一起',
          whisper: '「你不修它——你让别人去修。也是一种本事。」',
          p: 'pr',
          s: 'dev',
        },
      ],
    },
    {
      id: 'q2',
      title: '猫头鹰送来的信',
      scene: '如果有一只猫头鹰撞开窗户，给你送来一封信。你最希望信里装着——',
      options: [
        {
          id: 'a',
          text: '一道至今无人解开的谜题',
          whisper: '「解不开的东西，对你反而是种邀请。」',
          p: 'sec',
          s: 'pr',
        },
        {
          id: 'b',
          text: '一份能召集所有人的名单',
          whisper: '「你要的不是力量，是人。」',
          p: 'pr',
          s: 'sec',
        },
        {
          id: 'c',
          text: '一样还没人做出来的东西的图纸',
          whisper: '「图纸？你已经在想第一步先拧哪颗螺丝了。」',
          p: 'dev',
          s: 'ops',
        },
        {
          id: 'd',
          text: '一串需要你去看守的钥匙',
          whisper: '「被托付……你居然觉得那是礼物。」',
          p: 'ops',
          s: 'dev',
        },
      ],
    },
    {
      id: 'q3',
      title: '第一次例会',
      scene: '你坐进社团的第一次例会。桌上摊着一堆没人认领的活。',
      options: [
        {
          id: 'a',
          text: '散会后默默把会议记录整理好发进群里',
          whisper: '「没人让你做。你也没说是你做的。」',
          p: 'ops',
          s: 'sec',
        },
        {
          id: 'b',
          text: '举手接下最难的那一个',
          whisper: '「勇气——或者只是还不知道那有多难。」',
          p: 'dev',
          s: 'pr',
        },
        {
          id: 'c',
          text: '会后把每个人都加上好友',
          whisper: '「你在数的不是人数，是可能性。」',
          p: 'pr',
          s: 'ops',
        },
        {
          id: 'd',
          text: '一句话不说，先把在场每个人擅长什么摸清楚',
          whisper: '「你在建一张地图。安静，但危险。」',
          p: 'sec',
          s: 'dev',
        },
      ],
    },
    {
      id: 'q4',
      title: '凌晨两点，社团网站崩了',
      scene: '手机在枕头边疯狂震动。你眼睛都没睁开就知道出事了。',
      options: [
        {
          id: 'a',
          text: '先在群里发一条说明，别让大家慌',
          whisper: '「你先安抚人，再处理事。顺序有讲究。」',
          p: 'pr',
          s: 'dev',
        },
        {
          id: 'b',
          text: '先翻日志——是被人打了，还是我们自己写崩了',
          whisper: '「在动手之前，你要先知道敌人是谁。」',
          p: 'sec',
          s: 'ops',
        },
        {
          id: 'c',
          text: '先回滚到昨天的版本，保证早上八点能用',
          whisper: '「不追求漂亮，只追求它还在。」',
          p: 'ops',
          s: 'pr',
        },
        {
          id: 'd',
          text: '直接改，天亮之前把新版本推上去',
          whisper: '「凌晨两点的勇气，最贵。」',
          p: 'dev',
          s: 'sec',
        },
      ],
    },
    {
      id: 'q5',
      title: '给你一整个学期',
      scene: '一学期，一件事，做完为止。你选——',
      options: [
        {
          id: 'a',
          text: '把社团那套年年出问题的东西彻底修好',
          whisper: '「最没人夸的活，你挑了。」',
          p: 'ops',
          s: 'dev',
        },
        {
          id: 'b',
          text: '把一个问题挖到底，写成一篇没人写过的东西',
          whisper: '「你要的不是做完，是想通。」',
          p: 'sec',
          s: 'pr',
        },
        {
          id: 'c',
          text: '办一场让全校都知道的活动',
          whisper: '「你的作品，是别人的记忆。」',
          p: 'pr',
          s: 'sec',
        },
        {
          id: 'd',
          text: '做一个能真正跑起来的东西，哪怕它很粗糙',
          whisper: '「粗糙但活着，好过精致但停着。」',
          p: 'dev',
          s: 'ops',
        },
      ],
    },
    {
      id: 'q6',
      title: '禁书区',
      scene: '图书馆最深处的书架只允许你带走一本。',
      options: [
        {
          id: 'a',
          text: '《一千个人如何相信同一件事》',
          whisper: '「这本书……被借走的次数比你想的多。」',
          p: 'pr',
          s: 'ops',
        },
        {
          id: 'b',
          text: '《从一块石头开始造一台计算机》',
          whisper: '「从头造。你不信任别人的地基。」',
          p: 'dev',
          s: 'pr',
        },
        {
          id: 'c',
          text: '《让一切永不停机》',
          whisper: '「一个几乎不可能的承诺。你还是想试。」',
          p: 'ops',
          s: 'sec',
        },
        {
          id: 'd',
          text: '《一切密码的历史，以及它们是怎么被破的》',
          whisper: '「你翻的是后半本，对吧。」',
          p: 'sec',
          s: 'dev',
        },
      ],
    },
    {
      id: 'q7',
      title: '你不认同队友的方案',
      scene: '他讲完了，全场点头。只有你觉得不对。',
      options: [
        {
          id: 'a',
          text: '自己写一版更好的，摆在桌上说话',
          whisper: '「你不辩论。你交作业。」',
          p: 'dev',
          s: 'sec',
        },
        {
          id: 'b',
          text: '先问他为什么这么做，也许有我不知道的原因',
          whisper: '「你默认自己可能是错的那个。难得。」',
          p: 'ops',
          s: 'pr',
        },
        {
          id: 'c',
          text: '把它会在什么情况下出错，一条条列清楚',
          whisper: '「你不说他错。你让事实说。」',
          p: 'sec',
          s: 'ops',
        },
        {
          id: 'd',
          text: '私下找他聊，不在群里让他没面子',
          whisper: '「你既赢了事，也留住了人。」',
          p: 'pr',
          s: 'dev',
        },
      ],
    },
    {
      id: 'q8',
      title: '招新摊位前',
      scene: '一个学弟在摊位前来回走了三趟，还是没敢过来。',
      options: [
        {
          id: 'a',
          text: '出一道小题，看他眼睛会不会亮',
          whisper: '「你在筛人。用你自己被筛的方式。」',
          p: 'sec',
          s: 'pr',
        },
        {
          id: 'b',
          text: '打开电脑，给他看我们做出来的东西',
          whisper: '「不解释，直接给他看。」',
          p: 'dev',
          s: 'ops',
        },
        {
          id: 'c',
          text: '讲一个社团里最精彩的那个故事',
          whisper: '「故事比传单有用。你早就知道。」',
          p: 'pr',
          s: 'sec',
        },
        {
          id: 'd',
          text: '先递一瓶水，问他军训累不累',
          whisper: '「你先把他当人，再当新成员。」',
          p: 'ops',
          s: 'dev',
        },
      ],
    },
    {
      id: 'q9',
      title: '有求必应屋',
      scene: '走廊尽头的墙裂开一道门。里面是——',
      options: [
        {
          id: 'a',
          text: '一间什么都造得出来的工坊',
          whisper: '「你不问它有什么。你问它能做什么。」',
          p: 'dev',
          s: 'pr',
        },
        {
          id: 'b',
          text: '一座坐得下所有人的礼堂',
          whisper: '「空着的礼堂，你已经听见掌声了。」',
          p: 'pr',
          s: 'ops',
        },
        {
          id: 'c',
          text: '一台永远不会坏、也不许坏的机器',
          whisper: "「'不许坏'——那是责任，不是愿望。」",
          p: 'ops',
          s: 'sec',
        },
        {
          id: 'd',
          text: '一扇通往所有未解之谜的门',
          whisper: '「门后面还是门。你反而更高兴。」',
          p: 'sec',
          s: 'dev',
        },
      ],
    },
    {
      id: 'q10',
      title: '你走的那天',
      scene: '很多年后你离开这个社团。你希望留下来的人怎么提起你？',
      decider: true,
      options: [
        {
          id: 'a',
          text: '「是他把大家聚起来的。」',
          whisper: '「你留下的不是东西，是人和人之间的线。」',
          p: 'pr',
          s: 'dev',
        },
        {
          id: 'b',
          text: '「那个问题，是他想通的。」',
          whisper: '「一个答案，署你的名。够了。」',
          p: 'sec',
          s: 'ops',
        },
        {
          id: 'c',
          text: '「有他在的那几年，没出过事。」',
          whisper: '「最高的评价，听起来最像什么都没发生。」',
          p: 'ops',
          s: 'pr',
        },
        {
          id: 'd',
          text: '「那东西是他做的。」',
          whisper: '「指着它就能说出你的名字。你想要的是这个。」',
          p: 'dev',
          s: 'sec',
        },
      ],
    },
  ],
}
