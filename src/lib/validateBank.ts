import type { DeptId } from '../data/constants'
import { DEPT_ORDER } from '../data/constants'
import type { QuestionBank } from '../data/questions'

export interface Violation {
  questionId: string
  rule: string
  detail: string
}

const EXPECTED_OPTION_COUNT = DEPT_ORDER.length

/**
 * 校验题库不变量。返回空数组表示全部通过。
 *
 * 题目文档的三条硬约束（破一条，结果页就会失衡）：
 *   1. 每题恰好 4 个选项，选项 id 不重复；
 *   2. 4 个主推 p 恰好覆盖四个部门 —— 保证每题对每个部门都有一条 +3 路径；
 *   3. 4 个副推 s 也恰好覆盖四个部门，且没有 p === s
 *      —— 即无固定点置换（derangement）。
 * 满足后，每个部门理论满分自动等于 题数 × PRIMARY_WEIGHT。
 */
export function validateQuestionBank(bank: QuestionBank): Violation[] {
  const violations: Violation[] = []
  const seenQuestionIds = new Set<string>()

  for (const q of bank.questions) {
    const at = (rule: string, detail: string) =>
      violations.push({ questionId: q.id, rule, detail })

    if (seenQuestionIds.has(q.id)) {
      at('unique-question-id', `题目 id「${q.id}」重复`)
    }
    seenQuestionIds.add(q.id)

    // 1. 选项数量与 id 唯一性
    if (q.options.length !== EXPECTED_OPTION_COUNT) {
      at(
        'option-count',
        `应有 ${EXPECTED_OPTION_COUNT} 个选项，实际 ${q.options.length} 个`,
      )
      // 数量不对时后面的覆盖性检查没有意义，跳过本题剩余规则
      continue
    }

    const optionIds = new Set(q.options.map((o) => o.id))
    if (optionIds.size !== q.options.length) {
      at('unique-option-id', `选项 id 有重复：${q.options.map((o) => o.id).join(', ')}`)
    }

    // 2. 主推覆盖全部四个部门
    const primaries = q.options.map((o) => o.p)
    const missingPrimary = DEPT_ORDER.filter((d) => !primaries.includes(d))
    if (missingPrimary.length > 0) {
      at(
        'primary-covers-all-depts',
        `主推缺少部门 [${missingPrimary.join(', ')}]，实际主推为 [${primaries.join(', ')}]`,
      )
    }

    // 3a. 无固定点：p !== s
    for (const o of q.options) {
      if (o.p === o.s) {
        at('no-fixed-point', `选项 ${o.id} 的主推与副推同为「${o.p}」`)
      }
    }

    // 3b. 副推覆盖全部四个部门（与 3a 合起来即无固定点置换）
    const secondaries = q.options.map((o) => o.s)
    const missingSecondary = DEPT_ORDER.filter((d) => !secondaries.includes(d))
    if (missingSecondary.length > 0) {
      at(
        'secondary-is-derangement',
        `副推缺少部门 [${missingSecondary.join(', ')}]，实际副推为 [${secondaries.join(', ')}]` +
          '（四个副推必须各指一次，构成无固定点置换）',
      )
    }
  }

  // 决胜题：最多一个显式标记。缺省回落到最后一题，因此零个也是合法的。
  const deciders = bank.questions.filter((q) => q.decider)
  if (deciders.length > 1) {
    violations.push({
      questionId: deciders.map((q) => q.id).join('+'),
      rule: 'single-decider',
      detail: `只能有一道决胜题，实际标记了 ${deciders.length} 道`,
    })
  }

  return violations
}

/** 把违规列表格式化成可读的多行文本。 */
export function formatViolations(violations: Violation[]): string {
  return violations.map((v) => `  [${v.questionId}] ${v.rule}: ${v.detail}`).join('\n')
}

/**
 * 开发期自检：题库或文案有问题时在控制台大声报错。
 * 权威闸门是 vitest（见 scoring.test.ts / validateBank.test.ts）——
 * 这里是为了让「改了题但没跑测试」的人也能立刻看到。
 */
export function assertBankInDev(bank: QuestionBank, unfilledCopy: string[] = []): void {
  if (!import.meta.env.DEV) return

  const violations = validateQuestionBank(bank)
  if (violations.length > 0) {
    console.error(
      `[分部帽] 题库不变量校验失败（${violations.length} 项）—— 结果页会失衡，请修复：\n` +
        formatViolations(violations),
    )
  }
  if (unfilledCopy.length > 0) {
    console.warn(
      `[分部帽] 结果页还有 ${unfilledCopy.length} 处事实文案待社团填写：\n` +
        unfilledCopy.map((m) => `  · ${m}`).join('\n'),
    )
  }
}

/** 供测试与调试：确认部门 id 集合与 DEPT_ORDER 一致。 */
export function isDeptId(value: string): value is DeptId {
  return (DEPT_ORDER as readonly string[]).includes(value)
}
