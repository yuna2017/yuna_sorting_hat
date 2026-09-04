import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import magicCircle from '../assets/auxillary/magic_circle.webp'
import yunaLogo from '../assets/share/yuna_logo.svg'
import groupQrAsset from '../assets/share/qrcode.webp'
import type { PosterTheme } from './posterRender'

export interface PosterImages {
  /** 部门立绘。加载失败为 null，绘制层改画色块而不是整张海报失败。 */
  dept: HTMLImageElement | null
  magicCircle: HTMLImageElement | null
  logo: HTMLImageElement | null
  groupQr: HTMLImageElement | null
}

/**
 * 单张加载。decode() 而不是只等 onload —— canvas 的 drawImage 需要像素已解码，
 * 否则首帧可能画出空白（Safari 上尤其明显）。
 */
const imageCache = new Map<string, Promise<HTMLImageElement | null>>()

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src)
  if (cached !== undefined) return cached

  const promise = (async () => {
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
      await img.decode()
      return img
    } catch {
      return null
    }
  })()
  imageCache.set(src, promise)
  return promise
}

export async function loadPosterImages(
  deptId: DeptId,
  _theme: PosterTheme = 'dark',
): Promise<PosterImages> {
  const [dept, circle, logo, groupQr] = await Promise.all([
    loadImage(DEPARTMENTS[deptId].image),
    loadImage(magicCircle),
    loadImage(yunaLogo),
    loadImage(groupQrAsset),
  ])
  return { dept, magicCircle: circle, logo, groupQr }
}
