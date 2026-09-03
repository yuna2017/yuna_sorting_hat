import { useCallback, useEffect, useRef, useState } from 'react'

interface ShareWebPanelProps {
  /** 可复现结果的完整链接。 */
  url: string
  /** 复制用的完整文案（含链接，链接单独一行）。 */
  text: string
  /** 系统分享用的正文，**不含链接** —— 链接走 navigator.share 的 url 字段。 */
  message: string
}

type CopyState = 'idle' | 'copied-url' | 'copied-text' | 'manual'

/** 「已复制」提示停留多久。 */
const COPIED_HINT_MS = 2200

/**
 * 网页模式分享。
 *
 * 三条路径，不是二选一：
 *   · 复制链接 —— 主路径，所有浏览器都要能用；
 *   · 复制分享文案 —— 带一句话介绍的完整文案，直接粘进聊天框；
 *   · 系统分享 —— 仅在支持 navigator.share 时出现。
 *
 * 手机 QQ / 微信内置浏览器不实现 Web Share API，此前「分享到…」是唯一的
 * 转发入口且被条件隐藏，用户在这些环境里会看到分享区少了按钮。所以复制类入口
 * 必须常驻，系统分享只能是锦上添花。
 *
 * 复制失败必须有出口。Clipboard API 在非安全上下文（http 局域网预览）、
 * 部分内置浏览器里会直接抛错或静默失败，此时降级成一个只读输入框把链接摊开，
 * 让用户长按全选自己复制 —— 而不是只在控制台报错、界面毫无反应。
 */
export function ShareWebPanel({ url, text, message }: ShareWebPanelProps) {
  const [state, setState] = useState<CopyState>('idle')
  const manualRef = useRef<HTMLInputElement | null>(null)
  const hintTimer = useRef<number | undefined>(undefined)

  // 链接变了（重测后再次进入结果）就把提示状态清掉
  useEffect(() => {
    setState('idle')
  }, [url])

  useEffect(
    () => () => {
      if (hintTimer.current !== undefined) window.clearTimeout(hintTimer.current)
    },
    [],
  )

  // 降级出现后立刻把链接选中，省掉一次「长按 → 全选」
  useEffect(() => {
    if (state === 'manual') manualRef.current?.select()
  }, [state])

  const copy = useCallback(async (value: string, ok: CopyState) => {
    if (hintTimer.current !== undefined) window.clearTimeout(hintTimer.current)
    try {
      // navigator.clipboard 在非安全上下文里可能整体不存在，不能只 try writeText
      if (navigator.clipboard?.writeText === undefined) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setState(ok)
      hintTimer.current = window.setTimeout(() => setState('idle'), COPIED_HINT_MS)
    } catch {
      setState('manual')
    }
  }, [])

  const handleCopyUrl = useCallback(() => copy(url, 'copied-url'), [copy, url])
  const handleCopyText = useCallback(() => copy(text, 'copied-text'), [copy, text])

  const handleSystemShare = useCallback(async () => {
    try {
      // text 不含链接：接收方会把 text 和 url 拼成一条消息，两处都放会出现两个链接
      await navigator.share({ title: 'YUNA 分部帽', text: message, url })
    } catch {
      // 用户主动取消也会抛 AbortError —— 分享面板是系统 UI，取消不是错误，
      // 这里不提示、不降级，保持安静。
    }
  }, [message, url])

  const canSystemShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <>
      <p className="text-[0.8rem] leading-relaxed text-parchment-dim/75">
        链接里只带你每道题的选择，别人打开后会看到和你一样的结果。
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-gold/45 px-4 text-sm tracking-[0.08em] text-gold-soft/95 transition-colors hover:border-gold hover:bg-gold/10 active:scale-[0.99]"
        >
          {state === 'copied-url' ? '已复制链接 ✓' : '复制结果链接'}
        </button>

        <button
          type="button"
          onClick={handleCopyText}
          className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-night-500/70 px-4 text-sm text-parchment/90 transition-colors hover:border-gold/60 hover:text-gold-soft"
        >
          {state === 'copied-text' ? '已复制文案 ✓' : '复制分享文案'}
        </button>

        {canSystemShare && (
          <button
            type="button"
            onClick={handleSystemShare}
            className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-night-500/70 px-4 text-sm text-parchment/90 transition-colors hover:border-gold/60 hover:text-gold-soft"
          >
            分享到…
          </button>
        )}
      </div>

      {state === 'manual' && (
        <div className="mt-3">
          <label
            htmlFor="share-url-fallback"
            className="text-[0.75rem] leading-relaxed text-parchment-dim/80"
          >
            这个浏览器不允许自动复制，请长按下面的链接手动复制：
          </label>
          <input
            id="share-url-fallback"
            ref={manualRef}
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            /* w-full + min-w-0：窄屏下长 URL 会把 flex/grid 容器顶宽，
               输入框必须允许被压缩，否则 320px 出现横向滚动条 */
            className="mt-1.5 w-full min-w-0 rounded-lg border border-night-500/70 bg-night-900/70 px-3 py-2 text-[0.78rem] text-parchment/90"
          />
        </div>
      )}
    </>
  )
}
