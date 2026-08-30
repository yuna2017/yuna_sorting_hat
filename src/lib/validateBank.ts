import type { DeptId, TraitId } from '../data/constants'
import {
  DEPT_ORDER,
  OPTION_TRAIT_BUDGET,
  TRAIT_ORDER,
  TRAIT_WEIGHT_MAX,
  TRAIT_WEIGHT_MIN,
} from '../data/constants'
import { DEPT_LIST } from '../data/departments'
import type { Question, QuestionBank, QuizOption } from '../data/questions'

export interface Violation {
  questionId: string
  rule: string
  detail: string
}

const EXPECTED_OPTION_COUNT = DEPT_ORDER.length

/**
 * 字数区间，来自 docs/题目填写规范.md。
 * 本轮从「注释里的规范」升级为可执行校验 —— 写在注释里的规范没人会跑。
 */
const LENGTH_LIMITS = {
  title: [4, 10],
  scene: [30, 60],
  text: [12, 28],
  whisper: [15, 30],
  detail: [35, 60],
} as const

/**
 * 每个特质至少要在这个比例的题目里出现，否则该轴在雷达图上永远塌陷。
 */
const TRAIT_COVERAGE_RATIO = 0.5

/** 每题四个选项合计至少要覆盖这么多不同特质，否则这题分不出画像。 */
const MIN_TRAITS_PER_QUESTION = 4

/**
 * 隐私模式黑名单。题面是公开内容，出现真实联系方式会随 GitHub Pages 一起公开
 * 并进入 Git 历史，事后清理成本极高。见 docs/注意事项.md。
 */
const PRIVACY_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: '手机号', re: /1[3-9]\d{9}/ },
  { name: '邮箱', re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { name: 'QQ/微信号', re: /(QQ|qq|微信|wechat|WeChat)\s*[:：]?\s*\w{5,}/ },
  { name: '学号', re: /(学号|工号)\s*[:：]?\s*\d{6,}/ },
  { name: '内网地址', re: /\b(10|127|192\.168|172\.(1[6-9]|2\d|3[01]))\.[\d.]+/ },
  { name: 'URL', re: /https?:\/\//i },
]

/** 去掉低语外层的「」再计数 —— 引号是格式要求，不该占字数预算。 */
function copyLength(value: string): number {
  return value.replace(/[「」]/g, '').trim().length
}

/**
 * 禁用词表：部门名、拉丁名、部门关键词。
 * 题面里出现任何一个，等于把答案映射直接印在页面上，测试就没意义了。
 */
function forbiddenTerms(): string[] {
  return DEPT_LIST.flatMap((d) => [d.name, d.latinName, ...d.keywords])
}

/** 一道题里所有需要过文案红线的字段。 */
function copyFields(q: Question): Array<{ label: string; value: string }> {
  const fields = [
    { label: 'title', value: q.title },
    { label: 'scene', value: q.scene },
  ]
  for (const o of q.options) {
    fields.push({ label: `${o.id}.text`, value: o.text })
    fields.push({ label: `${o.id}.whisper`, value: o.whisper })
    if (o.detail !== undefined) fields.push({ label: `${o.id}.detail`, value: o.detail })
  }
  return fields
}

function traitWeights(option: QuizOption): Array<[TraitId, number]> {
  return TRAIT_ORDER.filter((t) => option.traits[t] !== undefined).map(
    (t) => [t, option.traits[t] as number] as [TraitId, number],
  )
}

/**
 * 校验题库不变量。返回空数组表示全部通过。
 *
 * 题目文档的三条硬约束（破一条，结果页就会失衡）：
 *   1. 每题恰好 4 个选项，选项 id 不重复；
 *   2. 4 个主推 p 恰好覆盖四个部门 —— 保证每题对每个部门都有一条 +3 路径；
 *   3. 4 个副推 s 也恰好覆盖四个部门，且没有 p === s
 *      —— 即无固定点置换（derangement）。
 * 满足后，每个部门理论满分自动等于 题数 × PRIMARY_WEIGHT。
 *
 * 特质轨（docs/特质体系.md §7）另有四条：权重和恒为 3、权重取值 1～3、
 * 每题特质铺开度、全库特质覆盖率。加上文案字数、禁用词与隐私模式共 11 类规则。
 */
export function validateQuestionBank(bank: QuestionBank): Violation[] {
  const violations: Violation[] = []
  const seenQuestionIds = new Set<string>()
  const forbidden = forbiddenTerms()
  /** 每个特质出现在多少道题里。用于全库覆盖率检查。 */
  const traitQuestionCount = {} as Record<TraitId, number>
  for (const trait of TRAIT_ORDER) traitQuestionCount[trait] = 0

  for (const q of bank.questions) {
    const at = (rule: string, detail: string) =>
      violations.push({ questionId: q.id, rule, detail })

    if (seenQuestionIds.has(q.id)) {
      at('unique-question-id', `题目 id「${q.id}」重复`)
    }
    seenQuestionIds.add(q.id)

    // 文案红线：字数、禁用词、隐私模式。选项数量不对也要查，坏文案不该被结构问题遮住。
    for (const field of copyFields(q)) {
      const kind = field.label.split('.').pop() as keyof typeof LENGTH_LIMITS
      const limit = LENGTH_LIMITS[kind]
      if (limit !== undefined) {
        const len = copyLength(field.value)
        if (len < limit[0] || len > limit[1]) {
          at(
            'option-text-length',
            `${field.label} 应为 ${limit[0]}～${limit[1]} 字，实际 ${len} 字`,
          )
        }
      }

      const hitWords = forbidden.filter((word) => field.value.includes(word))
      if (hitWords.length > 0) {
        at('forbidden-terms', `${field.label} 出现禁用词 [${hitWords.join('、')}]`)
      }

      for (const pattern of PRIVACY_PATTERNS) {
        if (pattern.re.test(field.value)) {
          at('privacy-terms', `${field.label} 疑似含${pattern.name}，题面是公开内容`)
        }
      }
    }

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

    // 4. 特质权重预算与取值范围
    for (const o of q.options) {
      const weights = traitWeights(o)
      const sum = weights.reduce((acc, [, w]) => acc + w, 0)
      if (sum !== OPTION_TRAIT_BUDGET) {
        at(
          'trait-weight-sum',
          `选项 ${o.id} 特质权重和为 ${sum}，应恒为 ${OPTION_TRAIT_BUDGET}` +
            '（四个选项对画像的影响力必须相等）',
        )
      }
      for (const [trait, weight] of weights) {
        if (
          !Number.isInteger(weight) ||
          weight < TRAIT_WEIGHT_MIN ||
          weight > TRAIT_WEIGHT_MAX
        ) {
          at(
            'trait-weight-range',
            `选项 ${o.id} 的 ${trait} 权重为 ${weight}，` +
              `应为 ${TRAIT_WEIGHT_MIN}～${TRAIT_WEIGHT_MAX} 的整数（权重 0 请省略该键）`,
          )
        }
      }
    }

    // 5. 每题特质铺开度
    const traitsInQuestion = new Set<TraitId>()
    for (const o of q.options) {
      for (const [trait] of traitWeights(o)) traitsInQuestion.add(trait)
    }
    if (traitsInQuestion.size < MIN_TRAITS_PER_QUESTION) {
      at(
        'trait-question-spread',
        `四个选项合计只覆盖 ${traitsInQuestion.size} 个特质，` +
          `至少需要 ${MIN_TRAITS_PER_QUESTION} 个（否则这题分不出画像）`,
      )
    }
    for (const trait of traitsInQuestion) traitQuestionCount[trait] += 1
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

  // 6. 全库特质覆盖率：某个特质出现得太少，它在雷达图上就永远是塌的。
  const required = Math.ceil(bank.questions.length * TRAIT_COVERAGE_RATIO)
  for (const trait of TRAIT_ORDER) {
    if (bank.questions.length > 0 && traitQuestionCount[trait] < required) {
      violations.push({
        questionId: '(bank)',
        rule: 'trait-bank-coverage',
        detail:
          `特质「${trait}」只出现在 ${traitQuestionCount[trait]} 道题中，` +
          `至少需要 ${required} 道（否则该雷达轴永远塌陷）`,
      })
    }
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
