import type { DeptActionKind, Department } from '../data/departments'
import { DEPT_LIST } from '../data/departments'
import { DEPT_ORDER } from '../data/constants'

export interface ContentViolation {
  subject: string
  rule: string
  detail: string
}

const ACTION_KINDS: readonly DeptActionKind[] = ['join', 'more', 'works']

/** 只检查结构和安全边界；待社团填写的草稿由 reportUnfilledCopy 单独报告。 */
export function validateDepartmentContent(
  departments: readonly Department[] = DEPT_LIST,
): ContentViolation[] {
  const violations: ContentViolation[] = []
  const seenIds = new Set<string>()

  for (const dept of departments) {
    if (seenIds.has(dept.id)) violations.push({ subject: dept.id, rule: 'unique-department-id', detail: '部门 id 重复' })
    seenIds.add(dept.id)
    if (!DEPT_ORDER.includes(dept.id)) violations.push({ subject: dept.id, rule: 'known-department-id', detail: '部门 id 不在规范顺序中' })
    if (!dept.name.trim()) violations.push({ subject: dept.id, rule: 'name-required', detail: '部门名称为空' })
    if (!dept.tagline?.trim()) violations.push({ subject: dept.id, rule: 'tagline-required', detail: '事实定位为空' })
    if (!dept.intro?.trim()) violations.push({ subject: dept.id, rule: 'intro-required', detail: '部门介绍为空' })
    if (dept.doing.length < 2 || dept.doing.length > 4) violations.push({ subject: dept.id, rule: 'doing-count', detail: `doing 应为 2～4 条，实际 ${dept.doing.length} 条` })
    if (!dept.suitedFor?.trim()) violations.push({ subject: dept.id, rule: 'suited-for-required', detail: '适合人群为空' })

    const seenKinds = new Set<DeptActionKind>()
    for (const action of dept.actions) {
      if (!ACTION_KINDS.includes(action.kind)) violations.push({ subject: dept.id, rule: 'known-action-kind', detail: `未知行动类型 ${action.kind}` })
      if (seenKinds.has(action.kind)) violations.push({ subject: dept.id, rule: 'unique-action-kind', detail: `行动类型 ${action.kind} 重复` })
      seenKinds.add(action.kind)
      if (action.href !== null) {
        try {
          const url = new URL(action.href)
          if (url.protocol !== 'http:' && url.protocol !== 'https:') violations.push({ subject: dept.id, rule: 'public-http-url', detail: `${action.label} 不是 http(s) URL` })
        } catch {
          violations.push({ subject: dept.id, rule: 'valid-url', detail: `${action.label} URL 无法解析` })
        }
      }
    }
  }

  for (const id of DEPT_ORDER) {
    if (!departments.some((dept) => dept.id === id)) violations.push({ subject: id, rule: 'all-departments-present', detail: '缺少规范部门' })
  }
  return violations
}

export function formatContentViolations(violations: ContentViolation[]): string {
  return violations.map((v) => `  [${v.subject}] ${v.rule}: ${v.detail}`).join('\n')
}

export function assertDepartmentContent(): void {
  const violations = validateDepartmentContent(DEPT_LIST)
  if (violations.length > 0) throw new Error(formatContentViolations(violations))
}
