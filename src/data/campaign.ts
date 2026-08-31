/** 招新活动信息集中配置，避免届次、状态和公共入口散落在组件里。
 * 除海报地址（posterOrigin / posterPathname 由构建环境变量注入）外，
 * 公开部署前由协会更新这一处即可。
 */
export type CampaignStatus = 'open' | 'closed' | 'pending'

export interface CampaignConfig {
  year: string
  label: string
  status: CampaignStatus
  publicJoinUrl: string | null
  siteUrl: string | null
  /**
   * 本届招新使用的题库版本，必须等于 QUESTION_POOL.version。
   * 分享链接的 ?v= 用的是题库版本，这里再记一次是为了让「本届跑的是哪版题」
   * 有一处人读得懂的记录 —— 不一致会被 campaign.test.ts 拦下。
   */
  bankVersion: number
  /** 本届题库冻结/上线日期（YYYY-MM-DD）。招新期内不应再改题。 */
  releaseDate: string
  /**
   * 海报二维码用的公开站点地址（不含路径），例如 https://example.github.io。
   *
   * 刻意不用运行时 window.location.origin：在 localhost 或内网 IP 下生成的海报
   * 会把开发地址永久印进一张可无限转发的图片里，收不回来。
   *
   * 由构建环境变量 VITE_PUBLIC_ORIGIN 注入（见 src/vite-env.d.ts），任意平台
   * 部署无需改代码：设了才启用海报二维码，不设（含本地开发）则为 null，生产
   * 环境不出现「图片模式」入口 —— 它同时是海报功能的发布闸门。二维码里带
   * ?v=&s=&a=，升 QUESTION_POOL.version 会让已发出的海报二维码全部失效，
   * 所以必须等题库冻结后再在部署平台配置这个变量。
   */
  posterOrigin: string | null
  /** 海报二维码用的部署路径，需与 vite.config.ts 的 base 一致。由 VITE_PUBLIC_PATH 注入，默认 '/'。 */
  posterPathname: string
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
  bankVersion: 3,
  releaseDate: '2026-08-30',
  posterOrigin: import.meta.env.VITE_PUBLIC_ORIGIN ?? null,
  posterPathname: import.meta.env.VITE_PUBLIC_PATH ?? '/',
}
