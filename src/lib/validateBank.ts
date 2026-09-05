import type { DeptId, TraitId } from '../data/constants'
import {
  DEPT_ORDER,
  OPTION_TRAIT_BUDGET,
  TRAIT_ORDER,
  TRAIT_WEIGHT_MAX,
  TRAIT_WEIGHT_MIN,
} from '../data/constants'
import { DEPT_LIST } from '../data/departments'
import type {
  Question,
  QuestionBank,
  QuestionPool,
  QuestionSlot,
  QuizOption,
} from '../data/questions'
import { drawQuestions } from './drawQuestions'

export interface Violation {
  questionId: string
  rule: string
  detail: string
}

const EXPECTED_OPTION_COUNT = DEPT_ORDER.length

/**
 * 字数区间，来自 docs/题库规范.md §6。
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
 * 抽题子集的抽样上限。
 *
 * 题池的组合数 = 各槽候选数之积（12 槽 × 2 候选 = 4096 种）。数量不大时**穷举**，
 * 因为「任意一次抽题都不能失衡」是硬要求，抽样过的组合等于没校验过。
 * 将来候选数增加导致组合爆炸时退化为定种子抽样 —— 抽样是妥协，不是设计。
 */
const MAX_SUBSET_ENUMERATION = 4096

/** 组合数超过穷举上限时改为抽样，抽这么多次。种子固定，保证测试可复现。 */
const SUBSET_SAMPLE_COUNT = 512

/**
 * 隐私模式黑名单。题面是公开内容，出现真实联系方式会随 GitHub Pages 一起公开
 * 并进入 Git 历史，事后清理成本极高。见 docs/设计文档.md §1。
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

/** 这道题的四个选项合计覆盖了哪些特质。 */
function traitsOfQuestion(q: Question): Set<TraitId> {
  const traits = new Set<TraitId>()
  for (const o of q.options) {
    for (const [trait] of traitWeights(o)) traits.add(trait)
  }
  return traits
}

/**
 * 单题不变量。题池校验与抽题子集校验共用这一份实现 ——
 * 同一条规则写两遍，迟早会有一遍忘了改。
 *
 * 题目文档的三条硬约束（破一条，结果页就会失衡）：
 *   1. 恰好 4 个选项，选项 id 不重复；
 *   2. 4 个主推 p 恰好覆盖四个部门 —— 保证每题对每个部门都有一条 +3 路径；
 *   3. 4 个副推 s 也恰好覆盖四个部门，且没有 p === s，即无固定点置换（derangement）。
 * 满足后，每个部门理论满分自动等于 抽题数 × PRIMARY_WEIGHT。
 *
 * 特质轨（docs/题库规范.md §4）另有：权重和恒为 3、权重取值 1～3、每题特质铺开度。
 * 加上文案字数、禁用词与隐私模式。
 */
function validateQuestion(q: Question, forbidden: readonly string[]): Violation[] {
  const violations: Violation[] = []
  const at = (rule: string, detail: string) => violations.push({ questionId: q.id, rule, detail })

  // 文案红线：字数、禁用词、隐私模式。选项数量不对也要查，坏文案不该被结构问题遮住。
  for (const field of copyFields(q)) {
    const kind = field.label.split('.').pop() as keyof typeof LENGTH_LIMITS
    const limit = LENGTH_LIMITS[kind]
    if (limit !== undefined) {
      const len = copyLength(field.value)
      if (len < limit[0] || len > limit[1]) {
        at('option-text-length', `${field.label} 应为 ${limit[0]}～${limit[1]} 字，实际 ${len} 字`)
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
    at('option-count', `应有 ${EXPECTED_OPTION_COUNT} 个选项，实际 ${q.options.length} 个`)
    // 数量不对时后面的覆盖性检查没有意义，跳过本题剩余规则
    return violations
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
      if (!Number.isInteger(weight) || weight < TRAIT_WEIGHT_MIN || weight > TRAIT_WEIGHT_MAX) {
        at(
          'trait-weight-range',
          `选项 ${o.id} 的 ${trait} 权重为 ${weight}，` +
            `应为 ${TRAIT_WEIGHT_MIN}～${TRAIT_WEIGHT_MAX} 的整数（权重 0 请省略该键）`,
        )
      }
    }
  }

  // 5. 每题特质铺开度
  const traitsInQuestion = traitsOfQuestion(q)
  if (traitsInQuestion.size < MIN_TRAITS_PER_QUESTION) {
    at(
      'trait-question-spread',
      `四个选项合计只覆盖 ${traitsInQuestion.size} 个特质，` +
        `至少需要 ${MIN_TRAITS_PER_QUESTION} 个（否则这题分不出画像）`,
    )
  }

  return violations
}

/**
 * 校验一次测评实际用到的题目序列（= drawQuestions 的输出）。
 *
 * 这一层管的是「这 12 道题凑在一起是否平衡」：id 唯一、恰一道决胜题、
 * 每个特质出现得够频繁。单题规则由 validateQuestion 负责。
 *
 * 注意分母：满分与特质覆盖率都按**这一场的题数**算，不是题池总量。
 * 拿 24 道题的分母去除 12 道题的得分，所有特质会集体腰斩。
 */
export function validateQuestionBank(bank: QuestionBank): Violation[] {
  const violations: Violation[] = []
  const seenQuestionIds = new Set<string>()
  const forbidden = forbiddenTerms()
  /** 每个特质出现在多少道题里。用于覆盖率检查。 */
  const traitQuestionCount = {} as Record<TraitId, number>
  for (const trait of TRAIT_ORDER) traitQuestionCount[trait] = 0

  for (const q of bank.questions) {
    if (seenQuestionIds.has(q.id)) {
      violations.push({
        questionId: q.id,
        rule: 'unique-question-id',
        detail: `题目 id「${q.id}」重复`,
      })
    }
    seenQuestionIds.add(q.id)

    violations.push(...validateQuestion(q, forbidden))

    if (q.options.length !== EXPECTED_OPTION_COUNT) continue
    for (const trait of traitsOfQuestion(q)) traitQuestionCount[trait] += 1
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

  // 特质覆盖率：某个特质出现得太少，它在雷达图上就永远是塌的。
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

/** 槽位内部结构：候选可互换性。 */
function validateSlot(slot: QuestionSlot, expectedCandidateCount: number): Violation[] {
  const violations: Violation[] = []
  const at = (rule: string, detail: string) =>
    violations.push({ questionId: slot.id, rule, detail })

  if (slot.candidates.length === 0) {
    at('slot-not-empty', '槽位没有候选题，抽题会少一道')
    return violations
  }

  // 各槽候选数必须一致 —— 否则候选多的槽被抽中的概率被摊薄，
  // 等于悄悄给某几道题降权，而这件事在题面上完全看不出来。
  if (slot.candidates.length !== expectedCandidateCount) {
    at(
      'slot-candidate-count',
      `有 ${slot.candidates.length} 道候选，其他槽是 ${expectedCandidateCount} 道` +
        '（各槽候选数必须一致，否则每道题被抽中的概率不等）',
    )
  }

  // 决胜身份是槽位属性，不能靠候选题各自标记 —— 抽到没标的那道，决胜局就悄悄消失了。
  for (const q of slot.candidates) {
    const shouldBeDecider = slot.kind === 'decider'
    if (shouldBeDecider && q.decider !== true) {
      at('slot-decider-consistent', `决胜槽的候选「${q.id}」没有标 decider: true`)
    }
    if (!shouldBeDecider && q.decider === true) {
      at('slot-decider-consistent', `非决胜槽的候选「${q.id}」标了 decider: true`)
    }
  }

  // 同槽候选必须共用对比轴：抽到哪一道不能改变这一题在观察什么。
  if (slot.axis !== null) {
    const [first, second] = slot.axis
    for (const q of slot.candidates) {
      const traits = traitsOfQuestion(q)
      const missing = [first, second].filter((t) => !traits.has(t))
      if (missing.length > 0) {
        at(
          'slot-axis-consistent',
          `候选「${q.id}」没有覆盖本槽对比轴上的 [${missing.join('、')}]` +
            `（本槽轴为 ${first} ↔ ${second}）`,
        )
      }
    }
  }

  return violations
}

/** 枚举题池的所有抽题组合数。 */
function combinationCount(pool: QuestionPool): number {
  return pool.slots.reduce((acc, slot) => acc * Math.max(1, slot.candidates.length), 1)
}

/** 按下标向量取出一个确定的抽题组合。用于穷举校验。 */
function subsetAt(pool: QuestionPool, combinationIndex: number): Question[] {
  const questions: Question[] = []
  let rest = combinationIndex
  for (const slot of pool.slots) {
    const size = Math.max(1, slot.candidates.length)
    const pick = slot.candidates[rest % size]
    rest = Math.floor(rest / size)
    if (pick !== undefined) questions.push(pick)
  }
  return questions
}

/**
 * 校验题池。
 *
 * 分三层，缺一层都会漏掉真实存在的失衡：
 *   1. 单题：每道候选题各自满足题目文档的硬约束；
 *   2. 槽位：候选数一致、决胜标记与槽类型一致、候选共用对比轴 —— 即「候选可互换」；
 *   3. **抽题子集**：任意一次抽题结果都必须是一份合法题库。
 *
 * 第 3 层是槽位化引入的新风险：每道题单独合法，不代表凑在一起也平衡 ——
 * 比如两个槽的第 2 候选都恰好不含「创造」，同时抽中就会让那条雷达轴塌陷。
 * 组合数不大时穷举，因为这是硬要求，抽样过的组合等于没校验过。
 */
export function validateQuestionPool(pool: QuestionPool): Violation[] {
  const violations: Violation[] = []
  const forbidden = forbiddenTerms()

  if (pool.slots.length === 0) {
    return [{ questionId: '(pool)', rule: 'pool-not-empty', detail: '题池没有任何槽位' }]
  }

  // 1. 单题 + 全池 id 唯一性。id 是答案表的键，撞了会让两道题共享一个答案。
  const seenIds = new Set<string>()
  for (const slot of pool.slots) {
    for (const q of slot.candidates) {
      if (seenIds.has(q.id)) {
        violations.push({
          questionId: q.id,
          rule: 'unique-question-id',
          detail: `题目 id「${q.id}」在池中重复`,
        })
      }
      seenIds.add(q.id)
      violations.push(...validateQuestion(q, forbidden))
    }
  }

  // 槽位 id 唯一 —— 它是 §5 矩阵的行号，也是人找题的唯一线索。
  const seenSlotIds = new Set<string>()
  for (const slot of pool.slots) {
    if (seenSlotIds.has(slot.id)) {
      violations.push({
        questionId: slot.id,
        rule: 'unique-slot-id',
        detail: `槽位 id「${slot.id}」重复`,
      })
    }
    seenSlotIds.add(slot.id)
  }

  // 2. 槽位结构。以第一个槽的候选数为基准。
  const firstSlot = pool.slots[0]
  const expectedCandidateCount = firstSlot === undefined ? 0 : firstSlot.candidates.length
  for (const slot of pool.slots) {
    violations.push(...validateSlot(slot, expectedCandidateCount))
  }

  // 决胜槽恰好一个。零个不行 —— 抽出来的题库会没有决胜题，并列时直接落到固定序，
  // 那等于把「dev 优先」写死成隐性偏好。
  const deciderSlots = pool.slots.filter((slot) => slot.kind === 'decider')
  if (deciderSlots.length !== 1) {
    violations.push({
      questionId: deciderSlots.map((s) => s.id).join('+') || '(pool)',
      rule: 'single-decider-slot',
      detail: `应恰好有 1 个决胜槽，实际 ${deciderSlots.length} 个`,
    })
  }

  // 3. 抽题子集。子集的单题规则已在第 1 层查过，这里只看「凑在一起」的那几条，
  //    否则同一道题会被重复报 N 次，真正的组合问题反而被淹掉。
  const subsetRules = new Set(['unique-question-id', 'single-decider', 'trait-bank-coverage'])
  const total = combinationCount(pool)
  const seenSubsetViolations = new Set<string>()
  const checkSubset = (questions: Question[], label: string) => {
    const found = validateQuestionBank({ version: pool.version, questions }).filter((v) =>
      subsetRules.has(v.rule),
    )
    for (const v of found) {
      // 同一条失衡会在大量组合里重复出现，按内容去重，只报第一次撞见它的组合
      const key = `${v.rule}|${v.questionId}|${v.detail}`
      if (seenSubsetViolations.has(key)) continue
      seenSubsetViolations.add(key)
      violations.push({
        questionId: `(subset ${label})`,
        rule: `subset-${v.rule}`,
        detail: `${v.detail}｜题目 [${questions.map((q) => q.id).join(', ')}]`,
      })
    }
  }

  if (total <= MAX_SUBSET_ENUMERATION) {
    for (let i = 0; i < total; i++) checkSubset(subsetAt(pool, i), `#${i}`)
  } else {
    // 组合爆炸时退化为定种子抽样。种子固定 = 测试结果可复现；
    // 但这已经是妥协，真要靠它兜底时应该先想想候选数是不是加太多了。
    for (let i = 0; i < SUBSET_SAMPLE_COUNT; i++) {
      const seed = (i + 1) * 0x9e3779b1
      checkSubset(drawQuestions(pool, seed >>> 0), `seed ${seed >>> 0}`)
    }
  }

  return violations
}

/** 把违规列表格式化成可读的多行文本。 */
export function formatViolations(violations: Violation[]): string {
  return violations.map((v) => `  [${v.questionId}] ${v.rule}: ${v.detail}`).join('\n')
}

/**
 * 开发期自检：题池或文案有问题时在控制台大声报错。
 * 权威闸门是 vitest（见 validateBank.test.ts）——
 * 这里是为了让「改了题但没跑测试」的人也能立刻看到。
 */
export function assertPoolInDev(pool: QuestionPool, unfilledCopy: string[] = []): void {
  if (!import.meta.env.DEV) return

  const violations = validateQuestionPool(pool)
  if (violations.length > 0) {
    console.error(
      `[分部帽] 题池不变量校验失败（${violations.length} 项）—— 结果页会失衡，请修复：\n` +
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
