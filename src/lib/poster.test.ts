import { describe, expect, it, vi } from 'vitest'
import { DEPT_ORDER, POSTER_COLORS } from '../data/constants'
import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import { TRAIT_LIST } from '../data/traits'
import { drawBank } from './drawQuestions'
import { resolveWinner } from './scoring'
import type { AnswerMap } from './scoring'
import { POSTER_NICKNAME_MAX, buildPosterData } from './poster'

const SEED = 1
const BANK = drawBank(SEED)

/** 全选主推某部门的答案，用来稳定拿到指定 winner。 */
function answersAllPrimary(dept: DeptId): AnswerMap {
  const answers: AnswerMap = {}
  for (const q of BANK.questions) {
    const option = q.options.find((o) => o.p === dept)
    if (option === undefined) throw new Error(`题 ${q.id} 没有主推 ${dept} 的选项`)
    answers[q.id] = option.id
  }
  return answers
}

function posterFor(dept: DeptId, nickname: string | null = null) {
  const answers = answersAllPrimary(dept)
  return buildPosterData(BANK, SEED, resolveWinner(BANK, answers), answers, nickname)
}

describe('buildPosterData', () => {
  it('不含任何能反推答案的字段 —— 海报会被无限转发', () => {
    const data = posterFor('dev')
    const allowed = new Set([
      'deptId',
      'deptName',
      'latinName',
      'slogan',
      'tagline',
      'keywords',
      'identityName',
      'traitBars',
      'dominantTraitName',
      'tiedTraitNames',
      'nickname',
      'campaignLabel',
      'shareUrl',
    ])
    expect(Object.keys(data).filter((k) => !allowed.has(k))).toEqual([])

    // 兜底：整个对象序列化后不应出现题目 id 或答案键
    const serialized = JSON.stringify({ ...data, shareUrl: null })
    for (const q of BANK.questions) {
      expect(serialized).not.toContain(q.id)
    }
  })

  it('四个部门都给出对应的部门信息与行为身份', () => {
    for (const dept of DEPT_ORDER) {
      const data = posterFor(dept)
      expect(data.deptId).toBe(dept)
      expect(data.deptName).toBe(DEPARTMENTS[dept].name)
      expect(data.latinName).toBe(DEPARTMENTS[dept].latinName)
      expect(data.keywords).toEqual(DEPARTMENTS[dept].keywords)
      expect(data.identityName).not.toBe('')
    }
  })

  it('倾向横条按 TRAIT_ORDER 给全五根，ratio 都在 0～1', () => {
    const data = posterFor('sec')
    expect(data.traitBars.map((b) => b.name)).toEqual(TRAIT_LIST.map((t) => t.name))
    data.traitBars.forEach((bar) => {
      expect(bar.ratio).toBeGreaterThanOrEqual(0)
      expect(bar.ratio).toBeLessThanOrEqual(1)
    })
  })

  it('主导倾向必然是 ratio 最高的那根', () => {
    const data = posterFor('ops')
    const top = Math.max(...data.traitBars.map((b) => b.ratio))
    const dominant = data.traitBars.find((b) => b.name === data.dominantTraitName)
    expect(dominant?.ratio).toBeCloseTo(top)
  })

  it('并列的倾向不把主导倾向自己算进去', () => {
    const data = posterFor('pr')
    expect(data.tiedTraitNames).not.toContain(data.dominantTraitName)
  })

  it('昵称留空或纯空白都归一化为 null，整行不占版面', () => {
    expect(posterFor('dev', null).nickname).toBeNull()
    expect(posterFor('dev', '').nickname).toBeNull()
    expect(posterFor('dev', '   ').nickname).toBeNull()
  })

  it('昵称去首尾空白并按上限截断', () => {
    expect(posterFor('dev', '  阿岩  ').nickname).toBe('阿岩')
    const long = '一二三四五六七八九十十一十二十三'
    expect(posterFor('dev', long).nickname).toHaveLength(POSTER_NICKNAME_MAX)
  })

  it('posterOrigin 为 null 时不给二维码链接', async () => {
    // 默认配置就是 null —— 题库冻结前不允许把结果链接印进图片
    expect(posterFor('dev').shareUrl).toBeNull()
  })

  it('posterOrigin 就绪后二维码指向该固定域名，且带版本与种子', async () => {
    vi.resetModules()
    vi.doMock('../data/campaign', () => ({
      CAMPAIGN: {
        year: '2026',
        label: '2026 招新季',
        status: 'open',
        publicJoinUrl: 'https://example.org/join',
        siteUrl: 'https://example.org',
        bankVersion: BANK.version,
        releaseDate: '2026-08-30',
        posterOrigin: 'https://yuna.example.org',
        posterPathname: '/yuna_sorting_hat/',
      },
    }))

    const { buildPosterData: build } = await import('./poster')
    const answers = answersAllPrimary('dev')
    const data = build(BANK, SEED, resolveWinner(BANK, answers), answers, null)

    expect(data.shareUrl).toContain('https://yuna.example.org/yuna_sorting_hat/')
    expect(data.shareUrl).toContain(`v=${BANK.version}`)
    expect(data.shareUrl).toContain(`s=${SEED.toString(36)}`)

    vi.doUnmock('../data/campaign')
    vi.resetModules()
  })
})

describe('POSTER_COLORS', () => {
  it('部门色与 DEPT_ORDER 同步，缺一个 canvas 就会画出透明块', () => {
    expect(Object.keys(POSTER_COLORS.dept).sort()).toEqual([...DEPT_ORDER].sort())
  })

  it('全部是六位十六进制色值 —— canvas 拼 alpha 后缀时依赖这个格式', () => {
    const values = [
      ...Object.values(POSTER_COLORS.dept),
      POSTER_COLORS.gold,
      POSTER_COLORS.goldSoft,
      POSTER_COLORS.parchment,
      POSTER_COLORS.parchmentDim,
      POSTER_COLORS.night900,
      POSTER_COLORS.night800,
      POSTER_COLORS.night600,
    ]
    values.forEach((value) => expect(value).toMatch(/^#[0-9a-f]{6}$/))
  })
})
