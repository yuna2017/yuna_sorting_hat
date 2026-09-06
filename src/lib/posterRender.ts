import { POSTER_COLORS as POSTER_DARK_COLORS, POSTER_LIGHT_COLORS } from '../data/constants'
import QrCreator from 'qr-creator'
import type { DeptId } from '../data/constants'
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

export type PosterTheme = 'light' | 'dark'
type PosterColors = {
  dept: Record<DeptId, string>
  gold: string
  goldSoft: string
  parchment: string
  parchmentDim: string
  night900: string
  night800: string
  night600: string
}

let activePosterColors: PosterColors = POSTER_DARK_COLORS

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
  gradient.addColorStop(0, activePosterColors.night900)
  gradient.addColorStop(0.45, activePosterColors.night800)
  gradient.addColorStop(1, activePosterColors.night900)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  if (activePosterColors === POSTER_LIGHT_COLORS) {
    ctx.globalAlpha = 0.42
    ctx.strokeStyle = '#c9b980'
    ctx.lineWidth = 1
    for (let x = 0; x <= POSTER_WIDTH; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, POSTER_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= POSTER_HEIGHT; y += 64) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(POSTER_WIDTH, y)
      ctx.stroke()
    }
    const glow = ctx.createRadialGradient(POSTER_WIDTH * 0.78, 160, 0, POSTER_WIDTH * 0.78, 160, 560)
    glow.addColorStop(0, 'rgb(212 175 55 / 0.18)')
    glow.addColorStop(1, 'rgb(212 175 55 / 0)')
    ctx.globalAlpha = 1
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, POSTER_WIDTH, 720)
    return
  }

  const rand = mulberry32(STARFIELD_SEED)
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = rand() * POSTER_WIDTH
    const y = rand() * POSTER_HEIGHT
    const r = 0.6 + rand() * 1.6
    ctx.globalAlpha = 0.08 + rand() * 0.3
    ctx.fillStyle = activePosterColors.parchment
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** 顶部标识区。返回下一个可用的 y。 */
function drawMasthead(ctx: CanvasRenderingContext2D, data: PosterData): number {
  const centerX = POSTER_WIDTH / 2

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font = font(30)
  ctx.fillStyle = activePosterColors.parchmentDim
  ctx.fillText('燕山大学大学生网络信息协会', POSTER_PAD_X, 96)

  // 主标题不因右侧二维码改变中心点，始终对齐整张海报的中轴线。
  ctx.font = font(76, 600, FONT_DISPLAY)
  ctx.fillStyle = activePosterColors.parchment
  ctx.textAlign = 'center'
  ctx.fillText('分部帽', centerX, 198)

  const ruleGradient = ctx.createLinearGradient(centerX - 130, 0, centerX + 130, 0)
  ruleGradient.addColorStop(0, 'rgba(212,175,55,0)')
  ruleGradient.addColorStop(0.5, activePosterColors.gold)
  ruleGradient.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = ruleGradient
  ctx.fillRect(centerX - 130, 232, 260, 2)

  ctx.font = font(24, 400, FONT_DISPLAY)
  ctx.fillStyle = activePosterColors.goldSoft
  fillTrackedCenter(ctx, 'YUNA SORTING HAT', centerX, 278, 10)

  if (data.projectUrl !== null) drawProjectQrCard(ctx, data.projectUrl)

  return 344
}

function drawProjectQrCard(ctx: CanvasRenderingContext2D, projectUrl: string): void {
  const cardWidth = 178
  const cardX = POSTER_WIDTH - POSTER_PAD_X - cardWidth
  const cardY = 72
  const cardHeight = 178
  const cardCenterX = cardX + cardWidth / 2
  const qrSize = 136
  const isLightPoster = activePosterColors === POSTER_LIGHT_COLORS
  const cardBackground = isLightPoster ? '#203b3a' : '#e8dfc5'
  const qrFill = isLightPoster ? '#f0c75e' : '#b54f70'
  const qrCanvas = document.createElement('canvas')
  QrCreator.render(
    {
      text: projectUrl,
      ecLevel: 'H',
      // 二维码留白必须与卡片同色，否则卡片与二维码会出现两块不同的底。
      fill: qrFill,
      background: cardBackground,
      radius: 0.08,
      size: qrSize,
    },
    qrCanvas,
  )

  // 卡片只包住二维码，说明文字留在卡片外，避免视觉上挤成一块。
  ctx.fillStyle = cardBackground
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 18)
  ctx.fill()
  ctx.drawImage(qrCanvas, cardCenterX - qrSize / 2, cardY + (cardHeight - qrSize) / 2, qrSize, qrSize)
  ctx.textAlign = 'center'
  ctx.font = font(22, 700)
  ctx.fillStyle = isLightPoster ? '#203b3a' : '#8f3e5a'
  ctx.fillText('你是哪种类型？', cardCenterX, cardY + cardHeight + 38)
  ctx.textAlign = 'center'
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
    ctx.fillStyle = activePosterColors.parchmentDim
    // 昵称是用户输入，12 个全角字符也可能超出安全宽度
    const shown = truncateToWidth(data.nickname, POSTER_CONTENT_WIDTH - 80, (s) =>
      ctx.measureText(s).width,
    )
    ctx.fillText(`「${shown}」`, centerX, y)
    y += 62
  }

  ctx.font = font(76, 600)
  ctx.fillStyle = activePosterColors.parchment
  ctx.fillText(data.identityName, centerX, y + 56)
  y += 128

  ctx.font = font(38)
  ctx.fillStyle = activePosterColors.parchmentDim
  const prefix = '帽子的选择：'
  const prefixWidth = ctx.measureText(prefix).width
  ctx.font = font(44, 600)
  const nameWidth = ctx.measureText(data.deptName).width
  const startX = centerX - (prefixWidth + nameWidth) / 2

  ctx.textAlign = 'left'
  ctx.font = font(38)
  ctx.fillStyle = activePosterColors.parchmentDim
  ctx.fillText(prefix, startX, y)
  ctx.font = font(44, 600)
  ctx.fillStyle = accent
  ctx.fillText(data.deptName, startX + prefixWidth, y)

  ctx.textAlign = 'center'
  ctx.font = font(22, 400, FONT_DISPLAY)
  ctx.fillStyle = activePosterColors.parchmentDim
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
  ctx.fillStyle = activePosterColors.parchmentDim
  fillTrackedCenter(ctx, '你的五个倾向', centerX, top + 26, 5)

  const rects = traitBarRects(data.traitBars, box)
  // 并列的倾向一起高亮 —— docs/题库规范.md §4 要求文案承认并列
  const highlighted = new Set([data.dominantTraitName, ...data.tiedTraitNames])

  for (const rect of rects) {
    const isDominant = highlighted.has(rect.name)
    const color = isDominant ? accent : activePosterColors.parchmentDim

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = font(30, isDominant ? 600 : 400)
    ctx.fillStyle = isDominant ? activePosterColors.parchment : activePosterColors.parchmentDim
    ctx.globalAlpha = isDominant ? 1 : 0.8
    ctx.fillText(rect.name, rect.labelX, rect.centerY)

    const trackHeight = 14
    ctx.globalAlpha = 1
    ctx.fillStyle = activePosterColors.night600
    roundRect(ctx, rect.trackX, rect.centerY - trackHeight / 2, rect.trackWidth, trackHeight, 7)
    ctx.fill()

    ctx.globalAlpha = isDominant ? 1 : 0.45
    ctx.fillStyle = color
    roundRect(ctx, rect.trackX, rect.centerY - trackHeight / 2, rect.fillWidth, trackHeight, 7)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.textAlign = 'right'
    ctx.font = font(28, isDominant ? 600 : 400)
    ctx.fillStyle = isDominant ? activePosterColors.parchment : activePosterColors.parchmentDim
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
    ctx.fillStyle = activePosterColors.parchment
    ctx.fillText(chip.text, chip.x + chip.width / 2, chip.y + chip.height / 2 + 1)
  }
  ctx.textBaseline = 'alphabetic'
  if (chips.length > 0) y += chipHeight + 44

  const flavor = data.tagline ?? data.slogan
  ctx.font = font(30)
  const lines = wrapText(flavor, POSTER_CONTENT_WIDTH - 60, measure).slice(0, 2)
  ctx.fillStyle = activePosterColors.parchmentDim
  for (const line of lines) {
    ctx.fillText(line, centerX, y)
    y += 46
  }

  return y
}

/** 底部：招新群二维码与结果二维码，加页脚。
   页脚文字必须画在群卡矩形（POSTER_HEIGHT-300 起）的**上方**，
   否则同底会被实色卡盖住、看起来像挡字。 */
function drawFooter(ctx: CanvasRenderingContext2D, images: PosterImages): void {
  const centerX = POSTER_WIDTH / 2
  const blockTop = POSTER_HEIGHT - 300
  const footerY = blockTop - 30

  drawQrCard(ctx, images, blockTop)

  ctx.textAlign = 'center'
  ctx.font = font(24, 400, FONT_DISPLAY)
  ctx.fillStyle = activePosterColors.parchmentDim
  ctx.globalAlpha = 0.7
  fillTrackedCenter(ctx, 'YUNA · 2026 招新季', centerX, footerY, 6)
  ctx.globalAlpha = 1
}

/** 底部横向群信息卡片：左侧 logo，中间文字，右侧二维码。 */
function drawQrCard(ctx: CanvasRenderingContext2D, images: PosterImages, top: number): void {
  const cardX = 0
  const cardY = top

  // 卡片像从海报底部叠上来：顶部接缝圆润过渡，左右和底部严丝合缝。
  const topRadius = 32
  ctx.beginPath()
  ctx.moveTo(cardX, cardY + topRadius)
  ctx.quadraticCurveTo(cardX, cardY, cardX + topRadius, cardY)
  ctx.lineTo(POSTER_WIDTH - topRadius, cardY)
  ctx.quadraticCurveTo(POSTER_WIDTH, cardY, POSTER_WIDTH, cardY + topRadius)
  ctx.lineTo(POSTER_WIDTH, POSTER_HEIGHT - 32)
  ctx.lineTo(POSTER_WIDTH, POSTER_HEIGHT)
  ctx.lineTo(0, POSTER_HEIGHT)
  ctx.lineTo(0, POSTER_HEIGHT - 32)
  ctx.closePath()
  ctx.fillStyle = activePosterColors === POSTER_LIGHT_COLORS ? '#1d2928' : '#f7f1df'
  ctx.globalAlpha = 1
  ctx.fill()

  const cardColor = activePosterColors === POSTER_LIGHT_COLORS
  const textColor = cardColor ? '#f4ead5' : '#17120a'
  const dimColor = cardColor ? '#b8c3bd' : '#6e6658'
  const logoSize = 142
  const logoX = 62
  const logoY = cardY + 79
  if (images.logo !== null) ctx.drawImage(images.logo, logoX, logoY, logoSize, logoSize)

  const textX = 252
  ctx.textAlign = 'left'
  ctx.font = font(28, 700)
  ctx.fillStyle = textColor
  ctx.fillText('燕山大学大学生网络信息协会交流群', textX, cardY + 118)
  ctx.font = font(25)
  ctx.fillStyle = dimColor
  ctx.fillText('招新群号：978801324', textX, cardY + 158)
  ctx.fillText('学习 · 实践 · 分享', textX, cardY + 198)

  const qrSize = 174
  const qrX = POSTER_WIDTH - POSTER_PAD_X - qrSize - 40
  const qrY = cardY + 63
  if (images.groupQr !== null) {
    ctx.drawImage(images.groupQr, qrX, qrY, qrSize, qrSize)
  }

  ctx.textAlign = 'center'
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
  theme: PosterTheme = 'dark',
): void {
  canvas.width = POSTER_WIDTH
  canvas.height = POSTER_HEIGHT

  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('无法获取 canvas 2d 上下文')

  activePosterColors = theme === 'light' ? POSTER_LIGHT_COLORS : POSTER_DARK_COLORS
  const accent = activePosterColors.dept[data.deptId]

  drawBackdrop(ctx)
  const afterMast = drawMasthead(ctx, data)
  const afterArt = drawArtwork(ctx, images, accent, afterMast + 18)
  const afterVerdict = drawVerdict(ctx, data, accent, afterArt + 30)
  const afterTraits = drawTraitBars(ctx, data, accent, afterVerdict + 18)
  drawFlavor(ctx, data, accent, afterTraits - 18)
  drawFooter(ctx, images)
}
