import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import magicCircle from '../assets/auxillary/magic_circle.webp'

export interface PosterImages {
  /** 部门立绘。加载失败为 null，绘制层改画色块而不是整张海报失败。 */
  dept: HTMLImageElement | null
  magicCircle: HTMLImageElement | null
}

/**
 * 单张加载。decode() 而不是只等 onload —— canvas 的 drawImage 需要像素已解码，
 * 否则首帧可能画出空白（Safari 上尤其明显）。
 */
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    await img.decode()
    return img
  } catch {
    return null
  }
}

export async function loadPosterImages(deptId: DeptId): Promise<PosterImages> {
  const [dept, circle] = await Promise.all([
    loadImage(DEPARTMENTS[deptId].image),
    loadImage(magicCircle),
  ])
  return { dept, magicCircle: circle }
}
