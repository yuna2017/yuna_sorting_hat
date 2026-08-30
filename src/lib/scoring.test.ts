import { describe, expect, it } from 'vitest'
import { DEPT_ORDER, PRIMARY_WEIGHT, SECONDARY_WEIGHT } from '../data/constants'
import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import { RADAR_REFERENCE_MAX } from '../components/RadarChart'
import { QUESTION_BANK } from '../data/questions'
import type { OptionId, QuestionBank, QuizOption } from '../data/questions'
import type { AnswerMap, TieBreakStage } from './scoring'
import {
  emptyScores,
  isComplete,
  maxScorePerDept,
  normalize,
  primaryPickCounts,
  resolveWinner,
  tally,
  toPercent,
} from './scoring'

const OPTION_IDS: readonly OptionId[] = ['a', 'b', 'c', 'd']

/**
 * 基线从题库派生。题数改一次就要追改七处硬编码数字的日子已经过去了。
 */
const QUESTION_COUNT = QUESTION_BANK.questions.length
const MAX_SCORE = QUESTION_COUNT * PRIMARY_WEIGHT

/**
 * 合成题库用的极简选项。特质权重给固定一份 —— 部门计分链路完全不读 traits，
 * 这里只是为了满足类型。
 */
function opt(id: OptionId, p: DeptId, s: DeptId): QuizOption {
  return { id, text: id, whisper: 'w', p, s, traits: { explore: 3 } }
}

/** 全选主推某部门的答案（该部门必然拿到满分）。 */
function answersAllPrimary(bank: QuestionBank, dept: DeptId): AnswerMap {
  const answers: AnswerMap = {}
  for (const q of bank.questions) {
    const option = q.options.find((o) => o.p === dept)
    if (option === undefined) throw new Error(`题 ${q.id} 没有主推 ${dept} 的选项`)
    answers[q.id] = option.id
  }
  return answers
}

describe('结果页文案与图表基线', () => {
  it('招新按钮统一显示为“加入网协招新”', () => {
    for (const dept of DEPT_ORDER) {
      expect(DEPARTMENTS[dept].actions[0]?.label).toBe('加入网协招新')
    }
  })

  it('雷达图基准线最高为 50% 以突出契合度差异', () => {
    expect(RADAR_REFERENCE_MAX).toBe(0.5)
  })
})

describe('满分与归一化', () => {
  it('单部门满分 = 题数 × 主推权重', () => {
    expect(maxScorePerDept(QUESTION_BANK)).toBe(MAX_SCORE)
  })

  it('全选同一部门 → 该部门满分且 100%', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(QUESTION_BANK, dept)
      const verdict = resolveWinner(QUESTION_BANK, answers)
      expect(verdict.scores[dept], `${dept} 应满分`).toBe(MAX_SCORE)
      expect(verdict.winner, `${dept} 应胜出`).toBe(dept)
      expect(toPercent(verdict.normalized[dept])).toBe(100)
      expect(verdict.tiedWith).toEqual([])
      expect(verdict.tieBreakStage).toBe('none')
    }
  })

  it('归一化除的是单部门满分，不是总分（文档点名的易错点）', () => {
    // 全选主推 dev：dev 拿满分；副推按题目分布散给其他部门，
    // 总分 = 题数 × (主推 + 副推)，恒大于单部门满分。
    const answers = answersAllPrimary(QUESTION_BANK, 'dev')
    const scores = tally(QUESTION_BANK, answers)
    const total = DEPT_ORDER.reduce((sum, d) => sum + scores[d], 0)
    const expectedTotal = QUESTION_BANK.questions.length * (PRIMARY_WEIGHT + SECONDARY_WEIGHT)
    expect(total).toBe(expectedTotal)
    expect(total).toBeGreaterThan(MAX_SCORE)

    const normalized = normalize(scores, maxScorePerDept(QUESTION_BANK))
    // 除满分 → 100%。若错误地除总分，会得到明显偏低的百分比。
    expect(normalized.dev).toBe(1)
    expect(toPercent(normalized.dev)).toBe(100)
    expect(toPercent(MAX_SCORE / total)).not.toBe(100)
  })

  it('空答案 → 全零，且不产生 NaN', () => {
    const scores = tally(QUESTION_BANK, {})
    expect(scores).toEqual(emptyScores())
    const normalized = normalize(scores, maxScorePerDept(QUESTION_BANK))
    for (const dept of DEPT_ORDER) expect(normalized[dept]).toBe(0)
  })

  it('题库为空时归一化不炸（除零保护）', () => {
    const normalized = normalize(emptyScores(), 0)
    for (const dept of DEPT_ORDER) expect(normalized[dept]).toBe(0)
  })
})

describe('手算样例', () => {
  it('q1=a, q2=c 的得分逐项对得上', () => {
    // q1a: dev+3 ops+1 ／ q2c: pr+3 dev+1
    const answers: AnswerMap = { q1: 'a', q2: 'c' }
    expect(tally(QUESTION_BANK, answers)).toEqual({ dev: 4, sec: 0, ops: 1, pr: 3 })
    expect(primaryPickCounts(QUESTION_BANK, answers)).toEqual({
      dev: 1,
      sec: 0,
      ops: 0,
      pr: 1,
    })
    expect(isComplete(QUESTION_BANK, answers)).toBe(false)
  })

  it('非法选项 id 视为未作答，不计分也不抛错', () => {
    const answers = { q1: 'z' } as unknown as AnswerMap
    expect(tally(QUESTION_BANK, answers)).toEqual(emptyScores())
  })
})

describe('并列决胜', () => {
  it('决胜题层：同分同主选次数时由决胜题定胜负', () => {
    // 造一个 2 题的合成题库，两题分别用不同置换，好精确控制并列
    const bank: QuestionBank = {
      version: 1,
      questions: [
        {
          id: 'a1',
          title: 'A',
          scene: 'A',
          options: [
            opt('a', 'dev', 'sec'),
            opt('b', 'sec', 'ops'),
            opt('c', 'ops', 'pr'),
            opt('d', 'pr', 'dev'),
          ],
        },
        {
          id: 'a2',
          title: 'B',
          scene: 'B',
          decider: true,
          options: [
            opt('a', 'dev', 'pr'),
            opt('b', 'sec', 'dev'),
            opt('c', 'ops', 'sec'),
            opt('d', 'pr', 'ops'),
          ],
        },
      ],
    }

    // a1=a → dev+3 sec+1 ／ a2=b → sec+3 dev+1  ⇒ dev 4, sec 4 并列
    const verdict = resolveWinner(bank, { a1: 'a', a2: 'b' })
    expect(verdict.scores).toEqual({ dev: 4, sec: 4, ops: 0, pr: 0 })
    // 主选次数也各为 1，进入决胜题层；决胜题 a2 选的是 b，主推 sec
    expect(verdict.tieBreakStage).toBe('decider-question')
    expect(verdict.winner).toBe('sec')
    expect(verdict.tiedWith).toEqual(['dev'])
  })

  it('固定顺序层：决胜题主推不在并列集合时按 dev>sec>ops>pr', () => {
    const bank: QuestionBank = {
      version: 1,
      questions: [
        {
          id: 'b1',
          title: 'A',
          scene: 'A',
          options: [
            opt('a', 'dev', 'sec'),
            opt('b', 'sec', 'ops'),
            opt('c', 'ops', 'pr'),
            opt('d', 'pr', 'dev'),
          ],
        },
        {
          id: 'b2',
          title: 'B',
          scene: 'B',
          options: [
            opt('a', 'dev', 'pr'),
            opt('b', 'sec', 'dev'),
            opt('c', 'ops', 'sec'),
            opt('d', 'pr', 'ops'),
          ],
        },
        {
          id: 'b3',
          title: 'C',
          scene: 'C',
          decider: true,
          options: [
            opt('a', 'dev', 'sec'),
            opt('b', 'sec', 'ops'),
            opt('c', 'ops', 'pr'),
            opt('d', 'pr', 'dev'),
          ],
        },
      ],
    }

    // b1=a → dev+3 sec+1 ／ b2=b → sec+3 dev+1 ／ b3=c → ops+3 pr+1
    // ⇒ dev 4, sec 4, ops 3, pr 1。dev/sec 并列，主选次数各 1，
    //   决胜题 b3 主推 ops 不在并列集合内 → 回退固定顺序，dev 胜。
    const verdict = resolveWinner(bank, { b1: 'a', b2: 'b', b3: 'c' })
    expect(verdict.scores).toEqual({ dev: 4, sec: 4, ops: 3, pr: 1 })
    expect(verdict.tieBreakStage).toBe('fixed-order')
    expect(verdict.winner).toBe('dev')
  })
})

// ---- 答案空间扫描 ----

/**
 * 扫描上限。4^12 ≈ 1678 万组，逐个跑要几分钟，把整套测试拖成不会有人愿意等的那种。
 * 组合数超过上限时改为固定步长抽样：步长与总数互质，能均匀铺满整个空间，
 * 且与穷举一样零随机 —— 失败永远可以原样复现。
 */
const SCAN_CAP = 1_100_000
const SAMPLE_STRIDE = 7919 // 质数，保证 (i * stride) % total 遍历整个空间

describe('扫描答案组合空间', () => {
  it(
    '零随机、四部门皆可达、冠军恒为最高分',
    { timeout: 180_000 },
    () => {
      const questions = QUESTION_BANK.questions
      const n = questions.length
      const total = 4 ** n
      const exhaustive = total <= SCAN_CAP
      const samples = exhaustive ? total : SCAN_CAP

      // 复用同一个 answers 对象，避免上百万次对象分配。resolveWinner 不修改入参。
      const answers: AnswerMap = {}
      const winnerCounts = emptyScores()
      const stageCounts: Record<TieBreakStage, number> = {
        'none': 0,
        'primary-count': 0,
        'decider-question': 0,
        'fixed-order': 0,
      }
      let tiedAtTop = 0
      let largestTie = 1

      for (let i = 0; i < samples; i++) {
        const combo = exhaustive ? i : (i * SAMPLE_STRIDE) % total
        let rest = combo
        for (let qi = 0; qi < n; qi++) {
          answers[questions[qi]!.id] = OPTION_IDS[rest & 3]!
          rest = Math.floor(rest / 4)
        }

        const verdict = resolveWinner(QUESTION_BANK, answers)

        // 冠军必须真的是最高分之一
        const top = Math.max(...DEPT_ORDER.map((d) => verdict.scores[d]))
        if (verdict.scores[verdict.winner] !== top) {
          throw new Error(
            `组合 ${combo}：冠军 ${verdict.winner} 得分 ` +
              `${verdict.scores[verdict.winner]} ≠ 最高分 ${top}`,
          )
        }

        winnerCounts[verdict.winner]++
        stageCounts[verdict.tieBreakStage]++
        if (verdict.tiedWith.length > 0) {
          tiedAtTop++
          largestTie = Math.max(largestTie, verdict.tiedWith.length + 1)
        }
      }

      const sum = DEPT_ORDER.reduce((acc, d) => acc + winnerCounts[d], 0)
      expect(sum).toBe(samples)

      // 四个部门都真的能被抽到
      for (const dept of DEPT_ORDER) {
        expect(winnerCounts[dept], `${dept} 不可达！`).toBeGreaterThan(0)
      }

      const pct = (x: number) => `${((x / samples) * 100).toFixed(2)}%`
      console.log(
        [
          `\n  ${exhaustive ? '穷举' : '抽样'} ${samples.toLocaleString()} / ${total.toLocaleString()} 种组合：`,
          `    冠军分布  ` +
            DEPT_ORDER.map((d) => `${d} ${pct(winnerCounts[d])}`).join('  '),
          `    顶部并列  ${tiedAtTop.toLocaleString()} 次（${pct(tiedAtTop)}），最大并列 ${largestTie} 个部门`,
          `    决胜层级  none ${pct(stageCounts.none)}` +
            `  主选次数 ${pct(stageCounts['primary-count'])}` +
            `  决胜题 ${pct(stageCounts['decider-question'])}` +
            `  固定顺序 ${pct(stageCounts['fixed-order'])}`,
        ].join('\n'),
      )

      // 并列绝非罕见 —— 决胜路径是真会被走到的
      expect(tiedAtTop).toBeGreaterThan(0)
      const tieBreaks =
        stageCounts['primary-count'] +
        stageCounts['decider-question'] +
        stageCounts['fixed-order']
      expect(tieBreaks).toBeGreaterThan(0)
    },
  )

  it('同一份答案重复求解结果完全一致（确定性）', () => {
    const questions = QUESTION_BANK.questions
    const n = questions.length
    const total = 4 ** n
    const answers: AnswerMap = {}

    // 每隔 997 个组合抽一份做二次求解比对
    for (let combo = 0; combo < total; combo += 997) {
      let rest = combo
      for (let qi = 0; qi < n; qi++) {
        answers[questions[qi]!.id] = OPTION_IDS[rest & 3]!
        rest = Math.floor(rest / 4)
      }
      const first = resolveWinner(QUESTION_BANK, answers)
      const second = resolveWinner(QUESTION_BANK, answers)
      expect(second).toEqual(first)
    }
  })
})
