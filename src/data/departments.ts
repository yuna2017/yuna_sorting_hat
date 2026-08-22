import type { DeptId } from './constants'
import { DEPT_ORDER } from './constants'
import devImg from '../assets/dept/dev.webp'
import secImg from '../assets/dept/sec.webp'
import opsImg from '../assets/dept/ops.webp'
import prImg from '../assets/dept/pr.webp'

export interface DeptLink {
  label: string
  href: string
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
   * TODO（社团填写）：部门具体做什么。
   * null 表示未填写 —— 结果页不渲染该区块，不留半截空白。
   */
  intro: string | null
  /**
   * TODO（社团填写）：招新群 / 作品集 / 文档等链接。
   * 空数组表示未填写 —— 结果页不渲染链接区。
   */
  links: DeptLink[]
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
    intro: null,
    links: [],
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
    intro: null,
    links: [],
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
    intro: null,
    links: [],
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
    intro: null,
    links: [],
  },
}

/** 按规范顺序取部门列表（雷达图轴序等）。 */
export const DEPT_LIST: Department[] = DEPT_ORDER.map((id) => DEPARTMENTS[id])

/**
 * 开发期提示：把还没填的事实性文案大声报出来，避免上线时才发现结果页缺内容。
 * 氛围文案（slogan）已写好，这里只盯 intro / links。
 */
export function reportUnfilledCopy(): string[] {
  const missing: string[] = []
  for (const dept of DEPT_LIST) {
    if (dept.intro === null) missing.push(`${dept.name} intro（部门介绍）`)
    if (dept.links.length === 0) missing.push(`${dept.name} links（招新/作品链接）`)
  }
  return missing
}
