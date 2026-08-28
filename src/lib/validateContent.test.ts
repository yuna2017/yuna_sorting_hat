import { describe, expect, it } from 'vitest'
import { DEPT_LIST } from '../data/departments'
import { formatContentViolations, validateDepartmentContent } from './validateContent'

describe('部门内容结构', () => {
  it('部门字段、行动状态和公开 URL 结构合法', () => {
    const violations = validateDepartmentContent(DEPT_LIST)
    expect(violations, `\n${formatContentViolations(violations)}`).toEqual([])
  })
})
