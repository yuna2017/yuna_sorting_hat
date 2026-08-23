import type { DeptId } from './constants'
import { DEPT_ORDER } from './constants'
import devImg from '../assets/dept/dev.webp'
import secImg from '../assets/dept/sec.webp'
import opsImg from '../assets/dept/ops.webp'
import prImg from '../assets/dept/pr.webp'

/** 招新入口的语义类别。决定结果页按钮的主次与排序，不参与判定。 */
export type DeptActionKind = 'join' | 'more' | 'works'

export interface DeptAction {
  kind: DeptActionKind
  label: string
  /**
   * TODO（社团填写）：**公开可访问**的 URL。
   *
   * null = 还没提供 —— 结果页把它渲染成「待补充」的静态条目，
   * 而不是一个点进去 404 的死链。
   *
   * 只放协会公共入口（官网、公众号、报名表、公开仓库）。
   * 不要写个人手机号／私人 QQ 微信、群管理链接、内网地址或任何凭据 ——
   * 这一页是公开部署且会被分享出去的。
   */
  href: string | null
  /** 可选小字，如「招新期开放」。同样不要写个人联系方式。 */
  note?: string
}

export interface Department {
  id: DeptId
  /** 展示名，如「开发部」 */
  name: string
  /** 拉丁/英文名，如 development。用于封面与结果页的仪式感排版。 */
  latinName: string
  /** 对应霍格沃兹学院。仅作氛围点缀 —— 主题配色跟随立绘，不用院色。 */
  house: string
  /** 学院拉丁写法，结果页小字。 */
  houseLatin: string
  keywords: string[]
  image: string
  /** 氛围标语（已写好）。 */
  slogan: string
  /**
   * 一句话定位：这个部门到底干什么。与 slogan 分工 ——
   * slogan 负责氛围，tagline 负责事实。
   */
  tagline: string | null
  /**
   * TODO（社团填写）：部门具体做什么。
   * null 表示未填写 —— 结果页不渲染该区块，不留半截空白。
   */
  intro: string | null
  /**
   * TODO（社团填写）：进来之后会接触到的具体事情，2～4 条。
   * 写「你会做什么」，不要写「我们是一个充满活力的团队」。
   */
  doing: string[]
  /** TODO（社团填写）：适合什么样的人。让新生一眼判断要不要来。 */
  suitedFor: string | null
  /**
   * TODO（社团填写）：招新入口。空数组时结果页不渲染行动区。
   * 每条的 href 允许暂时为 null，见 DeptAction。
   */
  actions: DeptAction[]
  /**
   * true = 本部门的事实文案还是**占位草稿**，上线前必须由社团核对替换。
   * 开发期会在控制台点名，见 reportUnfilledCopy()。
   */
  contentDraft: boolean
}

/**
 * 占位招新入口。四个部门共用同一套 label 与语义，只是**都还没有 URL**。
 *
 * 为什么先放没有 href 的条目：结果页的「行动」这一层是招新转化的终点，
 * 它必须先在版式与流程里占好位置、被移动端一起验收；等社团给出真实公开链接后
 * 只改这一处数据即可，不用回头动组件。
 */
function draftActions(deptName: string): DeptAction[] {
  return [
    { kind: 'join', label: `加入${deptName}招新`, href: null, note: '招新期开放' },
    { kind: 'more', label: `了解${deptName}`, href: null },
    { kind: 'works', label: '看看做过的项目', href: null },
  ]
}

export const DEPARTMENTS: Record<DeptId, Department> = {
  dev: {
    id: 'dev',
    name: '开发部',
    latinName: 'development',
    house: '格兰芬多',
    houseLatin: 'Gryffindor',
    keywords: ['冒险', '领导力', '现场应变'],
    image: devImg,
    slogan: '从零到一的那一步，你从不犹豫。',
    tagline: '把想法做成真的能用的东西。',
    intro:
      '我们负责协会对内对外的网站、小程序与各类工具，从需求聊起，一直做到上线和后续维护。' +
      '不要求你进来就会写代码，要求你愿意把一个东西做完。',
    doing: ['做协会官网、招新页这类真实上线的项目', '学前后端与 Git 协作流程', '把学长学姐的旧项目接过来继续迭代'],
    suitedFor: '喜欢动手、能忍受反复调试、想看到自己写的东西被别人用的人。',
    actions: draftActions('开发部'),
    contentDraft: true,
  },
  sec: {
    id: 'sec',
    name: '网安部',
    latinName: 'cyber security',
    house: '拉文克劳',
    houseLatin: 'Ravenclaw',
    keywords: ['研究', '创新', '逻辑'],
    image: secImg,
    slogan: '你要的从来不是答案，是它为什么成立。',
    tagline: '把系统拆开，看清它为什么安全。',
    intro:
      '我们做安全方向的学习与竞赛，也帮协会自己的系统做检查。' +
      '入门看的是好奇心和肯查资料的耐心，不是已经会多少工具。',
    doing: ['打 CTF、复盘赛题', '学 Web、逆向、密码学等方向的基础', '给协会自己的项目做安全检查'],
    suitedFor: '遇到「为什么会这样」就一定要弄明白的人。',
    actions: draftActions('网安部'),
    contentDraft: true,
  },
  ops: {
    id: 'ops',
    name: '运维部',
    latinName: 'operations',
    house: '赫奇帕奇',
    houseLatin: 'Hufflepuff',
    keywords: ['协作', '细致', '服务精神'],
    image: opsImg,
    slogan: '你守着的东西不出声，所以没人知道你在守。',
    tagline: '让协会的服务一直开着。',
    intro:
      '我们管服务器、部署和日常值守，也处理同学报上来的各种故障。' +
      '这里的成就感不来自上线那一刻，来自很长时间里什么都没出事。',
    doing: ['管理服务器与部署流程', '排查网络与服务故障', '做备份、监控和交接文档'],
    suitedFor: '做事稳、愿意收尾、不嫌琐碎的人。',
    actions: draftActions('运维部'),
    contentDraft: true,
  },
  pr: {
    id: 'pr',
    name: '组宣部',
    latinName: 'public relations',
    house: '斯莱特林',
    houseLatin: 'Slytherin',
    keywords: ['资源整合', '影响力', '策略'],
    image: prImg,
    slogan: '你不站上台，你决定谁站上去。',
    tagline: '让该被看到的事被看到。',
    intro:
      '我们负责活动策划、宣传物料与对外联络，把协会在做的事讲清楚、传出去。' +
      '写文案、拍照排版、跟人打交道，都会碰到。',
    doing: ['策划招新与技术分享活动', '做海报、视频与公众号内容', '对接其他社团和校内单位'],
    suitedFor: '会张罗事、愿意跟人沟通、对表达有要求的人。',
    actions: draftActions('组宣部'),
    contentDraft: true,
  },
}

/** 按规范顺序取部门列表（雷达图轴序等）。 */
export const DEPT_LIST: Department[] = DEPT_ORDER.map((id) => DEPARTMENTS[id])

/**
 * 开发期提示：把还没填/还没核对的事实性文案大声报出来，
 * 避免上线时才发现结果页在拿占位稿招新。
 * 氛围文案（slogan）已写好，这里只盯事实字段。
 */
export function reportUnfilledCopy(): string[] {
  const missing: string[] = []
  for (const dept of DEPT_LIST) {
    if (dept.intro === null) missing.push(`${dept.name} intro（部门介绍）`)
    if (dept.tagline === null) missing.push(`${dept.name} tagline（一句话定位）`)
    if (dept.doing.length === 0) missing.push(`${dept.name} doing（进来会做什么）`)
    if (dept.suitedFor === null) missing.push(`${dept.name} suitedFor（适合什么人）`)
    if (dept.actions.length === 0) missing.push(`${dept.name} actions（招新入口）`)

    const deadActions = dept.actions.filter((a) => a.href === null)
    if (deadActions.length > 0) {
      missing.push(
        `${dept.name} actions 还缺 ${deadActions.length} 个真实链接：` +
          `${deadActions.map((a) => a.label).join('、')}`,
      )
    }
    if (dept.contentDraft) {
      missing.push(`${dept.name} 的介绍还是占位草稿（contentDraft: true），需社团核对后改为 false`)
    }
  }
  return missing
}
