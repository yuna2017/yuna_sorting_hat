import { describe, expect, it } from 'vitest'
import { chipRow, traitBarRects, traitBarsHeight, truncateToWidth, wrapText } from './posterLayout'

/* 测量替身：ASCII 半角 1 单位，其余（含 CJK）2 单位。
   真实绘制用 ctx.measureText，这里只要求断行逻辑与宽度成比例。 */
const measure = (text: string): number =>
  [...text].reduce((sum, ch) => sum + (ch.charCodeAt(0) < 128 ? 1 : 2), 0)

describe('wrapText', () => {
  it('空串或非正宽度返回空数组，调用方据此跳过整块', () => {
    expect(wrapText('', 100, measure)).toEqual([])
    expect(wrapText('文字', 0, measure)).toEqual([])
    expect(wrapText('文字', -10, measure)).toEqual([])
  })

  it('中文逐字断行，每行不超过可用宽度', () => {
    const lines = wrapText('一二三四五六七八九十', 8, measure)
    expect(lines).toEqual(['一二三四', '五六七八', '九十'])
    lines.forEach((line) => expect(measure(line)).toBeLessThanOrEqual(8))
  })

  it('拉丁单词整体折行，不从词中间切断', () => {
    const lines = wrapText('alpha beta gamma', 11, measure)
    expect(lines).toEqual(['alpha beta', 'gamma'])
  })

  it('中英混排时中文可断、英文成词', () => {
    const lines = wrapText('扫码看 YUNA 结果', 10, measure)
    lines.forEach((line) => expect(measure(line)).toBeLessThanOrEqual(10))
    expect(lines.join('')).toContain('YUNA')
    // YUNA 不能被拆成 YU / NA
    expect(lines.some((line) => line.includes('YUNA'))).toBe(true)
  })

  it('单个记号本身超宽时逐字硬断，不让它溢出画布', () => {
    const lines = wrapText('https://example.github.io/yuna_sorting_hat/', 10, measure)
    expect(lines.length).toBeGreaterThan(1)
    lines.forEach((line) => expect(measure(line)).toBeLessThanOrEqual(10))
    expect(lines.join('')).toBe('https://example.github.io/yuna_sorting_hat/')
  })

  it('显式换行被保留为分行', () => {
    expect(wrapText('上行\n下行', 100, measure)).toEqual(['上行', '下行'])
  })

  it('不产生行首空格，也不产生空行', () => {
    const lines = wrapText('alpha   beta   gamma', 6, measure)
    lines.forEach((line) => {
      expect(line).not.toMatch(/^\s/)
      expect(line).not.toBe('')
    })
  })
})

describe('truncateToWidth', () => {
  it('未超宽时原样返回', () => {
    expect(truncateToWidth('短名字', 100, measure)).toBe('短名字')
  })

  it('超宽时截断并补省略号，且结果不超过可用宽度', () => {
    const out = truncateToWidth('一二三四五六七八九十', 8, measure)
    expect(out.endsWith('…')).toBe(true)
    expect(measure(out)).toBeLessThanOrEqual(8)
  })

  it('宽度小到放不下任何字符时只返回省略号', () => {
    expect(truncateToWidth('一二三', 1, measure)).toBe('…')
  })
})

describe('traitBarRects', () => {
  const bars = [
    { name: '探索', ratio: 0 },
    { name: '洞察', ratio: 0.25 },
    { name: '创造', ratio: 0.5 },
    { name: '守护', ratio: 1 },
    { name: '连接', ratio: 0.75 },
  ]
  const box = {
    x: 84,
    y: 200,
    width: 912,
    labelWidth: 118,
    valueWidth: 104,
    rowHeight: 40,
    gap: 26,
  }

  it('量条起止由名称列与读数列夹出，五行共用同一条轨道', () => {
    const rects = traitBarRects(bars, box)
    expect(rects).toHaveLength(5)
    rects.forEach((rect) => {
      expect(rect.trackX).toBe(box.x + box.labelWidth)
      expect(rect.trackWidth).toBe(box.width - box.labelWidth - box.valueWidth)
      expect(rect.valueX).toBe(box.x + box.width)
    })
  })

  it('填充宽度与 ratio 成正比', () => {
    const rects = traitBarRects(bars, box)
    const quarter = rects[1]
    const half = rects[2]
    const full = rects[3]
    if (quarter === undefined || half === undefined || full === undefined) throw new Error('缺行')

    expect(full.fillWidth).toBeCloseTo(full.trackWidth)
    expect(half.fillWidth).toBeCloseTo(full.trackWidth * 0.5)
    expect(quarter.fillWidth).toBeCloseTo(full.trackWidth * 0.25)
  })

  it('ratio 为 0 时仍留一小段，否则那行看起来像渲染失败', () => {
    const zero = traitBarRects(bars, box)[0]
    if (zero === undefined) throw new Error('缺行')
    expect(zero.ratio).toBe(0)
    expect(zero.fillWidth).toBeGreaterThan(0)
    expect(zero.fillWidth).toBeLessThan(zero.trackWidth * 0.05)
  })

  it('越界 ratio 被夹到 0～1，不画出轨道之外', () => {
    const rects = traitBarRects(
      [
        { name: '低', ratio: -0.5 },
        { name: '高', ratio: 2 },
      ],
      box,
    )
    const low = rects[0]
    const high = rects[1]
    if (low === undefined || high === undefined) throw new Error('缺行')
    expect(low.ratio).toBe(0)
    expect(high.ratio).toBe(1)
    expect(high.fillWidth).toBeLessThanOrEqual(high.trackWidth)
  })

  it('行间距按 rowHeight + gap 递增', () => {
    const rects = traitBarRects(bars, box)
    const first = rects[0]
    const second = rects[1]
    if (first === undefined || second === undefined) throw new Error('缺行')
    expect(second.centerY - first.centerY).toBe(box.rowHeight + box.gap)
  })

  it('总高度与行数一致，空列表为 0', () => {
    expect(traitBarsHeight(0, box)).toBe(0)
    expect(traitBarsHeight(5, box)).toBe(5 * 40 + 4 * 26)
  })
})

describe('chipRow', () => {
  it('整排相对中心线居中', () => {
    const chips = chipRow(['探索', '洞察'], 500, 100, 400, measure, 10, 40, 10)
    expect(chips).toHaveLength(2)
    const first = chips[0]
    const last = chips[chips.length - 1]
    if (first === undefined || last === undefined) throw new Error('缺 chip')
    const left = first.x
    const right = last.x + last.width
    expect((left + right) / 2).toBeCloseTo(500)
  })

  it('放不下的关键词直接丢弃而不换行，避免把二维码挤下去', () => {
    const chips = chipRow(['一二三', '四五六', '七八九'], 500, 100, 40, measure, 10, 40, 10)
    expect(chips.length).toBeLessThan(3)
    const total = chips.reduce((sum, c, i) => sum + c.width + (i > 0 ? 10 : 0), 0)
    expect(total).toBeLessThanOrEqual(40)
  })

  it('可用宽度不足一个 chip 时返回空数组', () => {
    expect(chipRow(['一二三'], 500, 100, 5, measure, 10, 40, 10)).toEqual([])
  })
})
