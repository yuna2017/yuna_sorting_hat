/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 海报二维码用的公开站点地址（不含路径），例如 https://example.github.io。
   * 留空/未设置时 CAMPAIGN.posterOrigin 为 null，海报不画二维码
   * （生产环境也不出现「图片模式」入口）。
   */
  readonly VITE_PUBLIC_ORIGIN?: string
  /**
   * 海报二维码用的部署路径，需与 vite.config.ts 的 base 一致。
   * 默认 '/'（根路径部署）；GitHub Pages 等子路径部署传 '/yuna_sorting_hat/'。
   */
  readonly VITE_PUBLIC_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
