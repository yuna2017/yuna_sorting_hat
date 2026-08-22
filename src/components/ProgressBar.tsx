interface ProgressBarProps {
  current: number
  total: number
}

/** 答题进度。移动端 sticky 常驻，滚动时也看得见自己走到哪。 */
export function ProgressBar({ current, total }: ProgressBarProps) {
  const ratio = total === 0 ? 0 : current / total

  return (
    <div className="flex items-center gap-3">
      <span className="font-display shrink-0 text-xs tracking-[0.18em] text-gold/80">
        {String(current).padStart(2, '0')} / {total}
      </span>
      <div
        className="h-[3px] flex-1 overflow-hidden rounded-full bg-night-600"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="答题进度"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold-soft transition-[width] duration-500 ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
