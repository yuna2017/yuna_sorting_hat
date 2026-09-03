import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ShareModal } from './ShareModal'
import { ShareWebPanel } from './ShareWebPanel'
import { SharePosterPanel } from './SharePosterPanel'
import { CAMPAIGN } from '../data/campaign'
import type { QuestionBank } from '../data/questions'
import type { AnswerMap, Verdict } from '../lib/scoring'

interface ShareBarProps {
  /** 可复现结果的完整链接（运行时 origin，本地调试也能用）。 */
  url: string
  /** 复制用的完整文案（含链接）。 */
  text: string
  /** 系统分享用的正文，不含链接。 */
  message: string
  bank: QuestionBank
  drawSeed: number
  verdict: Verdict
  answers: AnswerMap
  nickname: string
  onNicknameChange: (value: string) => void
}

type ShareMode = 'web' | 'image'

const MODES: { id: ShareMode; label: string }[] = [
  { id: 'web', label: '网页模式' },
  { id: 'image', label: '图片模式' },
]

/**
 * 「每次打开网页只自动弹一次」的门槛值：
 * 触发按钮的顶部距视口顶部小于 1/3 视口高（即按钮位于画面上方约 1/3 处）时自动打开。
 * 用 1/3 而不是 1/2：按钮到位时下方还留着大半屏内容，用户不会觉得刚看到就被打断。
 */
const AUTO_OPEN_RATIO = 1 / 3

/**
 * 结果分享。两种模式并列，不是二选一的替代关系：
 *   · 网页模式 —— 可复现链接，别人打开能反复查看这份结果；
 *   · 图片模式 —— 合成竖版海报，适合存相册与转发。
 *
 * 图片模式的二维码带 ?v=&s=&a=，升题库版本会让已发出的海报二维码失效，
 * 所以 posterOrigin 未确定时生产环境不暴露这个入口（见 campaign.ts）。
 */
export function ShareBar({
  url,
  text,
  message,
  bank,
  drawSeed,
  verdict,
  answers,
  nickname,
  onNicknameChange,
}: ShareBarProps) {
  const [open, setOpen] = useState(false)
  // 默认图片模式：海报是最直接的传播形态，链接模式留给想复现结果的人
  const [mode, setMode] = useState<ShareMode>('image')
  const tabRefs = useRef<Partial<Record<ShareMode, HTMLButtonElement | null>>>({})
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // 自动打开只允许一次：用户手动关掉后绝不再骚扰，这是「每次打开网页只使用一次」的语义
  const autoOpenedRef = useRef(false)

  const posterEnabled = CAMPAIGN.posterOrigin !== null || import.meta.env.DEV
  const modes = posterEnabled ? MODES : MODES.filter((m) => m.id === 'web')

  /* 滚动监听：按钮滚到画面约 1/3 处自动打开分享弹窗，每次页面加载只发生一次。
     - passive + rAF 节流：滚动回调每帧最多跑一次，不跟滚动抢主线程；
     - disconnect 后不再恢复：手动关闭过的用户不该被二次弹出；
     - StrictMode 双挂载下 effect 会跑两遍，autoOpenedRef 跨挂载存活，
       第二遍挂载时若已触发过就直接不装监听，避免开发期弹两次。 */
  useEffect(() => {
    if (autoOpenedRef.current) return
    let raf = 0
    const onScroll = () => {
      if (raf !== 0) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (autoOpenedRef.current) return
        const el = triggerRef.current
        if (el === null) return
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * AUTO_OPEN_RATIO) {
          autoOpenedRef.current = true
          setOpen(true)
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // 挂载时先量一次：短内容或锚点直达时可能根本不产生 scroll 事件
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf !== 0) cancelAnimationFrame(raf)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const current = modes.findIndex((m) => m.id === mode)
      const delta = e.key === 'ArrowRight' ? 1 : -1
      const next = modes[(current + delta + modes.length) % modes.length]
      if (next === undefined) return
      setMode(next.id)
      tabRefs.current[next.id]?.focus()
    },
    [mode, modes],
  )

  return (
    <>
      <section className="mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/40 p-5">
        <h2 className="text-sm tracking-[0.16em] text-parchment-dim">分享你的结果</h2>
        <p className="mt-2 text-[0.8rem] leading-relaxed text-parchment-dim/75">
          让朋友也来看看分部帽怎么认识你。
        </p>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 min-h-[2.75rem] w-full rounded-lg border border-gold/45 px-4 text-sm tracking-[0.08em] text-gold-soft/95 transition-colors hover:border-gold hover:bg-gold/10 active:scale-[0.99]"
        >
          打开分享窗口
        </button>
      </section>

      <ShareModal open={open} onClose={() => setOpen(false)} title="分享你的结果">
        {modes.length > 1 && (
          <div
            role="tablist"
            aria-label="分享方式"
            className="flex gap-1 rounded-lg border border-night-600/70 bg-night-900/50 p-1"
          >
            {modes.map((m) => {
              const active = m.id === mode
              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    tabRefs.current[m.id] = el
                  }}
                  type="button"
                  role="tab"
                  id={`share-tab-${m.id}`}
                  aria-selected={active}
                  aria-controls={`share-panel-${m.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setMode(m.id)}
                  onKeyDown={handleKeyDown}
                  className={`flex-1 rounded-md px-3 py-2 text-[0.82rem] transition-colors ${
                    active ? 'bg-gold/15 text-gold-soft' : 'text-parchment-dim hover:text-parchment/90'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        )}

        <div
          role="tabpanel"
          id={`share-panel-${mode}`}
          aria-labelledby={modes.length > 1 ? `share-tab-${mode}` : undefined}
          className="mt-4"
        >
          {mode === 'web' ? (
            <ShareWebPanel url={url} text={text} message={message} />
          ) : (
            <SharePosterPanel
              bank={bank}
              drawSeed={drawSeed}
              verdict={verdict}
              answers={answers}
              nickname={nickname}
              onNicknameChange={onNicknameChange}
            />
          )}
        </div>
      </ShareModal>
    </>
  )
}
