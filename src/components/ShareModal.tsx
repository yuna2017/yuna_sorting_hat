import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import QrCreator from 'qr-creator'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 分享弹窗外壳。
 * 打开时锁定背景滚动并接管焦点，Esc / 遮罩点击 / 关闭按钮三路退出，
 * 关闭后把焦点还给触发它的元素（键盘用户不用重新找起点）。
 * aria-modal 只是给读屏器的声明，Tab 仍会跑到背景内容里，所以焦点循环必须自己做。
 * 面板贴近视口顶部对齐，由外层容器负责滚动（面板自身不滚）。
 */
export function ShareModal({ open, onClose, title, children }: ShareModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const lastFocusedRef = useRef<Element | null>(null)
  const projectQrRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!open || projectQrRef.current === null) return
    const projectUrl = `${window.location.origin}${window.location.pathname}`
    QrCreator.render(
      {
        text: projectUrl,
        ecLevel: 'H',
        fill: '#241e14',
        background: '#efe3c8',
        radius: 0.12,
        size: 96,
      },
      projectQrRef.current,
    )
  }, [open])

  useEffect(() => {
    if (!open) return
    lastFocusedRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (panel === null) return
      // 每次按键重新查询：图片模式的按钮是异步出现的，缓存下来会漏掉
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      )
      const first = items[0]
      const last = items[items.length - 1]
      if (first === undefined || last === undefined) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)

    // 面板挂载后再聚焦，确保关闭按钮已就位
    const raf = requestAnimationFrame(() => closeRef.current?.focus())

    return () => {
      window.removeEventListener('keydown', handleKey)
      cancelAnimationFrame(raf)
      document.body.style.overflow = previousOverflow
      if (lastFocusedRef.current instanceof HTMLElement) lastFocusedRef.current.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      // 面板贴近视口顶部而不是居中：弹窗里是海报预览等高内容，
      // 居中时下半屏被面板占满，顶部对齐能留出更多纵向阅读空间。
      className="fixed inset-0 z-50 box-border flex items-start justify-center overflow-x-hidden overflow-y-auto px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      {/* 遮罩与面板是兄弟节点：点击遮罩关闭，点击面板不冒泡误关。
          遮罩必须 fixed：外层容器可滚动，absolute inset-0 会跟着内容滚走，
          内容一高遮罩就消失，变成「只有半屏有遮罩」的破弹窗。 */}
      <div
        className="share-modal-overlay fixed inset-0 bg-night-900/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="share-modal-panel relative box-border max-h-[calc(100dvh-2rem)] min-h-0 w-full min-w-0 max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl border border-night-500/60 bg-night-800 p-5 shadow-2xl sm:max-h-[calc(100dvh-5rem)]"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h2 id="share-modal-title" className="min-w-0 text-sm tracking-[0.16em] text-parchment-dim">
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="关闭分享窗口"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-night-500/70 text-parchment-dim transition-colors hover:border-gold/60 hover:text-gold-soft"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          <div
            className="share-project-card flex w-[7.25rem] shrink-0 items-center gap-1.5 rounded-lg border border-gold/35 bg-parchment/95 p-2 text-ink shadow-lg"
            aria-label="扫码回到项目"
          >
            <canvas ref={projectQrRef} width="80" height="80" aria-label="扫码回到项目" />
            <span className="w-4 shrink-0 [writing-mode:vertical-rl] text-center text-[0.68rem] leading-tight tracking-[0.08em]">
              你是哪种类型？
            </span>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
