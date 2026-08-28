/** 招新活动信息集中配置，避免届次、状态和公共入口散落在组件里。 */
export type CampaignStatus = 'open' | 'closed' | 'pending'

export interface CampaignConfig {
  year: string
  label: string
  status: CampaignStatus
  publicJoinUrl: string | null
  siteUrl: string | null
}

/**
 * 公开部署前由协会更新这一处即可。
 * pending / null 会让页面显示“入口待公布”，不会生成失效链接。
 */
export const CAMPAIGN: CampaignConfig = {
  year: '2026',
  label: '2026 招新季',
  status: 'pending',
  publicJoinUrl: null,
  siteUrl: null,
}
