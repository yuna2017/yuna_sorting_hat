import { useCallback, useEffect, useRef, useState } from 'react'
import { POSTER_NICKNAME_MAX, buildPosterData } from '../lib/poster'
import { loadPosterImages } from '../lib/posterImages'
import { renderPoster, type PosterTheme } from '../lib/posterRender'
import { POSTER_HEIGHT, POSTER_WIDTH } from '../lib/posterLayout'
import type { QuestionBank } from '../data/questions'
import type { AnswerMap, Verdict } from '../lib/scoring'
import { CAMPAIGN } from '../data/campaign'

interface SharePosterPanelProps {
  bank: QuestionBank
  drawSeed: number
  verdict: Verdict
  answers: AnswerMap
  /** 封面页填的昵称。面板内也能改，改完只影响这张图。 */
  nickname: string
  onNicknameChange: (value: string) => void
}

type RenderState = 'rendering' | 'ready' | 'failed'

function readPosterTheme(): PosterTheme {
  if (document.documentElement.dataset.theme === 'light') return 'light'
  if (document.documentElement.dataset.theme === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function SharePosterPanel({
  bank,
  drawSeed,
  verdict,
  answers,
  nickname,
  onNicknameChange,
}: SharePosterPanelProps) {
  const [state, setState] = useState<RenderState>('rendering')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const [draftNickname, setDraftNickname] = useState(nickname)
  const [posterTheme, setPosterTheme] = useState<PosterTheme>(readPosterTheme)

  useEffect(() => {
    const root = document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)')
    const update = () => setPosterTheme(readPosterTheme())
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    systemTheme.addEventListener('change', update)
    return () => {
      observer.disconnect()
      systemTheme.removeEventListener('change', update)
    }
  }, [])

  /* 昵称边打字边重绘会让 1080×1920 的 canvas 抖，这里等输入停下来再画。
     同时把值提交给上层，供「再测一次」后沿用。 */
  useEffect(() => {
    const timer = window.setTimeout(() => onNicknameChange(draftNickname), 400)
    return () => window.clearTimeout(timer)
  }, [draftNickname, onNicknameChange])

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      setState('rendering')
      try {
        const data = buildPosterData(bank, drawSeed, verdict, answers, draftNickname)
        const images = await loadPosterImages(data.deptId, posterTheme)
        if (cancelled) return

        const canvas = document.createElement('canvas')
        renderPoster(canvas, data, images, posterTheme)

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png')
        })
        if (cancelled) return
        if (blob === null) throw new Error('canvas.toBlob 返回空')

        blobRef.current = blob
        objectUrl = URL.createObjectURL(blob)
        setImageUrl(objectUrl)
        setState('ready')
      } catch {
        if (!cancelled) setState('failed')
      }
    }

    void run()

    return () => {
      cancelled = true
      // 不回收会随每次重绘泄漏一整张 1080×1920 PNG
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
  }, [bank, drawSeed, verdict, answers, draftNickname, posterTheme])

  const fileName = `yuna-分部帽-${verdict.winner}.png`

  const handleSystemShare = useCallback(async () => {
    const blob = blobRef.current
    if (blob === null) return
    const file = new File([blob], fileName, { type: 'image/png' })
    try {
      await navigator.share({ files: [file], title: 'YUNA 分部帽' })
    } catch {
      // 取消分享不是错误，保持安静
    }
  }, [fileName])

  const canShareFile =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    typeof File === 'function' &&
    navigator.canShare({ files: [new File([], 'probe.png', { type: 'image/png' })] })

  return (
    <>
      <p className="text-[0.8rem] leading-relaxed text-parchment-dim/75">
        合成一张竖版海报，可以保存到相册或转发。图片只显示结论，不包含你的答案。
      </p>

      <div className="mt-3">
        <label
          htmlFor="poster-nickname"
          className="text-[0.75rem] leading-relaxed text-parchment-dim/80"
        >
          海报上的名字（可留空）
        </label>
        <input
          id="poster-nickname"
          value={draftNickname}
          maxLength={POSTER_NICKNAME_MAX}
          onChange={(e) => setDraftNickname(e.target.value)}
          placeholder="不填就不显示这一行"
          className="mt-1.5 w-full min-w-0 rounded-lg border border-night-500/70 bg-night-900/70 px-3 py-2 text-[0.85rem] text-parchment/90 placeholder:text-parchment-dim/45"
        />
      </div>

      <div className="mt-4">
        {state === 'failed' ? (
          <p className="rounded-lg border border-night-500/70 bg-night-900/50 px-3 py-4 text-center text-[0.8rem] leading-relaxed text-parchment-dim">
            这个浏览器没能生成图片，请切回「网页模式」复制链接分享。
          </p>
        ) : (
          <div
            /* 占位比例与海报一致，避免图片就绪时整页跳动 */
            className="relative mx-auto w-full max-w-[19rem] overflow-hidden rounded-xl border border-night-600/70 bg-night-900/60"
            style={{ aspectRatio: `${POSTER_WIDTH} / ${POSTER_HEIGHT}` }}
          >
            {imageUrl !== null && (
              <img
                src={imageUrl}
                alt={`分部帽结果海报：${verdict.winner}`}
                width={POSTER_WIDTH}
                height={POSTER_HEIGHT}
                data-poster-preview={state}
                className="h-full w-full object-contain"
              />
            )}
            {state === 'rendering' && (
              <p className="absolute inset-0 flex items-center justify-center text-[0.8rem] text-parchment-dim">
                正在生成海报…
              </p>
            )}
          </div>
        )}
      </div>

      {state === 'ready' && imageUrl !== null && (
        <>
          <div className="mt-4 flex flex-col gap-2">
            {canShareFile && (
              <button
                type="button"
                onClick={handleSystemShare}
                className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-gold/45 px-4 text-sm tracking-[0.08em] text-gold-soft/95 transition-colors hover:border-gold hover:bg-gold/10 active:scale-[0.99]"
              >
                分享图片…
              </button>
            )}

            <a
              href={imageUrl}
              download={fileName}
              className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-night-500/70 px-4 text-sm text-parchment/90 transition-colors hover:border-gold/60 hover:text-gold-soft"
            >
              保存图片
            </a>
          </div>

          <p className="mt-3 text-center text-[0.72rem] leading-relaxed text-parchment-dim/70">
            微信或 iOS 里若无法直接保存，长按上方图片选择「保存图片」。
          </p>
        </>
      )}

      {CAMPAIGN.posterOrigin === null && (
        <p className="mt-3 rounded-lg border border-night-500/60 bg-night-900/40 px-3 py-2 text-[0.72rem] leading-relaxed text-parchment-dim/75">
          开发预览：公开地址尚未确定（campaign.posterOrigin 为 null），海报暂不含二维码。
        </p>
      )}
    </>
  )
}
