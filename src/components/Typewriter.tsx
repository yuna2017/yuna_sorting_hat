import { useTypewriter } from '../hooks/useTypewriter'

interface TypewriterProps {
  text: string
  speed?: number
  enabled?: boolean
  startDelay?: number
  className?: string
  /** 打完后回调（用于自动进入下一步）。 */
  onDone?: () => void
  /** 打字中显示光标。 */
  caret?: boolean
}

/**
 * 打字机文本。
 *
 * 无障碍处理：动画节点 aria-hidden，另挂一份完整文本给读屏，
 * 否则逐字过程会被念成一串乱码。
 */
export function Typewriter({
  text,
  speed,
  enabled,
  startDelay,
  className = '',
  caret = true,
}: TypewriterProps) {
  const { shown, done } = useTypewriter(text, {
    ...(speed !== undefined ? { speed } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(startDelay !== undefined ? { startDelay } : {}),
  })

  return (
    <>
      <span
        aria-hidden="true"
        className={`${className} ${caret && !done ? 'caret' : ''}`}
        style={{ whiteSpace: 'pre-line' }}
      >
        {shown}
      </span>
      <span className="sr-only">{text}</span>
    </>
  )
}
