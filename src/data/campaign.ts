/** 招新活动信息集中配置，避免届次、状态和公共入口散落在组件里。 */
export type CampaignStatus = 'open' | 'closed' | 'pending'

export interface CampaignConfig {
  year: string
  label: string
  status: CampaignStatus
  publicJoinUrl: string | null
  siteUrl: string | null
  /**
   * 本届招新使用的题库版本，必须等于 QUESTION_BANK.version。
   * 分享链接的 ?v= 用的是题库版本，这里再记一次是为了让「本届跑的是哪版题」
   * 有一处人读得懂的记录 —— 不一致会被 campaign.test.ts 拦下。
   */
  bankVersion: number
  /** 本届题库冻结/上线日期（YYYY-MM-DD）。招新期内不应再改题。 */
  releaseDate: string
}

/**
 * 公开部署前由协会更新这一处即可。
 * pending / null 会让页面显示“入口待公布”，不会生成失效链接。
 */
export const CAMPAIGN: CampaignConfig = {
  year: '2026',
  label: '2026 招新季',
  status: 'open',
  publicJoinUrl: 'https://qm.qq.com/q/1DSuxKBV5a',
  siteUrl: 'https://www.yuna.team',
  bankVersion: 2,
  releaseDate: '2026-08-30',
}
