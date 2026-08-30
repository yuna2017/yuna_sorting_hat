import { SortingHat } from '../components/SortingHat'
import { CAMPAIGN } from '../data/campaign'
import { drawSize } from '../lib/drawQuestions'

interface CoverScreenProps {
  onStart: () => void
}

export function CoverScreen({ onStart }: CoverScreenProps) {
  return (
    <div className="screen-enter starfield flex min-h-dvh flex-col items-center justify-between px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
        <SortingHat state="hero" className="w-36 sm:w-44" />

        <div className="flex flex-col items-center gap-2">
          {/* 层级：社团名是语境（小、弱），「分部帽」才是标题（大、亮）。
              比挤在一行再靠「·」断开更稳，也不会出现孤零零的分隔点。 */}
          <p className="text-[0.82rem] tracking-[0.12em] text-parchment-dim sm:text-sm">
            燕山大学网络与信息协会
          </p>

          <h1 className="font-display text-[2.6rem] leading-none font-semibold text-parchment sm:text-5xl">
            分部帽
          </h1>

          <div className="rule-gold mt-2 w-32" />

          <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold-soft/85 sm:text-sm">
            YUNA SORTING HAT
          </p>
        </div>

        <p className="max-w-xs text-sm leading-relaxed text-parchment-dim">
          {/* 报的是**抽题数**，不是题池总量 —— 池子里有几十道题，但用户只会答其中 12 道。
              写死「十个问题」的那版在题库换成 12 题后就开始骗人了。 */}
          {drawSize()} 个问题，没有对错。
          <br />
          回答完，帽子会告诉你该去哪。
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-2 min-h-[3rem] rounded-full border border-gold/70 bg-gold/10 px-9 text-[0.95rem] tracking-[0.2em] text-gold-soft transition-all duration-300 hover:border-gold hover:bg-gold/20 hover:shadow-[0_0_26px_-6px_rgba(212,175,55,0.6)] active:scale-[0.98]"
        >
          戴上帽子
        </button>
      </div>

      <p className="font-display text-[0.62rem] tracking-[0.3em] text-parchment-dim/55">
        YUNA 社团 · {CAMPAIGN.label}
      </p>
    </div>
  )
}
