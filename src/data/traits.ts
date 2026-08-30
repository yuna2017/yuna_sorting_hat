import { TRAIT_ORDER, type TraitId } from './constants'

export interface Trait {
  id: TraitId
  name: string
  /** 结果页轴标签下方的一句解释。只描述倾向，不评价能力。 */
  desc: string
}

/**
 * 五个人格特质的对外文案。
 *
 * 红线（docs/注意事项.md）：结果不用于心理诊断、能力评定或录取筛选，
 * 所以这里只能写「你倾向于怎么做」，不能写「你擅长/不擅长什么」。
 */
export const TRAITS: Record<TraitId, Trait> = {
  explore: {
    id: 'explore',
    name: '探索',
    desc: '面对没见过的东西，你倾向于先走一步再说。',
  },
  insight: {
    id: 'insight',
    name: '洞察',
    desc: '你更在意事情背后按什么规则运转。',
  },
  create: {
    id: 'create',
    name: '创造',
    desc: '你习惯把脑子里的想法变成真实存在的东西。',
  },
  guard: {
    id: 'guard',
    name: '守护',
    desc: '你在意的是它明天还能不能继续用。',
  },
  connect: {
    id: 'connect',
    name: '连接',
    desc: '你倾向于把人和资源接上，让事情自己动起来。',
  },
}

/** 按规范轴序取特质列表（雷达轴序等）。 */
export const TRAIT_LIST: Trait[] = TRAIT_ORDER.map((id) => TRAITS[id])
