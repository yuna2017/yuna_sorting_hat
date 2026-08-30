import type { DeptId } from './constants'
import { DEPT_ORDER } from './constants'
import { CAMPAIGN } from './campaign'
import devImg from '../assets/dept/dev.webp'
import secImg from '../assets/dept/sec.webp'
import opsImg from '../assets/dept/ops.webp'
import prImg from '../assets/dept/pr.webp'

/** 招新入口的语义类别。决定结果页按钮的主次与排序，不参与判定。 */
export type DeptActionKind = 'join' | 'more' | 'works'
export type DeptActionStatus = 'open' | 'closed' | 'pending'

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
  /** 入口状态；pending / closed 时即使有旧 URL 也不渲染为可点击链接。 */
  status?: DeptActionStatus
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


function departmentActions(
  deptName: string,
  detailUrl: string,
  articlesUrl: string,
  worksLabel = '查看部门文章',
): DeptAction[] {
  return [
    {
      kind: 'join',
      label: '加入网协招新',
      href: CAMPAIGN.publicJoinUrl,
      status: CAMPAIGN.status,
      note: `${CAMPAIGN.year} 届招新 QQ 群`,
    },
    { kind: 'more', label: `了解${deptName}`, href: detailUrl, status: 'open' },
    { kind: 'works', label: worksLabel, href: articlesUrl, status: 'open' },
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
    tagline: '负责协会站点、校园工具、全栈开发和技术探索，推动项目落地与团队协作，让代码从学习实践走向真实应用。',
    intro:
      'YUNA 开发部：聚焦 Web 全栈、网络基建与前沿技术。推崇“项目驱动”，从零基础到极客皆可加入。' +
      '参与竞赛孵化，实战 Git 协作与部署。拒绝枯燥作业，打造真正有人用的产品，用代码构建世界！',
    doing: [
      '学习 HTML、CSS、JavaScript 以及 Vue、React 等现代前端框架',
      '接触服务端开发、数据库管理和 RESTful API 设计',
      '使用 Git 进行版本控制、协同开发与代码审查',
      '实践 CI/CD、部署上线以及各类竞赛与孵化项目',
    ],
    suitedFor: '行动派与实践者。',
    actions: departmentActions(
      '开发部',
      'https://www.yuna.team/department-dev',
      'https://www.yuna.team/articles?tag=%E5%BC%80%E5%8F%91%E9%83%A8',
      '查看开发部文章',
    ),
    contentDraft: false,
  },
  sec: {
    id: 'sec',
    name: '网络安全部',
    latinName: 'cyber security',
    house: '拉文克劳',
    houseLatin: 'Ravenclaw',
    keywords: ['研究', '创新', '逻辑'],
    image: secImg,
    slogan: '你要的从来不是答案，是它为什么成立。',
    tagline: '组织网络安全基础训练与 CTF 竞赛实践，覆盖多类安全方向，并通过赛题复盘沉淀可继续学习的技术路线。',
    intro:
      'YUNA 网络安全部：协会最早创立的部门之一，围绕网络安全基础和 CTF 竞赛开展培训、研究与实战，' +
      '接触漏洞分析、攻防思维和安全知识传播，在解题与复盘中逐步建立完整的计算机与网络安全知识体系。',
    doing: [
      '学习 Linux、Kali Linux、Python 脚本与常用安全工具',
      '接触信息搜集、密码学与 Web 安全',
      '学习软件逆向、Pwn 与 Android 安全',
      '参加 CTF 竞赛并进行赛题分析与复盘',
    ],
    suitedFor: '喜欢解谜与钻研、对攻防原理充满好奇、愿意持续学习和复盘的人。',
    actions: departmentActions(
      '网络安全部',
      'https://www.yuna.team/department-security',
      'https://www.yuna.team/articles?tag=%E7%BD%91%E5%AE%89%E9%83%A8',
      '查看训练资料与文章',
    ),
    contentDraft: false,
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
    tagline: '维护站点服务、部署流程、域名证书和校园工具运行环境，保障协会项目稳定上线并长期可访问。',
    intro:
      'YUNA 运维部：负责把开发成果从“代码能跑”推进到“大家能用”。围绕服务器、网络、部署、监控和自动化开展实践，' +
      '为校园工具与协会平台搭建稳定底座，并在故障排查、版本迭代和跨部门协作中保障服务持续运行。',
    doing: [
      '学习 Linux、服务器部署、权限管理与进程监控',
      '处理故障排查、域名解析与网络配置',
      '使用 Docker、CI/CD、Shell 和 Python 实现自动化',
      '接触云计算、DevOps 与容器编排',
    ],
    suitedFor: '做事稳、注重细节、愿意排查问题并承担长期维护和收尾工作的人。',
    actions: departmentActions(
      '运维部',
      'https://www.yuna.team/department-ops',
      'https://www.yuna.team/articles?tag=%E8%BF%90%E7%BB%B4%E9%83%A8',
    ),
    contentDraft: false,
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
    tagline: '负责协会形象建设、文化运营、活动记录、图文传播和事务管理，连接组织内部成员与外部受众。',
    intro:
      'YUNA 组宣部：融合原组宣部与秘书处的核心工作，承担协会形象建设、内容传播、文化运营和事务管理。' +
      '通过官方账号、视觉物料、活动策划、成员资料与会议档案，让协会对外表达更清晰、内部协作更有秩序。',
    doing: [
      '运营官方账号，参与内容策划、品牌传播与对外沟通',
      '制作视觉物料并学习 Adobe 等设计工具',
      '撰写策划书、组织活动并建设团队文化',
      '维护成员资料、会议档案和协会日常流程',
    ],
    suitedFor: '喜欢沟通、组织与表达，对文字和视觉内容敏感，愿意协调资源并推动活动落地的人。',
    actions: departmentActions(
      '组宣部',
      'https://www.yuna.team/department-publicity',
      'https://www.yuna.team/articles?tag=%E7%BB%84%E5%AE%A3%E9%83%A8',
    ),
    contentDraft: false,
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
