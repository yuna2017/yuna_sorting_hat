/**
 * 海报版式计算。纯函数，不碰任何 canvas API —— 所以能在 node 里单测，
 * 文字宽度由调用方注入 measure（真实绘制时是 ctx.measureText）。
 *
 * 为什么必须动态测量：海报走系统字体，同一段中文在苹方 / 鸿蒙 / 雅黑下
 * 字宽不同，硬编码坐标会在某些设备上叠字或溢出。
 */

/** 画布尺寸。竖版 9:16，微信与相册的通用比例。 */
export const POSTER_WIDTH = 1080
export const POSTER_HEIGHT = 1920

/** 左右安全边距。 */
export const POSTER_PAD_X = 84

export const POSTER_CONTENT_WIDTH = POSTER_WIDTH - POSTER_PAD_X * 2

/** 字宽测量函数。绘制时传 (s) => ctx.measureText(s).width。 */
export type MeasureText = (text: string) => number

const CJK_PATTERN =
  /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f\u3040-\u30ff\uac00-\ud7af]/

/**
 * 切成断行候选：中文逐字可断，拉丁与数字按词整体不断。
 * 空格与换行作为独立记号保留，便于还原原文间距。
 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  let word = ''

  const flush = () => {
    if (word !== '') {
      tokens.push(word)
      word = ''
    }
  }

  for (const ch of text) {
    if (ch === '\n') {
      flush()
      tokens.push('\n')
    } else if (/\s/.test(ch)) {
      flush()
      tokens.push(' ')
    } else if (CJK_PATTERN.test(ch)) {
      flush()
      tokens.push(ch)
    } else {
      word += ch
    }
  }
  flush()
  return tokens
}

/** 单个记号自己就超宽（超长英文单词/URL）时逐字硬断。 */
function hardSplit(token: string, maxWidth: number, measure: MeasureText): string[] {
  const parts: string[] = []
  let current = ''
  for (const ch of token) {
    const next = current + ch
    if (current !== '' && measure(next) > maxWidth) {
      parts.push(current)
      current = ch
    } else {
      current = next
    }
  }
  if (current !== '') parts.push(current)
  return parts
}

/** 按可用宽度断行。maxWidth <= 0 或空串时返回空数组，调用方据此跳过整块。 */
export function wrapText(text: string, maxWidth: number, measure: MeasureText): string[] {
  if (text === '' || maxWidth <= 0) return []

  const lines: string[] = []
  let line = ''

  const pushLine = () => {
    lines.push(line.trimEnd())
    line = ''
  }

  for (const token of tokenize(text)) {
    if (token === '\n') {
      pushLine()
      continue
    }
    // 行首的空格不保留，否则每行都被顶开一格
    if (token === ' ' && line === '') continue

    if (measure(line + token) <= maxWidth) {
      line += token
      continue
    }

    if (line !== '') pushLine()

    if (measure(token) <= maxWidth) {
      line = token === ' ' ? '' : token
      continue
    }

    const parts = hardSplit(token, maxWidth, measure)
    const last = parts.pop()
    parts.forEach((part) => lines.push(part))
    line = last ?? ''
  }

  if (line !== '') pushLine()
  return lines.filter((l) => l !== '')
}

/** 超宽则截断并补省略号。用于关键词这类必须单行的短文本。 */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  measure: MeasureText,
  ellipsis = '…',
): string {
  if (text === '' || measure(text) <= maxWidth) return text

  const ellipsisWidth = measure(ellipsis)
  let kept = ''
  for (const ch of text) {
    if (measure(kept + ch) + ellipsisWidth > maxWidth) break
    kept += ch
  }
  return kept === '' ? ellipsis : kept + ellipsis
}

export interface TraitBarBox {
  x: number
  y: number
  width: number
  /** 名称列宽度。量条从 x + labelWidth 开始。 */
  labelWidth: number
  /** 右侧读数列宽度。量条到 x + width - valueWidth 结束。 */
  valueWidth: number
  rowHeight: number
  gap: number
}

export interface TraitBarRect {
  name: string
  ratio: number
  /** 该行基线所在的行中心 y。 */
  centerY: number
  labelX: number
  trackX: number
  trackWidth: number
  /** 填充宽度。ratio 为 0 时仍留一小段，否则那一行看起来像渲染失败。 */
  fillWidth: number
  valueX: number
}

/** 0 分时保留的最小填充占比。 */
const MIN_FILL_RATIO = 0.012

export function traitBarRects(
  bars: readonly { name: string; ratio: number }[],
  box: TraitBarBox,
): TraitBarRect[] {
  const trackX = box.x + box.labelWidth
  const trackWidth = Math.max(0, box.width - box.labelWidth - box.valueWidth)

  return bars.map((bar, index) => {
    const clamped = Math.min(Math.max(bar.ratio, 0), 1)
    return {
      name: bar.name,
      ratio: clamped,
      centerY: box.y + index * (box.rowHeight + box.gap) + box.rowHeight / 2,
      labelX: box.x,
      trackX,
      trackWidth,
      fillWidth: trackWidth * Math.max(clamped, MIN_FILL_RATIO),
      valueX: box.x + box.width,
    }
  })
}

/** 横条区块总高度。用于在流式排版里预留空间。 */
export function traitBarsHeight(count: number, box: Pick<TraitBarBox, 'rowHeight' | 'gap'>): number {
  if (count <= 0) return 0
  return count * box.rowHeight + (count - 1) * box.gap
}

export interface ChipRect {
  text: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * 关键词横排。整排居中，超出可用宽度的部分不换行而是丢弃 ——
 * 海报底部空间是固定的，宁可少显示一个关键词也不能把二维码挤下去。
 */
export function chipRow(
  labels: readonly string[],
  centerX: number,
  y: number,
  maxWidth: number,
  measure: MeasureText,
  padX: number,
  height: number,
  gap: number,
): ChipRect[] {
  const sized = labels.map((text) => ({ text, width: measure(text) + padX * 2 }))

  const kept: typeof sized = []
  let total = 0
  for (const chip of sized) {
    const next = total === 0 ? chip.width : total + gap + chip.width
    if (next > maxWidth) break
    kept.push(chip)
    total = next
  }

  let cursor = centerX - total / 2
  return kept.map((chip) => {
    const rect: ChipRect = { text: chip.text, x: cursor, y, width: chip.width, height }
    cursor += chip.width + gap
    return rect
  })
}
