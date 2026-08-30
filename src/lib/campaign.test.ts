import { describe, expect, it } from 'vitest'
import { CAMPAIGN } from '../data/campaign'
import { QUESTION_BANK } from '../data/questions'
import { LEGACY_SHARE_VERSION } from './shareCode'

describe('招新配置', () => {
  it('记录的题库版本与题库本体一致', () => {
    // 不一致意味着「本届跑的是哪版题」的记录已经过期，
    // 已分享出去的链接会被按错误的版本解释。
    expect(CAMPAIGN.bankVersion).toBe(QUESTION_BANK.version)
  })

  it('题库版本不小于历史链接的兼容版本', () => {
    expect(QUESTION_BANK.version).toBeGreaterThanOrEqual(LEGACY_SHARE_VERSION)
  })

  it('发布日期为 YYYY-MM-DD 且可解析', () => {
    expect(CAMPAIGN.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(CAMPAIGN.releaseDate))).toBe(false)
  })

  it('招新开放时必须有可用入口', () => {
    if (CAMPAIGN.status === 'open') {
      expect(CAMPAIGN.publicJoinUrl).not.toBeNull()
      expect(CAMPAIGN.publicJoinUrl).toMatch(/^https?:\/\//)
    }
  })
})
