import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
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
  { id: 'image', label: '图片模式' },
  { id: 'web', label: '网页模式' },
]

/**
 * 分享区默认展示图片模式，让用户先看到完成度最高的海报。
 * 网页模式保留为同一张卡片内的切换项，不再用弹窗和自动弹出打断结果阅读。
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
  const [mode, setMode] = useState<ShareMode>('image')
  const tabRefs = useRef<Partial<Record<ShareMode, HTMLButtonElement | null>>>({})

  const posterEnabled = CAMPAIGN.posterOrigin !== null || import.meta.env.DEV
  const modes = posterEnabled ? MODES : MODES.filter((m) => m.id === 'web')

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
    <section className="share-bar result-section mt-6 w-full rounded-2xl border border-night-600/70 bg-night-800/45 p-5 sm:p-6" aria-labelledby="share-bar-title">
      <h2 id="share-bar-title" className="text-sm tracking-[0.16em] text-parchment-dim">
        分享你的结果
      </h2>
      <p className="mt-2 text-[0.8rem] leading-relaxed text-parchment-dim/75">
        先保存这张海报，也可以复制链接，让朋友看到和你一样的分院结果。
      </p>

      {modes.length > 1 && (
        <div
          role="tablist"
          aria-label="分享方式"
          className="mt-4 flex gap-1 rounded-lg border border-night-600/70 bg-night-900/50 p-1"
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
    </section>
  )
}
