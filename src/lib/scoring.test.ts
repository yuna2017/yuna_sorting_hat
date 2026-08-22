import { describe, expect, it } from 'vitest'
import { DEPT_ORDER, PRIMARY_WEIGHT } from '../data/constants'
import type { DeptId } from '../data/constants'
import { QUESTION_BANK } from '../data/questions'
import type { OptionId, QuestionBank } from '../data/questions'
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

describe('满分与归一化', () => {
  it('单部门满分 = 题数 × 3 = 30', () => {
    expect(maxScorePerDept(QUESTION_BANK)).toBe(30)
    expect(maxScorePerDept(QUESTION_BANK)).toBe(
      QUESTION_BANK.questions.length * PRIMARY_WEIGHT,
    )
  })

  it('全选同一部门 → 该部门 30 分且 100%', () => {
    for (const dept of DEPT_ORDER) {
      const answers = answersAllPrimary(QUESTION_BANK, dept)
      const verdict = resolveWinner(QUESTION_BANK, answers)
      expect(verdict.scores[dept], `${dept} 应满分`).toBe(30)
      expect(verdict.winner, `${dept} 应胜出`).toBe(dept)
      expect(toPercent(verdict.normalized[dept])).toBe(100)
      expect(verdict.tiedWith).toEqual([])
      expect(verdict.tieBreakStage).toBe('none')
    }
  })

  it('归一化除的是单部门满分，不是总分（文档点名的易错点）', () => {
    // 全选主推 dev：dev 拿 30；副推按题目分布散给其他部门，总分 = 10×(3+1) = 40
    const answers = answersAllPrimary(QUESTION_BANK, 'dev')
    const scores = tally(QUESTION_BANK, answers)
    const total = DEPT_ORDER.reduce((sum, d) => sum + scores[d], 0)
    expect(total).toBe(40)

    const normalized = normalize(scores, maxScorePerDept(QUESTION_BANK))
    // 除满分 30 → 100%。若错误地除总分 40，会得到 75%。
    expect(normalized.dev).toBe(1)
    expect(toPercent(normalized.dev)).toBe(100)
    expect(toPercent(normalized.dev)).not.toBe(75)
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
    // q1a: dev+3 sec+1 ／ q2c: dev+3 ops+1
    const answers: AnswerMap = { q1: 'a', q2: 'c' }
    expect(tally(QUESTION_BANK, answers)).toEqual({ dev: 6, sec: 1, ops: 1, pr: 0 })
    expect(primaryPickCounts(QUESTION_BANK, answers)).toEqual({
      dev: 2,
      sec: 0,
      ops: 0,
      pr: 0,
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
      questions: [
        {
          id: 'a1',
          title: 'A',
          scene: 'A',
          options: [
            { id: 'a', text: 'a', whisper: 'w', p: 'dev', s: 'sec' },
            { id: 'b', text: 'b', whisper: 'w', p: 'sec', s: 'ops' },
            { id: 'c', text: 'c', whisper: 'w', p: 'ops', s: 'pr' },
            { id: 'd', text: 'd', whisper: 'w', p: 'pr', s: 'dev' },
          ],
        },
        {
          id: 'a2',
          title: 'B',
          scene: 'B',
          decider: true,
          options: [
            { id: 'a', text: 'a', whisper: 'w', p: 'dev', s: 'pr' },
            { id: 'b', text: 'b', whisper: 'w', p: 'sec', s: 'dev' },
            { id: 'c', text: 'c', whisper: 'w', p: 'ops', s: 'sec' },
            { id: 'd', text: 'd', whisper: 'w', p: 'pr', s: 'ops' },
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
      questions: [
        {
          id: 'b1',
          title: 'A',
          scene: 'A',
          options: [
            { id: 'a', text: 'a', whisper: 'w', p: 'dev', s: 'sec' },
            { id: 'b', text: 'b', whisper: 'w', p: 'sec', s: 'ops' },
            { id: 'c', text: 'c', whisper: 'w', p: 'ops', s: 'pr' },
            { id: 'd', text: 'd', whisper: 'w', p: 'pr', s: 'dev' },
          ],
        },
        {
          id: 'b2',
          title: 'B',
          scene: 'B',
          options: [
            { id: 'a', text: 'a', whisper: 'w', p: 'dev', s: 'pr' },
            { id: 'b', text: 'b', whisper: 'w', p: 'sec', s: 'dev' },
            { id: 'c', text: 'c', whisper: 'w', p: 'ops', s: 'sec' },
            { id: 'd', text: 'd', whisper: 'w', p: 'pr', s: 'ops' },
          ],
        },
        {
          id: 'b3',
          title: 'C',
          scene: 'C',
          decider: true,
          options: [
            { id: 'a', text: 'a', whisper: 'w', p: 'dev', s: 'sec' },
            { id: 'b', text: 'b', whisper: 'w', p: 'sec', s: 'ops' },
            { id: 'c', text: 'c', whisper: 'w', p: 'ops', s: 'pr' },
            { id: 'd', text: 'd', whisper: 'w', p: 'pr', s: 'dev' },
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

// ---- 穷举扫描：4^10 = 1,048,576 种答案组合 ----

describe('穷举扫描全部答案组合', () => {
  it(
    '零随机、四部门皆可达、冠军恒为最高分',
    { timeout: 180_000 },
    () => {
      const questions = QUESTION_BANK.questions
      const n = questions.length
      const total = 4 ** n

      // 复用同一个 answers 对象，避免 100 万次对象分配。resolveWinner 不修改入参。
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

      for (let combo = 0; combo < total; combo++) {
        let rest = combo
        for (let qi = 0; qi < n; qi++) {
          answers[questions[qi]!.id] = OPTION_IDS[rest & 3]!
          rest >>>= 2
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
      expect(sum).toBe(total)

      // 四个部门都真的能被抽到
      for (const dept of DEPT_ORDER) {
        expect(winnerCounts[dept], `${dept} 不可达！`).toBeGreaterThan(0)
      }

      const pct = (x: number) => `${((x / total) * 100).toFixed(2)}%`
      console.log(
        [
          `\n  穷举 ${total.toLocaleString()} 种组合：`,
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
      expect(stageCounts['primary-count']).toBeGreaterThan(0)
    },
  )

  it('同一份答案重复求解结果完全一致（确定性）', () => {
    const questions = QUESTION_BANK.questions
    const n = questions.length
    const answers: AnswerMap = {}

    // 每隔 997 个组合抽一份做二次求解比对
    for (let combo = 0; combo < 4 ** n; combo += 997) {
      let rest = combo
      for (let qi = 0; qi < n; qi++) {
        answers[questions[qi]!.id] = OPTION_IDS[rest & 3]!
        rest >>>= 2
      }
      const first = resolveWinner(QUESTION_BANK, answers)
      const second = resolveWinner(QUESTION_BANK, answers)
      expect(second).toEqual(first)
    }
  })
})
