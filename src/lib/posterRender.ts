import QrCreator from 'qr-creator'
import { POSTER_COLORS } from '../data/constants'
import { mulberry32 } from './seededShuffle'
import type { PosterData } from './poster'
import type { PosterImages } from './posterImages'
import {
  POSTER_CONTENT_WIDTH,
  POSTER_HEIGHT,
  POSTER_PAD_X,
  POSTER_WIDTH,
  chipRow,
  traitBarRects,
  traitBarsHeight,
  truncateToWidth,
  wrapText,
  type MeasureText,
} from './posterLayout'

/* 字体栈与 src/index.css 的 --font-body / --font-display 保持一致。
   海报不自托管字体，所以同一张图在不同系统上字形会有差异 —— 版式全部靠
   measureText 动态算，不能硬编码坐标。 */
const FONT_BODY =
  "'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
const FONT_DISPLAY = "'Cinzel', 'Palatino Linotype', Georgia, 'Songti SC', 'SimSun', serif"

/** 星点用固定种子，保证同一份结果两次生成的海报完全一致。 */
const STARFIELD_SEED = 0x5eed
const STAR_COUNT = 220

const QR_SIZE = 196
const QR_QUIET = 16

function font(size: number, weight = 400, family = FONT_BODY): string {
  return `${weight} ${size}px ${family}`
}

/** 带字距的居中绘制。canvas 的 letterSpacing 在旧版 Safari 上不支持，只能自己逐字排。 */
function fillTrackedCenter(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  tracking: number,
): void {
  const chars = [...text]
  const total =
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
    tracking * Math.max(0, chars.length - 1)

  let cursor = centerX - total / 2
  const previousAlign = ctx.textAlign
  ctx.textAlign = 'left'
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + tracking
  }
  ctx.textAlign = previousAlign
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, POSTER_HEIGHT)
  gradient.addColorStop(0, POSTER_COLORS.night900)
  gradient.addColorStop(0.45, POSTER_COLORS.night800)
  gradient.addColorStop(1, POSTER_COLORS.night900)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  const rand = mulberry32(STARFIELD_SEED)
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = rand() * POSTER_WIDTH
    const y = rand() * POSTER_HEIGHT
    const r = 0.6 + rand() * 1.6
    ctx.globalAlpha = 0.08 + rand() * 0.3
    ctx.fillStyle = POSTER_COLORS.parchment
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** 顶部标识区。返回下一个可用的 y。 */
function drawMasthead(ctx: CanvasRenderingContext2D): number {
  const centerX = POSTER_WIDTH / 2

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.font = font(30)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  fillTrackedCenter(ctx, '燕山大学网络与信息协会', centerX, 128, 5)

  ctx.font = font(84, 600, FONT_DISPLAY)
  ctx.fillStyle = POSTER_COLORS.parchment
  ctx.fillText('分部帽', centerX, 226)

  const ruleGradient = ctx.createLinearGradient(centerX - 130, 0, centerX + 130, 0)
  ruleGradient.addColorStop(0, 'rgba(212,175,55,0)')
  ruleGradient.addColorStop(0.5, POSTER_COLORS.gold)
  ruleGradient.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = ruleGradient
  ctx.fillRect(centerX - 130, 258, 260, 2)

  ctx.font = font(24, 400, FONT_DISPLAY)
  ctx.fillStyle = POSTER_COLORS.goldSoft
  fillTrackedCenter(ctx, 'YUNA SORTING HAT', centerX, 300, 10)

  return 340
}

/** 立绘与背后的魔法阵。返回下一个可用的 y。 */
function drawArtwork(
  ctx: CanvasRenderingContext2D,
  images: PosterImages,
  accent: string,
  top: number,
): number {
  const centerX = POSTER_WIDTH / 2
  const boxHeight = 430
  const centerY = top + boxHeight / 2

  if (images.magicCircle !== null) {
    const size = 620
    ctx.globalAlpha = 0.16
    ctx.drawImage(images.magicCircle, centerX - size / 2, centerY - size / 2, size, size)
    ctx.globalAlpha = 1
  }

  const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300)
  glow.addColorStop(0, `${accent}44`)
  glow.addColorStop(1, `${accent}00`)
  ctx.fillStyle = glow
  ctx.fillRect(centerX - 300, centerY - 300, 600, 600)

  if (images.dept !== null) {
    const img = images.dept
    const scale = Math.min(boxHeight / img.naturalHeight, 460 / img.naturalWidth)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.drawImage(img, centerX - w / 2, centerY - h / 2, w, h)
  } else {
    // 立绘缺失时用部门色块占位，不让整张海报失败
    ctx.fillStyle = `${accent}33`
    roundRect(ctx, centerX - 160, centerY - 160, 320, 320, 40)
    ctx.fill()
  }

  return top + boxHeight
}

/** 结论区：昵称、行为身份、部门。返回下一个可用的 y。 */
function drawVerdict(
  ctx: CanvasRenderingContext2D,
  data: PosterData,
  accent: string,
  top: number,
): number {
  const centerX = POSTER_WIDTH / 2
  let y = top

  ctx.textAlign = 'center'

  if (data.nickname !== null) {
    ctx.font = font(36)
    ctx.fillStyle = POSTER_COLORS.parchmentDim
    // 昵称是用户输入，12 个全角字符也可能超出安全宽度
    const shown = truncateToWidth(data.nickname, POSTER_CONTENT_WIDTH - 80, (s) =>
      ctx.measureText(s).width,
    )
    ctx.fillText(`「${shown}」`, centerX, y)
    y += 62
  }

  ctx.font = font(76, 600)
  ctx.fillStyle = POSTER_COLORS.parchment
  ctx.fillText(data.identityName, centerX, y + 56)
  y += 128

  ctx.font = font(38)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  const prefix = '帽子的选择：'
  const prefixWidth = ctx.measureText(prefix).width
  ctx.font = font(44, 600)
  const nameWidth = ctx.measureText(data.deptName).width
  const startX = centerX - (prefixWidth + nameWidth) / 2

  ctx.textAlign = 'left'
  ctx.font = font(38)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  ctx.fillText(prefix, startX, y)
  ctx.font = font(44, 600)
  ctx.fillStyle = accent
  ctx.fillText(data.deptName, startX + prefixWidth, y)

  ctx.textAlign = 'center'
  ctx.font = font(22, 400, FONT_DISPLAY)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  fillTrackedCenter(ctx, data.latinName.toUpperCase(), centerX, y + 44, 8)

  return y + 84
}

/** 五维倾向横条。返回下一个可用的 y。 */
function drawTraitBars(
  ctx: CanvasRenderingContext2D,
  data: PosterData,
  accent: string,
  top: number,
): number {
  const centerX = POSTER_WIDTH / 2
  const rowHeight = 40
  const gap = 26
  const box = {
    x: POSTER_PAD_X,
    y: top + 60,
    width: POSTER_CONTENT_WIDTH,
    labelWidth: 118,
    valueWidth: 104,
    rowHeight,
    gap,
  }

  ctx.textAlign = 'center'
  ctx.font = font(26)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  fillTrackedCenter(ctx, '你的五个倾向', centerX, top + 26, 5)

  const rects = traitBarRects(data.traitBars, box)
  // 并列的倾向一起高亮 —— docs/特质体系.md §4.3 要求文案承认并列
  const highlighted = new Set([data.dominantTraitName, ...data.tiedTraitNames])

  for (const rect of rects) {
    const isDominant = highlighted.has(rect.name)
    const color = isDominant ? accent : POSTER_COLORS.parchmentDim

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = font(30, isDominant ? 600 : 400)
    ctx.fillStyle = isDominant ? POSTER_COLORS.parchment : POSTER_COLORS.parchmentDim
    ctx.globalAlpha = isDominant ? 1 : 0.8
    ctx.fillText(rect.name, rect.labelX, rect.centerY)

    const trackHeight = 14
    ctx.globalAlpha = 1
    ctx.fillStyle = POSTER_COLORS.night600
    roundRect(ctx, rect.trackX, rect.centerY - trackHeight / 2, rect.trackWidth, trackHeight, 7)
    ctx.fill()

    ctx.globalAlpha = isDominant ? 1 : 0.45
    ctx.fillStyle = color
    roundRect(ctx, rect.trackX, rect.centerY - trackHeight / 2, rect.fillWidth, trackHeight, 7)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.textAlign = 'right'
    ctx.font = font(28, isDominant ? 600 : 400)
    ctx.fillStyle = isDominant ? POSTER_COLORS.parchment : POSTER_COLORS.parchmentDim
    ctx.fillText(`${Math.round(rect.ratio * 100)}%`, rect.valueX, rect.centerY)
  }

  ctx.textBaseline = 'alphabetic'
  return box.y + traitBarsHeight(rects.length, box)
}

/** 关键词与标语。返回下一个可用的 y。 */
function drawFlavor(
  ctx: CanvasRenderingContext2D,
  data: PosterData,
  accent: string,
  top: number,
): number {
  const centerX = POSTER_WIDTH / 2
  let y = top + 56

  ctx.font = font(28)
  const measure: MeasureText = (s) => ctx.measureText(s).width
  const chipHeight = 56
  const chips = chipRow(data.keywords, centerX, y, POSTER_CONTENT_WIDTH, measure, 26, chipHeight, 18)

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  for (const chip of chips) {
    ctx.strokeStyle = `${accent}66`
    ctx.lineWidth = 2
    roundRect(ctx, chip.x, chip.y, chip.width, chip.height, chipHeight / 2)
    ctx.stroke()
    ctx.fillStyle = POSTER_COLORS.parchment
    ctx.fillText(chip.text, chip.x + chip.width / 2, chip.y + chip.height / 2 + 1)
  }
  ctx.textBaseline = 'alphabetic'
  if (chips.length > 0) y += chipHeight + 44

  const flavor = data.tagline ?? data.slogan
  ctx.font = font(30)
  const lines = wrapText(flavor, POSTER_CONTENT_WIDTH - 60, measure).slice(0, 2)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  for (const line of lines) {
    ctx.fillText(line, centerX, y)
    y += 46
  }

  return y
}

/** 二维码渲到独立 canvas，再作为图片贴进海报 —— qr-creator 会重设目标 canvas 尺寸。 */
function renderQrCanvas(text: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  QrCreator.render(
    {
      text,
      size: QR_SIZE,
      radius: 0,
      ecLevel: 'M',
      fill: POSTER_COLORS.night900,
      background: null,
    },
    canvas,
  )
  return canvas
}

/** 底部：二维码或纯文字引导，加页脚。 */
function drawFooter(ctx: CanvasRenderingContext2D, data: PosterData): void {
  const centerX = POSTER_WIDTH / 2
  const footerY = POSTER_HEIGHT - 74

  ctx.textAlign = 'center'
  ctx.font = font(24, 400, FONT_DISPLAY)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  ctx.globalAlpha = 0.7
  fillTrackedCenter(ctx, `YUNA · ${data.campaignLabel}`, centerX, footerY, 6)
  ctx.globalAlpha = 1

  const blockTop = POSTER_HEIGHT - 300

  if (data.shareUrl === null) {
    ctx.font = font(30)
    ctx.fillStyle = POSTER_COLORS.parchmentDim
    ctx.fillText('去 YUNA 分部帽，测出你自己的部门', centerX, blockTop + 110)
    return
  }

  const plateSize = QR_SIZE + QR_QUIET * 2
  const plateX = POSTER_PAD_X
  const plateY = blockTop + 30

  ctx.fillStyle = '#ffffff'
  roundRect(ctx, plateX, plateY, plateSize, plateSize, 16)
  ctx.fill()
  ctx.drawImage(renderQrCanvas(data.shareUrl), plateX + QR_QUIET, plateY + QR_QUIET, QR_SIZE, QR_SIZE)

  const textX = plateX + plateSize + 40
  ctx.textAlign = 'left'
  ctx.font = font(32, 600)
  ctx.fillStyle = POSTER_COLORS.parchment
  ctx.fillText('扫码看这份结果', textX, plateY + 76)

  ctx.font = font(26)
  ctx.fillStyle = POSTER_COLORS.parchmentDim
  const measure: MeasureText = (s) => ctx.measureText(s).width
  const available = POSTER_WIDTH - POSTER_PAD_X - textX
  const lines = wrapText('打开后点「再测一次」，可以自己重新抽题作答。', available, measure).slice(0, 3)
  let y = plateY + 126
  for (const line of lines) {
    ctx.fillText(line, textX, y)
    y += 40
  }
}

/**
 * 把结果画成一张 1080×1920 的竖版海报。
 *
 * 手绘而不是截 DOM：结果页的雷达图依赖 CSS 变量、color-mix() 与 drop-shadow
 * filter，这些在 DOM 转图片的库里支持度都不完整，导出会走样。
 */
export function renderPoster(
  canvas: HTMLCanvasElement,
  data: PosterData,
  images: PosterImages,
): void {
  canvas.width = POSTER_WIDTH
  canvas.height = POSTER_HEIGHT

  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('无法获取 canvas 2d 上下文')

  const accent = POSTER_COLORS.dept[data.deptId]

  drawBackdrop(ctx)
  const afterMast = drawMasthead(ctx)
  const afterArt = drawArtwork(ctx, images, accent, afterMast)
  const afterVerdict = drawVerdict(ctx, data, accent, afterArt + 24)
  const afterTraits = drawTraitBars(ctx, data, accent, afterVerdict)
  drawFlavor(ctx, data, accent, afterTraits)
  drawFooter(ctx, data)
}
